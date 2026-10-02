import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { normalizeAssets } from './assets';
import { CliError } from './errors';
import { getHostPlatform, parseRuntimeTarget, type PlatformInfo } from './platform';
import type { BuildOptions, RuntimeName } from './types';

export type ParsedCommand =
  | { kind: 'help'; scope: 'top' | 'build' }
  | { kind: 'version' }
  | { kind: 'build'; options: BuildOptions; deprecated: boolean };

const runtimeNames = new Set<RuntimeName>(['node', 'bun', 'deno']);

const buildArgOptions = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  runtime: { type: 'string', short: 'R' },
  input: { type: 'string', short: 'i' },
  name: { type: 'string', short: 'n' },
  'out-dir': { type: 'string' },
  output: { type: 'string', short: 'o' },
  target: { type: 'string' },
  'native-addon': { type: 'string' },
  minify: { type: 'boolean' },
  verbose: { type: 'boolean' },
  asset: { type: 'string', multiple: true },
  resources: { type: 'string', short: 'r' },
  'dry-run': { type: 'boolean', short: 'd' },
} as const;

export function parseCLIArguments(
  argv: readonly string[],
  cwd = process.cwd(),
  host: PlatformInfo = getHostPlatform(),
): ParsedCommand {
  const tokens = [...argv];
  if (tokens.length === 0) return { kind: 'help', scope: 'top' };
  if (tokens.includes('--version') || tokens.includes('-v')) return { kind: 'version' };

  let deprecated = false;
  if (tokens[0] === 'build') {
    tokens.shift();
  } else if (tokens.includes('--build') || tokens.includes('-b')) {
    deprecated = true;
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      if (tokens[index] === '--build' || tokens[index] === '-b') tokens.splice(index, 1);
    }
  } else if (tokens.includes('--help') || tokens.includes('-h')) {
    return { kind: 'help', scope: 'top' };
  } else {
    throw new CliError(`Unknown command "${tokens[0]}". Use "webview build <entry>" or "webview --help".`);
  }

  let parsed;
  try {
    parsed = parseArgs({ args: tokens, options: buildArgOptions, allowPositionals: true, strict: true });
  } catch (cause) {
    throw new CliError(cause instanceof Error ? cause.message : 'Invalid CLI arguments.', { cause });
  }
  if (parsed.values.help) return { kind: 'help', scope: 'build' };
  if (parsed.values.version) return { kind: 'version' };

  const positionalInput = parsed.positionals[0];
  if (parsed.positionals.length > 1) throw new CliError('Only one entry file may be provided.');
  if (positionalInput && parsed.values.input)
    throw new CliError('Provide the entry file either positionally or with --input, not both.');
  const inputArgument = positionalInput ?? parsed.values.input ?? './index.js';
  const input = resolve(cwd, inputArgument);

  const runtimeText = parsed.values.runtime ?? 'node';
  if (!runtimeNames.has(runtimeText as RuntimeName)) {
    throw new CliError(`Unknown runtime "${runtimeText}". Choose node, bun, or deno.`);
  }
  const runtime = runtimeText as RuntimeName;
  if (parsed.values.resources && runtime !== 'node') {
    throw new CliError('--resources is a Node SEA compatibility option; use --asset with Bun or Deno.');
  }

  const outDirArgument = parsed.values['out-dir'] ?? parsed.values.output ?? './dist';
  if (parsed.values['out-dir'] && parsed.values.output) {
    throw new CliError('Use either --out-dir or the backwards-compatible --output alias, not both.');
  }
  const outDir = resolve(cwd, outDirArgument);

  parseRuntimeTarget(runtime, parsed.values.target, host);
  const name = normalizeExecutableName(parsed.values.name, cwd, inputArgument);
  const nativeAddon = parsed.values['native-addon'] ? resolve(cwd, parsed.values['native-addon']) : undefined;
  const assets = normalizeAssets(parsed.values.asset ?? [], parsed.values.resources, cwd);

  return {
    kind: 'build',
    deprecated,
    options: {
      runtime,
      input,
      outDir,
      name,
      target: parsed.values.target,
      nativeAddon,
      minify: parsed.values.minify ?? false,
      verbose: parsed.values.verbose ?? false,
      assets,
      dryRun: parsed.values['dry-run'] ?? false,
      projectRoot: cwd,
    },
  };
}

export function normalizeExecutableName(explicit: string | undefined, cwd: string, input: string): string {
  if (explicit !== undefined) return validateExecutableName(explicit);
  const packageName = readPackageName(cwd);
  if (packageName) {
    const unscoped = packageName.startsWith('@') ? packageName.slice(packageName.indexOf('/') + 1) : packageName;
    if (isValidExecutableName(unscoped)) return unscoped;
  }
  const inputBase = basename(input, extname(input));
  return validateExecutableName(inputBase);
}

function readPackageName(cwd: string): string | undefined {
  const packageJson = resolve(cwd, 'package.json');
  if (!existsSync(packageJson)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(packageJson, 'utf8')) as { name?: unknown };
    return typeof parsed.name === 'string' ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

function validateExecutableName(name: string): string {
  if (!isValidExecutableName(name)) {
    throw new CliError(
      `Invalid executable name "${name}". Use letters, numbers, hyphens, underscores, or dots without path separators.`,
    );
  }
  return name;
}

function isValidExecutableName(name: string): boolean {
  if (!name || name === '.' || name === '..' || /[\\/:*?"<>|]/u.test(name) || /[. ]$/u.test(name)) return false;
  if ([...name].some((character) => character.charCodeAt(0) < 32)) return false;
  if (isAbsolute(name)) return false;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(name)) return false;
  return true;
}

export function validateBuildInputs(options: BuildOptions): void {
  if (!existsSync(options.input)) throw new CliError(`Entry file does not exist: ${options.input}`);
  if (!statSync(options.input).isFile()) throw new CliError(`Entry path is not a file: ${options.input}`);
  if (existsSync(options.outDir) && !statSync(options.outDir).isDirectory()) {
    throw new CliError(`Output path exists and is not a directory: ${options.outDir}`);
  }
  let writableParent = options.outDir;
  while (!existsSync(writableParent)) {
    const parent = resolve(writableParent, '..');
    if (parent === writableParent) break;
    writableParent = parent;
  }
  try {
    accessSync(writableParent, constants.W_OK);
  } catch (cause) {
    throw new CliError(`Output directory is not writable: ${writableParent}`, { cause });
  }
  if (options.nativeAddon) {
    if (!existsSync(options.nativeAddon)) throw new CliError(`Native addon does not exist: ${options.nativeAddon}`);
    if (!options.nativeAddon.endsWith('.node'))
      throw new CliError(`Native addon must be a .node file: ${options.nativeAddon}`);
  }
}
