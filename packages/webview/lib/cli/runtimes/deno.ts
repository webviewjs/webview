import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CliError } from '../errors';
import { formatTarget } from '../platform';
import { formatCommand } from '../process';
import { executableOutputPath } from '../paths';
import type { BuildContext, BuildResult, RuntimeInfo } from '../types';
import type { RuntimeBuilder, RuntimeProbeContext } from './runtime';

export class DenoRuntimeBuilder implements RuntimeBuilder {
  readonly name = 'deno' as const;

  async probe(context: RuntimeProbeContext): Promise<RuntimeInfo> {
    const versionResult = await context.runner.run(context.runtimeExecutable, ['--version'], { capture: true });
    const version = versionResult.stdout.trim().split(/\r?\n/u)[0] || versionResult.stderr.trim();
    if (!version) throw new CliError('Could not determine Deno version.');
    return { executable: context.runtimeExecutable, version };
  }

  async validate(_context: RuntimeProbeContext, info: RuntimeInfo): Promise<void> {
    const version = Number(/^deno\s+(\d+)/iu.exec(info.version)?.[1]);
    if (!Number.isFinite(version) || version < 2) {
      throw new CliError(`Deno 2 or newer is required for native-addon self-extracting builds; found ${info.version}.`);
    }
  }

  plan(context: RuntimeProbeContext, info: RuntimeInfo): string[] {
    const output = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const args = [
      'compile',
      '--bundle',
      '--self-extracting',
      '--allow-all',
      '--no-check',
      '--output',
      output,
      '--config',
      '<temporary>/deno.json',
    ];
    if (context.options.target) args.push('--target', context.options.target);
    if (context.options.minify) args.push('--minify');
    for (const asset of context.options.assets) args.push('--include', asset.path);
    args.push('--include', '<temporary>/webview.<target>.node');
    args.push('<temporary>/deno-entry.mjs');
    const steps = [
      `run ${formatCommand(info.executable, args)}`,
      `prepare a temporary ${formatTarget(context.target)} package adapter so Deno resolves only WebviewJS's selected native addon`,
      `compile a self-extracting executable with the ${formatTarget(context.target)} native addon`,
    ];
    if (context.options.assets.length) steps.push(`include ${context.options.assets.length} user asset(s)`);
    return steps;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const output = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const adapter = createDenoPackageAdapter(context);
    // Deno's current checker rejects three unresolved internal callback aliases in
    // NAPI-RS-generated js-bindings.d.ts. Keep CLI packaging usable for JS/Node projects;
    // applications can still run `deno check` against their own source separately.
    const args = [
      'compile',
      '--bundle',
      '--self-extracting',
      '--allow-all',
      '--no-check',
      '--output',
      output,
      '--config',
      adapter.configPath,
    ];
    if (context.options.target) args.push('--target', context.options.target);
    if (context.options.minify) args.push('--minify');
    for (const asset of context.options.assets) args.push('--include', asset.path);
    args.push('--include', adapter.addonPath);
    args.push(adapter.entryPath);
    await context.runner.run(context.runtimeExecutable, args, { cwd: context.options.projectRoot });
    return {
      output,
      runtime: 'deno',
      runtimeVersion: context.runtime.version,
      target: context.target,
      steps: [
        `compiled self-extracting Deno executable for ${formatTarget(context.target)}`,
        'bundled reachable application and WebviewJS native addon',
        `included ${context.options.assets.length} user asset(s)`,
      ],
    };
  }
}

