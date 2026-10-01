import assert from 'node:assert/strict';
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
import { test } from 'node:test';
import {
  buildExecutable,
  getHostPlatform,
  nativeAddonFileName,
  nativePackageName,
  parseRuntimeTarget,
  resolveNativeAddon,
} from '../dist/cli/index.js';

const packageRoot = join(import.meta.dirname, '..');
const fixture = join(import.meta.dirname, 'fixtures/executable-version.mjs');
const hostTarget = parseRuntimeTarget('node', undefined, getHostPlatform());

function runtimeAvailable(command) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

let addonAvailable = false;
try {
  resolveNativeAddon(hostTarget, packageRoot, packageRoot);
  addonAvailable = true;
} catch {
  addonAvailable = false;
}

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
    const addon = resolveNativeAddon(hostTarget, packageRoot, packageRoot).path;
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
      { packageRoot, logger: { info() {}, success() {}, warn() {}, error() {} } },
    );
    const isolatedDirectory = join(directory, 'isolated application');
    mkdirSync(isolatedDirectory);
    const isolatedExecutable = join(isolatedDirectory, basename(result.output));
    renameSync(result.output, isolatedExecutable);
    rmSync(join(projectRoot, 'node_modules'), { recursive: true, force: true });
    assert.ok(existsSync(isolatedExecutable));
    const executed = spawnSync(isolatedExecutable, [], {
      cwd: isolatedDirectory,
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: '' },
      timeout: 120_000,
    });
    assert.equal(executed.status, 0, executed.stderr || executed.error?.message);
    assert.match(executed.stdout.trim(), /\d+\.\d+\.\d+/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('Node SEA embeds and loads WebviewJS without project node_modules', { skip: !addonAvailable }, async () => {
  await runStandalone('node');
});

test(
  'Bun standalone embeds and loads WebviewJS N-API addon when Bun is installed',
  {
    skip: !addonAvailable || !runtimeAvailable('bun'),
  },
  async () => {
    await runStandalone('bun');
  },
);

test(
  'Deno self-extracting executable embeds and loads WebviewJS N-API addon when Deno is installed',
  {
    skip: !addonAvailable || !runtimeAvailable('deno'),
  },
  async () => {
    await runStandalone('deno');
  },
);
