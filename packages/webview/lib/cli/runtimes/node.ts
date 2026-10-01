import { copyFileSync, constants, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { bundleNodeApplication, createSeaAssets, describeAddonAsset } from '../bundler/esbuild';
import { CliError } from '../errors';
import { removeLegacyNodeSignature, signLegacyNodeExecutable } from '../signing';
import { executableOutputPath } from '../paths';
import { formatCommand } from '../process';
import type { BuildContext, BuildResult, RuntimeInfo } from '../types';
import type { RuntimeBuilder, RuntimeProbeContext } from './runtime';

const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

export class NodeRuntimeBuilder implements RuntimeBuilder {
  readonly name = 'node' as const;

  async probe(context: RuntimeProbeContext): Promise<RuntimeInfo> {
    const versionResult = await context.runner.run(context.runtimeExecutable, ['--version'], { capture: true });
    const helpResult = await context.runner.run(context.runtimeExecutable, ['--help'], { capture: true });
    const version = versionResult.stdout.trim() || versionResult.stderr.trim();
    const major = Number(/^v?(\d+)/u.exec(version)?.[1]);
    if (!Number.isFinite(major)) throw new CliError(`Could not determine Node.js version from "${version}".`);
    if (major < 24)
      throw new CliError(`Node.js 24 or newer is required for WebviewJS executable builds; found ${version}.`);
    return {
      executable: context.runtimeExecutable,
      version: version.startsWith('v') ? version.slice(1) : version,
      supportsBuildSea: /--build-sea\b/u.test(`${helpResult.stdout}\n${helpResult.stderr}`),
    };
  }

  async validate(context: RuntimeProbeContext, _info: RuntimeInfo): Promise<void> {
    if (context.options.target) {
      throw new CliError('Node SEA uses the current Node executable and does not support --target.');
    }
    if (context.options.minify !== undefined && typeof context.options.minify !== 'boolean') {
      throw new CliError('The Node minify setting must be boolean.');
    }
  }

  plan(context: RuntimeProbeContext, info: RuntimeInfo): string[] {
    const output = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const config = '<temporary>/sea-config.json';
    const bundle = '<temporary>/bundled-entry.cjs';
    const steps = [
      `bundle ${context.options.input} to ${bundle} with esbuild (bundle, platform=node, format=cjs, target=node24${context.options.minify ? ', minify' : ''})`,
      `add ${context.addonPath} to SEA assets as __webviewjs_native.node${context.options.assets.length ? ` and include ${context.options.assets.length} user asset(s)` : ''}`,
    ];
    if (info.supportsBuildSea) {
      steps.push(`run ${formatCommand(context.runtimeExecutable, ['--build-sea', config])} to write ${output}`);
      if (context.target.os === 'darwin') steps.push(`run ${formatCommand('codesign', ['--sign', '-', output])}`);
    } else {
      const blob = '<temporary>/sea-prep.blob';
      const postject = resolvePostjectCli(context.packageRoot);
      steps.push(
        `run ${formatCommand(context.runtimeExecutable, ['--experimental-sea-config', config])} to write ${blob}`,
      );
      steps.push(`copy ${context.runtimeExecutable} to ${output}`);
      if (context.target.os === 'darwin')
        steps.push(`run ${formatCommand('codesign', ['--remove-signature', output])}`);
      const injectArgs = [postject, output, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', SEA_FUSE];
      if (context.target.os === 'darwin') injectArgs.push('--macho-segment-name', 'NODE_SEA');
      steps.push(`run ${formatCommand(context.runtimeExecutable, injectArgs)}`);
      if (context.target.os === 'darwin') steps.push(`run ${formatCommand('codesign', ['--sign', '-', output])}`);
    }
    return steps;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const output = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const bundlePath = join(context.tempDir, 'bundled-entry.cjs');
    const bundle = await bundleNodeApplication({
      input: context.options.input,
      outfile: bundlePath,
      cwd: context.options.projectRoot,
      minify: context.options.minify,
      addonPath: context.addonPath,
      packageVersion: context.packageVersion,
    });
    const steps = ['bundled application', describeAddonAsset(context.target, context.addonPath)];
    const configOutput = context.runtime.supportsBuildSea ? output : join(context.tempDir, 'sea-prep.blob');
    const config = createSeaConfig(
      bundle.outfile,
      configOutput,
      createSeaAssets(context.options.assets, context.addonPath),
      context.seaOptions,
    );
    const configPath = join(context.tempDir, 'sea-config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    if (context.runtime.supportsBuildSea) {
      await context.runner.run(context.runtimeExecutable, ['--build-sea', configPath], {
        cwd: context.options.projectRoot,
      });
      steps.push('created Node SEA with --build-sea');
    } else {
      await context.runner.run(context.runtimeExecutable, ['--experimental-sea-config', configPath], {
        cwd: context.options.projectRoot,
      });
      mkdirSync(dirname(output), { recursive: true });
      copyFileSync(context.runtimeExecutable, output, constants.COPYFILE_FICLONE);
      await removeLegacyNodeSignature(output, context.target, context.runner, context.logger);
      const postject = resolvePostjectCli(context.packageRoot);
      const injectArgs = [postject, output, 'NODE_SEA_BLOB', configOutput, '--sentinel-fuse', SEA_FUSE];
      if (context.target.os === 'darwin') injectArgs.push('--macho-segment-name', 'NODE_SEA');
      await context.runner.run(context.runtimeExecutable, injectArgs, { cwd: context.options.projectRoot });
      steps.push('created Node SEA with the Node 24 Postject injection flow');
    }
    const signed = await signLegacyNodeExecutable(output, context.target, { signMac: true }, context.runner);
    if (signed) steps.push('signed executable with an ad-hoc macOS signature');
    return {
      output,
      runtime: 'node',
      runtimeVersion: context.runtime.version,
      target: context.target,
      steps,
    };
  }
}

export function createSeaConfig(
  main: string,
  output: string,
  assets: Record<string, string>,
  options: BuildContext['seaOptions'],
) {
  return {
    main,
    output,
    disableExperimentalSEAWarning: true,
    useSnapshot: options.useSnapshot,
    useCodeCache: options.useCodeCache,
    execArgv: [...options.execArgv],
    execArgvExtension: options.execArgvExtension,
    assets,
  };
}

export function resolvePostjectCli(packageRoot: string): string {
  const requireFromPackage = createRequire(join(packageRoot, 'package.json'));
  let packageJsonPath: string;
  try {
    packageJsonPath = requireFromPackage.resolve('postject/package.json');
  } catch (cause) {
    throw new CliError(
      'The pinned Postject runtime dependency is not installed. Reinstall @webviewjs/webview dependencies.',
      { cause },
    );
  }
  const packageJson = require(packageJsonPath) as { bin?: string | Record<string, string> };
  const binPath = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.postject;
  if (!binPath) throw new CliError('The installed Postject package does not declare its CLI entrypoint.');
  return join(dirname(packageJsonPath), binPath);
}