export function createDenoPackageAdapter(context: BuildContext): {
  root: string;
  configPath: string;
  addonPath: string;
  entryPath: string;
} {
  const root = join(context.tempDir, 'deno-webview-adapter');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  cpSync(join(context.packageRoot, 'dist'), dist, { recursive: true });
  cpSync(join(context.packageRoot, 'js-bindings.js'), join(root, 'js-bindings.js'));
  cpSync(join(context.packageRoot, 'js-bindings.d.ts'), join(root, 'js-bindings.d.ts'));
  writeFileSync(
    join(root, 'webview.wasi.cjs'),
    'throw new Error("The WebviewJS WASI fallback is not part of this native executable build.");\n',
  );
  const addonHash = createHash('sha256').update(readFileSync(context.addonPath)).digest('hex');
  const addonAssetName = `__webviewjs_native_${addonHash}.node`;
  const addonPath = join(context.tempDir, addonAssetName);
  cpSync(context.addonPath, addonPath);
  const entryPath = join(context.tempDir, 'deno-entry.mjs');
  writeFileSync(entryPath, createDenoEntrySource(addonAssetName, pathToFileURL(context.options.input).href));

  const packageMetadata = JSON.parse(readFileSync(join(context.packageRoot, 'package.json'), 'utf8')) as {
    name?: string;
    version?: string;
  };
  const bindingSource = readFileSync(join(context.packageRoot, 'js-bindings.js'), 'utf8');
  const packageReferences = new Set<string>();
  for (const match of bindingSource.matchAll(/require\(['"](@webviewjs\/[^'"]+)['"]\)/gu)) {
    packageReferences.add(match[1].replace(/\/package\.json$/u, ''));
  }
  const nodeModulesRoot = join(root, 'node_modules');
  const namespace = join(nodeModulesRoot, '@webviewjs');
  mkdirSync(namespace, { recursive: true });
  const optionalDependencies: Record<string, string> = {};
  for (const packageName of packageReferences) {
    optionalDependencies[packageName] = '*';
    const name = packageName.slice('@webviewjs/'.length);
    const stub = join(namespace, name);
    mkdirSync(stub, { recursive: true });
    writeFileSync(
      join(stub, 'package.json'),
      JSON.stringify({
        name: packageName,
        version: packageName === nativeTargetPackage(context) ? packageMetadata.version : '0.0.0',
        main: 'index.js',
      }),
    );
    writeFileSync(
      join(stub, 'index.js'),
      'throw new Error("This WebviewJS native package is not selected for this target.");\n',
    );
  }

  const packageJson = {
    name: packageMetadata.name ?? '@webviewjs/webview',
    version: packageMetadata.version ?? '0.0.0',
    type: 'commonjs',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    optionalDependencies,
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(packageJson, null, 2));
  const configPath = join(context.tempDir, 'deno.json');
  writeFileSync(
    configPath,
    JSON.stringify({ imports: { '@webviewjs/webview': pathToFileURL(join(dist, 'index.js')).href } }, null, 2),
  );
  return { root, configPath, addonPath, entryPath };
}

export function createDenoEntrySource(addonAssetName: string, applicationUrl: string): string {
  return `import { basename, dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';

function findEmbeddedAddon(root, wantedName, depth = 16) {
  if (depth < 0) return undefined;
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return undefined; }
  for (const entry of entries) {
    if (entry.isFile() && entry.name === wantedName) return join(root, entry.name);
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = findEmbeddedAddon(join(root, entry.name), wantedName, depth - 1);
      if (found) return found;
    }
  }
  return undefined;
}

const executable = Deno.execPath();
const executableName = basename(executable).replace(/\\.exe$/iu, '');
const extractionParent = join(dirname(executable), '.' + executableName);
const addonPath = findEmbeddedAddon(extractionParent, ${JSON.stringify(addonAssetName)});
if (!addonPath) throw new Error('Could not locate the extracted WebviewJS native addon in Deno self-extraction data.');
process.env.NAPI_RS_NATIVE_LIBRARY_PATH = addonPath;
await import(${JSON.stringify(applicationUrl)});
`;
}

function nativeTargetPackage(context: BuildContext): string {
  if (context.target.os === 'darwin') return `@webviewjs/webview-darwin-${context.target.arch}`;
  if (context.target.os === 'win32') return `@webviewjs/webview-win32-${context.target.arch}-msvc`;
  if (context.target.arch === 'arm') return '@webviewjs/webview-linux-arm-gnueabihf';
  return `@webviewjs/webview-linux-${context.target.arch}-${context.target.libc ?? 'gnu'}`;
}
