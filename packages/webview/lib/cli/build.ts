import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BunRuntimeBuilder } from './runtimes/bun';
import { DenoRuntimeBuilder } from './runtimes/deno';
import { NodeRuntimeBuilder } from './runtimes/node';
import type { RuntimeBuilder, RuntimeProbeContext } from './runtimes/runtime';
import { normalizeAssets, SEA_NATIVE_ASSET_KEY, validateAssets } from './assets';
import { normalizeExecutableName, validateBuildInputs } from './args';
import { CliError, ProcessExecutionError } from './errors';
import { consoleLogger, printBuildPlan, printBuildResult } from './logger';
import { resolveNativeAddon } from './native-addon';
import { assertRuntimeTarget, findExecutable, getHostPlatform, parseRuntimeTarget } from './platform';
import { processRunner } from './process';
import { executableOutputPath } from './paths';
import type {
  BuildContext,
  BuildExecutableOptions,
  BuildLogger,
  BuildOptions,
  BuildResult,
  BuildServices,
  BuildAsset,
  NativeTarget,
  RuntimeName,
  SeaOptions,
} from './types';

const validRuntimes = new Set<RuntimeName>(['node', 'bun', 'deno']);
const builders: Record<RuntimeName, () => RuntimeBuilder> = {
  node: () => new NodeRuntimeBuilder(),
  bun: () => new BunRuntimeBuilder(),
  deno: () => new DenoRuntimeBuilder(),
};

const defaultSeaOptions: SeaOptions = {
  useSnapshot: false,
  useCodeCache: false,
  execArgv: [],
  execArgvExtension: 'env',
};

export function normalizeBuildOptions(
  raw: BuildExecutableOptions,
  services: Pick<BuildServices, 'platform'> = {},
): BuildOptions {
  const cwd = resolve(raw.cwd ?? process.cwd());
  const runtimeText = raw.runtime ?? 'node';
  if (!validRuntimes.has(runtimeText as RuntimeName)) {
    throw new CliError(`Unknown runtime "${runtimeText}". Choose node, bun, or deno.`);
  }
  const runtime = runtimeText as RuntimeName;
  if (raw.resources && runtime !== 'node') {
    throw new CliError('The resources JSON map is only supported by Node SEA; use assets for Bun or Deno.');
  }
  if (raw.outDir !== undefined && raw.output !== undefined) {
    throw new CliError('Use either outDir or the backwards-compatible output alias, not both.');
  }
  const inputArgument = raw.input ?? './index.js';
  const input = resolve(cwd, inputArgument);
  const outDir = resolve(cwd, raw.outDir ?? raw.output ?? './dist');
  parseRuntimeTarget(runtime, raw.target, services.platform ?? getHostPlatform());
  const stringAssets = (raw.assets ?? []).filter((asset): asset is string => typeof asset === 'string');
  const assets = normalizeAssets(stringAssets, raw.resources, cwd);
  for (const rawAsset of raw.assets ?? []) {
    if (typeof rawAsset === 'string') continue;
    addProgrammaticAsset(assets, rawAsset, cwd);
  }
  const name = normalizeExecutableName(raw.name, cwd, inputArgument);
  const nativeAddon = raw.nativeAddon ? resolve(cwd, raw.nativeAddon) : undefined;
  const options: BuildOptions = {
    runtime,
    input,
    outDir,
    name,
    target: raw.target,
    nativeAddon,
    minify: raw.minify ?? false,
    verbose: raw.verbose ?? false,
    assets,
    dryRun: raw.dryRun ?? false,
    projectRoot: cwd,
  };
  return options;
}

