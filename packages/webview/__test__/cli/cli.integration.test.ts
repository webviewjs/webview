import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { expect, test } from 'bun:test';
import {
  buildExecutable,
  getHostPlatform,
  nativeAddonFileName,
  nativePackageName,
  parseRuntimeTarget,
  resolveNativeAddon,
} from '../../dist/cli/index.js';

const packageRoot = join(import.meta.dirname, '..', '..');
const fixture = join(import.meta.dirname, 'fixtures/executable-version.mjs');
const hostTarget = parseRuntimeTarget('node', undefined, getHostPlatform());

function executableOnPath(command: string): string {
  const result = spawnSync(command, ['-p', 'process.execPath'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : command;
}

function runtimeAvailable(command) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

let addonPath: string | undefined;
try {
  addonPath = resolveNativeAddon(hostTarget, packageRoot, packageRoot).path;
} catch {
  addonPath = undefined;
}
// Reuse the preflight result; repeating the createRequire lookup after the
// fixture adds a symlinked consumer package can return a different result in Bun.
const addonAvailable = addonPath !== undefined;

async function runStandalone(runtime) {
  const directory = mkdtempSync(join(tmpdir(), 'webview-cli-integration-'));
  try {
    const projectRoot = join(directory, 'consumer project');
    const appNodeModules = join(projectRoot, 'node_modules/@webviewjs');
    const platformPackage = join(appNodeModules, nativePackageName(hostTarget).slice('@webviewjs/'.length));
    const typesDirectory = join(projectRoot, 'node_modules/@types');
    mkdirSync(join(projectRoot, 'src'), { recursive: true });
    mkdirSync(platformPackage, { recursive: true });
    mkdirSync(typesDirectory, { recursive: true });
    symlinkSync(packageRoot, join(appNodeModules, 'webview'), 'dir');
    symlinkSync(join(packageRoot, 'node_modules/@types/node'), join(typesDirectory, 'node'));
    if (!addonPath) throw new Error('The host native addon was not resolved for this integration test.');
    const addon = addonPath;
    symlinkSync(addon, join(platformPackage, nativeAddonFileName(hostTarget)));
    writeFileSync(
      join(platformPackage, 'package.json'),
      JSON.stringify({ name: nativePackageName(hostTarget), main: nativeAddonFileName(hostTarget) }),
    );
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify({
        name: 'webview-cli-integration',
        dependencies: { '@webviewjs/webview': '0.4.7', '@types/node': '26.1.1' },
      }),
    );
    const input = join(projectRoot, 'src/main.mjs');
    copyFileSync(fixture, input);
    const outputDirectory = join(directory, 'build output');
    mkdirSync(outputDirectory, { recursive: true });
    const result = await buildExecutable(
      { runtime, input, cwd: projectRoot, outDir: outputDirectory, name: `webview-${runtime}` },
      {
        packageRoot,
        nodeExecutable: runtime === 'node' ? executableOnPath('node') : undefined,
        logger: { info() {}, success() {}, warn() {}, error() {} },
      },
    );
    const isolatedDirectory = join(directory, 'isolated application');
    mkdirSync(isolatedDirectory);
    const isolatedExecutable = join(isolatedDirectory, basename(result.output));
    renameSync(result.output, isolatedExecutable);
    rmSync(join(projectRoot, 'node_modules'), { recursive: true, force: true });
    expect(existsSync(isolatedExecutable)).toBeTruthy();
    const executed = spawnSync(isolatedExecutable, [], {
      cwd: isolatedDirectory,
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: '' },
      timeout: 120_000,
    });
    expect(executed.status).toBe(0);
    expect(executed.stdout.trim()).toMatch(/\d+\.\d+\.\d+/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test.skipIf(!addonAvailable)(
  'Node SEA embeds and loads WebviewJS without project node_modules',
  async () => {
    await runStandalone('node');
  },
  60_000,
);

test.skipIf(!addonAvailable || !runtimeAvailable('bun'))(
  'Bun standalone embeds and loads WebviewJS N-API addon when Bun is installed',
  async () => {
    await runStandalone('bun');
  },
  60_000,
);

test.skipIf(!addonAvailable || !runtimeAvailable('deno'))(
  'Deno self-extracting executable embeds and loads WebviewJS N-API addon when Deno is installed',
  async () => {
    await runStandalone('deno');
  },
  60_000,
);