export async function buildExecutable(
  rawOptions: BuildExecutableOptions,
  services: BuildServices = {},
): Promise<BuildResult> {
  const options = normalizeBuildOptions(rawOptions, { platform: services.platform });
  validateBuildInputs(options);
  validateAssets(options.assets, options.runtime);
  const target = parseRuntimeTarget(options.runtime, options.target, services.platform ?? getHostPlatform());
  assertRuntimeTarget(options.runtime, target);
  const packageRoot = services.packageRoot ?? resolvePackageRoot();
  const addon = resolveNativeAddon(target, options.projectRoot, packageRoot, options.nativeAddon);
  const runtimeExecutable = await getRuntimeExecutable(options.runtime, services);
  const logger = services.logger ?? consoleLogger;
  const runner = withCommandLogging(services.runner ?? processRunner, logger, options.verbose);
  const builder = builders[options.runtime]();
  const probeContext: RuntimeProbeContext = {
    options,
    target,
    addonPath: addon.path,
    packageVersion: readPackageVersion(packageRoot),
    packageRoot,
    runtimeExecutable,
    seaOptions: { ...defaultSeaOptions, execArgv: [...defaultSeaOptions.execArgv] },
    runner,
    logger,
  };

  const runtime = await builder.probe(probeContext);
  await builder.validate(probeContext, runtime);
  const plannedSteps = builder.plan(probeContext, runtime);
  const output = getOutputPath(options, target);
  if (options.dryRun) {
    printBuildPlan(options.runtime, runtime.version, target, options.input, output, plannedSteps, logger);
    return {
      output,
      runtime: options.runtime,
      runtimeVersion: runtime.version,
      target,
      steps: plannedSteps,
      dryRun: true,
    };
  }

  try {
    mkdirSync(options.outDir, { recursive: true });
  } catch (cause) {
    throw new CliError(`Could not create output directory ${options.outDir}.`, { cause });
  }
  const tempDir = mkdtempSync(join(tmpdir(), 'webviewjs-build-'));
  const context: BuildContext = {
    ...probeContext,
    tempDir,
    runtime,
  };
  try {
    const result = await builder.build(context);
    printBuildResult(result, options.input, logger);
    return result;
  } catch (cause) {
    if (cause instanceof CliError || cause instanceof ProcessExecutionError) throw cause;
    throw new CliError(`The ${options.runtime} executable build failed.`, { cause });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function getOutputPath(options: Pick<BuildOptions, 'outDir' | 'name'>, target: NativeTarget): string {
  return executableOutputPath(options.outDir, options.name, target);
}

function addProgrammaticAsset(assets: BuildAsset[], asset: BuildAsset, cwd: string): void {
  if (asset.key === SEA_NATIVE_ASSET_KEY)
    throw new CliError(`Asset name "${SEA_NATIVE_ASSET_KEY}" is reserved by WebviewJS.`);
  if (!asset.key || assets.some((existing) => existing.key === asset.key)) {
    throw new CliError(`Asset name "${asset.key}" is empty or was provided more than once.`);
  }
  const path = resolve(cwd, asset.path);
  if (!existsSync(path)) throw new CliError(`Asset does not exist: ${path}`);
  assets.push({ key: asset.key, path });
}

async function getRuntimeExecutable(runtime: RuntimeName, services: BuildServices): Promise<string> {
  if (runtime === 'node') {
    const executable = services.nodeExecutable ?? process.execPath;
    try {
      accessSync(executable, constants.X_OK);
    } catch (cause) {
      throw new CliError(`Node.js executable is not accessible: ${executable}`, { cause });
    }
    return executable;
  }
  const configured = runtime === 'bun' ? services.bunExecutable : services.denoExecutable;
  if (configured) {
    try {
      accessSync(configured, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    } catch (cause) {
      throw new CliError(`${runtime} executable is not accessible: ${configured}`, { cause });
    }
    return configured;
  }
  const executable = await findExecutable(runtime);
  if (!executable)
    throw new CliError(`Could not find ${runtime} on PATH. Install ${runtime} or select another runtime.`);
  return executable;
}

function resolvePackageRoot(): string {
  // Dist/cli is two levels below the package root. The same result holds in a checkout.
  return resolve(__dirname, '../..');
}

function readPackageVersion(packageRoot: string): string {
  try {
    const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { version?: unknown };
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function withCommandLogging(runner: NonNullable<BuildServices['runner']>, logger: BuildLogger, verbose: boolean) {
  return {
    run(executable: string, args: readonly string[], options: Parameters<typeof runner.run>[2] = {}) {
      const original = options.onCommand;
      return runner.run(executable, args, {
        ...options,
        onCommand(command) {
          if (verbose) logger.info(`$ ${command}`);
          original?.(command);
        },
      });
    },
  };
}
