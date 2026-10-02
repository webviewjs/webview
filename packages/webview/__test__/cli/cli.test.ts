import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'bun:test';
import {
  bootstrapCLI,
  buildExecutable,
  createSeaPrelude,
  formatCommand,
  getOutputPath,
  nativePackageName,
  normalizeExecutableName,
  parseCLIArguments,
  parseRuntimeTarget,
  processRunner,
  resolveNativeAddon,
  resolvePostjectCli,
} from '../../dist/cli/index.js';
import { NodeRuntimeBuilder } from '../../dist/cli/runtimes/node.js';

const packageRoot = join(import.meta.dirname, '..', '..');

async function withTempDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'webview-cli-test-'));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function makeProject(directory, packageName = '@acme/my-app') {
  const project = join(directory, 'project with spaces');
  await mkdir(project, { recursive: true });
  await writeFile(join(project, 'package.json'), JSON.stringify({ name: packageName }));
  await mkdir(join(project, 'src'), { recursive: true });
  const input = join(project, 'src', 'main entry.ts');
  await writeFile(input, "console.log('fixture');\n");
  return { project, input };
}

test('CommonJS CLI output exposes named bootstrapCLI and the actual bin shim runs', async () => {
  expect(typeof bootstrapCLI).toBe('function');
  const shim = join(packageRoot, 'cli/index.mjs');
  const result = spawnSync(process.execPath, [shim, '--version'], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/WebviewJS v0\.4\.7/u);
});

test('argument parsing uses positional input, Node default, package name and dist output', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory);
    const parsed = parseCLIArguments(['build', input], project);
    expect(parsed.kind).toBe('build');
    if (parsed.kind !== 'build') return;
    expect(parsed.options.runtime).toBe('node');
    expect(parsed.options.input).toBe(input);
    expect(parsed.options.outDir).toBe(join(project, 'dist'));
    expect(parsed.options.name).toBe('my-app');
    expect(parsed.deprecated).toBe(false);
  });
});

test('argument parsing validates runtime and runtime-specific targets', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory);
    expect(() => parseCLIArguments(['build', input, '--runtime', 'nodejs'], project)).toThrow(/Unknown runtime/u);
    expect(() =>
      parseCLIArguments(['build', input, '--runtime', 'bun', '--target', 'bun-linux-x64-musl'], project),
    ).toThrow(/does not publish musl native addons/u);
    expect(() =>
      parseCLIArguments(['build', input, '--runtime', 'bun', '--target', 'bun-windows-ia32'], project),
    ).toThrow(/Unsupported bun target/u);
    expect(() => parseCLIArguments(['build', input, '--runtime', 'node', '--target', 'darwin-arm64'], project)).toThrow(
      /cannot cross-compile/u,
    );
  });
});

test('legacy --build --input normalizes to build and resources JSON joins the asset model', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory, 'simple');
    const resourceDirectory = join(project, 'resources');
    await mkdir(resourceDirectory);
    await writeFile(join(resourceDirectory, 'config file.json'), '{}');
    await writeFile(join(resourceDirectory, 'map.json'), JSON.stringify({ 'custom-config': './config file.json' }));
    const parsed = parseCLIArguments(
      ['--build', '--input', input, '--resources', join(resourceDirectory, 'map.json'), '--name', 'my_app.v2'],
      project,
    );
    expect(parsed.kind).toBe('build');
    if (parsed.kind !== 'build') return;
    expect(parsed.deprecated).toBe(true);
    expect(parsed.options.name).toBe('my_app.v2');
    expect(parsed.options.assets).toEqual([
      { key: 'custom-config', path: join(resourceDirectory, 'config file.json') },
    ]);
    expect(() =>
      parseCLIArguments(
        ['build', input, '--runtime', 'bun', '--resources', join(resourceDirectory, 'map.json')],
        project,
      ),
    ).toThrow(/Node SEA compatibility option/u);
  });
});

test('asset flags support paths with spaces and resource maps report invalid JSON', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory, 'simple');
    const asset = join(project, 'an asset.txt');
    await writeFile(asset, 'hello');
    const parsed = parseCLIArguments(['build', input, '--asset', asset], project);
    expect(parsed.kind).toBe('build');
    if (parsed.kind === 'build') expect(parsed.options.assets).toEqual([{ key: 'an asset.txt', path: asset }]);

    const malformed = join(project, 'assets.json');
    await writeFile(malformed, '{nope');
    expect(() => parseCLIArguments(['build', input, '--resources', malformed], project)).toThrow(
      /parse resources JSON/u,
    );
  });
});

test('executable names preserve sensible punctuation and reject path separators', () => {
  expect(normalizeExecutableName('my-app', '/tmp', 'src/main.js')).toBe('my-app');
  expect(normalizeExecutableName('foo_bar', '/tmp', 'src/main.js')).toBe('foo_bar');
  expect(normalizeExecutableName('foo.bar', '/tmp', 'src/main.js')).toBe('foo.bar');
  expect(() => normalizeExecutableName('../escape', '/tmp', 'src/main.js')).toThrow(/Invalid executable name/u);
  expect(getOutputPath({ outDir: '/tmp/release', name: 'my-app' }, { os: 'win32', arch: 'x64' })).toBe(
    '/tmp/release/my-app.exe',
  );
  expect(getOutputPath({ outDir: '/tmp/release', name: 'my-app.exe' }, { os: 'win32', arch: 'x64' })).toBe(
    '/tmp/release/my-app.exe',
  );
  expect(parseCLIArguments(['--help']).kind).toEqual('help');
  expect(parseCLIArguments(['build', '--help']).kind).toEqual('help');
  expect(parseCLIArguments(['--version']).kind).toEqual('version');
});

test('target mapping covers every published WebviewJS desktop native package', () => {
  const targets = [
    [{ os: 'darwin', arch: 'x64' }, '@webviewjs/webview-darwin-x64'],
    [{ os: 'darwin', arch: 'arm64' }, '@webviewjs/webview-darwin-arm64'],
    [{ os: 'win32', arch: 'x64' }, '@webviewjs/webview-win32-x64-msvc'],
    [{ os: 'win32', arch: 'arm64' }, '@webviewjs/webview-win32-arm64-msvc'],
    [{ os: 'win32', arch: 'ia32' }, '@webviewjs/webview-win32-ia32-msvc'],
    [{ os: 'linux', arch: 'x64', libc: 'gnu' }, '@webviewjs/webview-linux-x64-gnu'],
    [{ os: 'linux', arch: 'arm64', libc: 'gnu' }, '@webviewjs/webview-linux-arm64-gnu'],
    [{ os: 'linux', arch: 'ia32', libc: 'gnu' }, '@webviewjs/webview-linux-ia32-gnu'],
    [{ os: 'linux', arch: 'arm', libc: 'gnu' }, '@webviewjs/webview-linux-arm-gnueabihf'],
  ];
  for (const [target, packageName] of targets) expect(nativePackageName(target)).toBe(packageName);
  expect(() => nativePackageName({ os: 'linux', arch: 'x64', libc: 'musl' })).toThrow(/does not publish/u);
  expect(parseRuntimeTarget('deno', 'aarch64-pc-windows-msvc')).toEqual({ os: 'win32', arch: 'arm64' });
});

test('native resolver is project-anchored and never falls back to a host addon', async () => {
  await withTempDirectory(async (directory) => {
    const { project } = await makeProject(directory);
    const localPackage = join(directory, 'webview-package');
    await mkdir(localPackage);
    await writeFile(join(localPackage, 'webview.darwin-arm64.node'), 'host placeholder');
    expect(() => resolveNativeAddon({ os: 'win32', arch: 'x64' }, project, localPackage)).toThrow(
      /win32-x64.*optional dependency/u,
    );

    // Bun caches failed createRequire.resolve() lookups, so verify the existing
    // target package in a separate consumer project after checking no fallback.
    const { project: projectWithTarget } = await makeProject(join(directory, 'with-target'));
    const targetPackage = join(projectWithTarget, 'node_modules/@webviewjs/webview-win32-x64-msvc');
    await mkdir(targetPackage, { recursive: true });
    const addon = join(targetPackage, 'webview.win32-x64-msvc.node');
    await writeFile(addon, 'target placeholder');
    await writeFile(join(targetPackage, 'package.json'), JSON.stringify({ main: 'webview.win32-x64-msvc.node' }));
    expect(realpathSync(resolveNativeAddon({ os: 'win32', arch: 'x64' }, projectWithTarget, localPackage).path)).toBe(
      realpathSync(addon),
    );
    expect(() =>
      resolveNativeAddon(
        { os: 'win32', arch: 'x64' },
        projectWithTarget,
        localPackage,
        join(localPackage, 'webview.darwin-arm64.node'),
      ),
    ).toThrow(/requested target is win32-x64/u);
  });
});

test('process runner preserves exact arguments and distinguishes missing commands from non-zero exits', async () => {
  const argument = '/tmp/a path/with spaces.txt';
  const result = await processRunner.run(
    process.execPath,
    ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', argument],
    { capture: true },
  );
  expect(JSON.parse(result.stdout)).toEqual([argument]);
  expect(formatCommand(process.execPath, [argument])).toMatch(/"\/tmp\/a path\/with spaces\.txt"/u);

  await expect(processRunner.run('/definitely/missing/webview-runtime', [], { capture: true })).rejects.toMatchObject({
    kind: 'not-found',
  });
  await expect(processRunner.run(process.execPath, ['-e', 'process.exit(7)'], { capture: true })).rejects.toMatchObject(
    { kind: 'failed', exitCode: 7 },
  );
});

test('SEA prelude embeds the private addon asset and extracts it under a version/hash cache', () => {
  const digest = 'a'.repeat(64);
  const prelude = createSeaPrelude('0.4.7', digest);
  expect(prelude).toMatch(/__webviewjs_native\.node/u);
  expect(prelude).toMatch(/NAPI_RS_NATIVE_LIBRARY_PATH/u);
  expect(prelude).toMatch(/createRequire\(process\.execPath\)/u);
  expect(prelude).toMatch(/0\.4\.7-[a]{64}/u);
  expect(prelude).toMatch(/renameSync/u);
  expect(prelude).toMatch(/Buffer\.from\(__wvSea\.getAsset/u);
});

function createFakeRunner(onRun = () => {}) {
  const calls = [];
  return {
    calls,
    runner: {
      async run(executable, args, options = {}) {
        const call = { executable, args: [...args], cwd: options.cwd };
        calls.push(call);
        await onRun(call);
        return { code: 0, stdout: '', stderr: '' };
      },
    },
  };
}

async function makeNodeBuildContext(directory, supportsBuildSea, target = { os: 'linux', arch: 'x64', libc: 'gnu' }) {
  const projectRoot = join(directory, 'user project');
  const tempDir = join(directory, 'temp build');
  const outDir = join(directory, 'release output with spaces');
  await mkdir(projectRoot, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const input = join(projectRoot, 'main.js');
  const addonPath = join(
    directory,
    target.os === 'darwin' ? 'webview.darwin-arm64.node' : 'webview.linux-x64-gnu.node',
  );
  const fakeNode = join(directory, 'fake node executable');
  await writeFile(input, "console.log('bundle fixture');\n");
  await writeFile(addonPath, 'fake native bytes');
  await writeFile(fakeNode, 'not executed');
  const options = {
    runtime: 'node',
    input,
    outDir,
    name: 'my-app',
    minify: false,
    verbose: false,
    assets: [],
    dryRun: false,
    projectRoot,
  };
  const context = {
    options,
    target,
    addonPath,
    packageVersion: '0.4.7',
    packageRoot,
    tempDir,
    runtimeExecutable: fakeNode,
    runtime: { executable: fakeNode, version: supportsBuildSea ? '25.5.0' : '24.21.0', supportsBuildSea },
    seaOptions: { useCodeCache: false, execArgv: [], execArgvExtension: 'env', useSnapshot: false },
    runner: undefined,
    logger: { info() {}, success() {}, warn() {}, error() {} },
  };
  return { context, output: join(outDir, 'my-app'), addonPath, tempDir, fakeNode };
}

test('Node 24 SEA planning bundles first, embeds the addon and invokes installed Postject with array arguments', async () => {
  await withTempDirectory(async (directory) => {
    const { context, output, addonPath, fakeNode, tempDir } = await makeNodeBuildContext(directory, false);
    let config;
    const fake = createFakeRunner(async ({ args }) => {
      if (args[0] === '--experimental-sea-config') {
        config = JSON.parse(await readFile(args[1], 'utf8'));
        await writeFile(config.output, 'fake sea blob');
      }
    });
    context.runner = fake.runner;
    const result = await new NodeRuntimeBuilder().build(context);
    expect(result.output).toBe(output);
    expect(config.main).toBe(join(tempDir, 'bundled-entry.cjs'));
    expect(config.output).toBe(join(tempDir, 'sea-prep.blob'));
    expect(config.useCodeCache).toBe(false);
    expect(config.useSnapshot).toBe(false);
    expect(config.assets['__webviewjs_native.node']).toBe(addonPath);
    const postjectCall = fake.calls.find((call) => call.args[0].includes('postject'));
    expect(postjectCall).toBeTruthy();
    expect(postjectCall.executable).toBe(fakeNode);
    expect(postjectCall.args[0]).toBe(resolvePostjectCli(packageRoot));
    expect(postjectCall.args.includes('NODE_SEA_BLOB')).toBeTruthy();
    expect(postjectCall.args.includes('NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2')).toBeTruthy();
    expect(postjectCall.args.includes(join(tempDir, 'sea-prep.blob'))).toBeTruthy();
    expect(!postjectCall.args.includes('npx')).toBeTruthy();
    expect(fake.calls.some((call) => call.args[0] === '--experimental-sea-config')).toBe(true);
    expect(existsSync(join(dirname(output), 'sea-config.json'))).toBe(false);
    expect(existsSync(join(dirname(output), 'sea-prep.blob'))).toBe(false);
  });
});

test('Node 25.5 capability selects --build-sea and skips Postject', async () => {
  await withTempDirectory(async (directory) => {
    const { context, output } = await makeNodeBuildContext(directory, true);
    let config;
    const fake = createFakeRunner(async ({ args }) => {
      if (args[0] === '--build-sea') {
        config = JSON.parse(await readFile(args[1], 'utf8'));
        await writeFile(config.output, 'fake native SEA binary');
      }
    });
    context.runner = fake.runner;
    await new NodeRuntimeBuilder().build(context);
    expect(config.output).toBe(output);
    expect(fake.calls.map((call) => call.args[0])).toEqual(['--build-sea']);
  });
});

test('Node probe detects SEA support by capability output and macOS legacy injection uses its segment name', async () => {
  const builder = new NodeRuntimeBuilder();
  const base = {
    options: { runtime: 'node', target: undefined, minify: false },
    target: { os: 'darwin', arch: 'arm64' },
    addonPath: '/tmp/webview.darwin-arm64.node',
    packageVersion: '0.4.7',
    packageRoot,
    runtimeExecutable: process.execPath,
    seaOptions: { useCodeCache: false, execArgv: [], execArgvExtension: 'env', useSnapshot: false },
    logger: { info() {}, success() {}, warn() {}, error() {} },
  };
  const probe24 = createFakeRunner();
  probe24.runner.run = async (_executable, args) => ({
    code: 0,
    stdout: args[0] === '--version' ? 'v24.21.0' : 'Usage: node [options]',
    stderr: '',
  });
  expect((await builder.probe({ ...base, runner: probe24.runner })).supportsBuildSea).toBe(false);
  const probe25 = createFakeRunner();
  probe25.runner.run = async (_executable, args) => ({
    code: 0,
    stdout: args[0] === '--version' ? 'v25.5.0' : '  --build-sea config.json',
    stderr: '',
  });
  expect((await builder.probe({ ...base, runner: probe25.runner })).supportsBuildSea).toBe(true);

  await withTempDirectory(async (directory) => {
    const { context, fakeNode, tempDir } = await makeNodeBuildContext(directory, false, {
      os: 'darwin',
      arch: 'arm64',
    });
    const fake = createFakeRunner(async ({ args }) => {
      if (args[0] === '--experimental-sea-config') {
        const config = JSON.parse(await readFile(args[1], 'utf8'));
        await writeFile(config.output, 'sea blob');
      }
    });
    context.runner = fake.runner;
    await new NodeRuntimeBuilder().build(context);
    const postjectCall = fake.calls.find((call) => call.args[0].includes('postject'));
    expect(postjectCall).toBeTruthy();
    expect(postjectCall.args.slice(-2)).toEqual(['--macho-segment-name', 'NODE_SEA']);
    expect(
      fake.calls.some((call) => call.executable === 'codesign' && call.args[0] === '--remove-signature'),
    ).toBeTruthy();
    expect(fake.calls.some((call) => call.executable === 'codesign' && call.args[0] === '--sign')).toBeTruthy();
    expect(fakeNode.length > 0).toBe(true);
    expect(tempDir.includes('temp build')).toBe(true);
  });
});

test('dry run validates the addon and runtime but does not create output or invoke a compiler', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory, 'dry-run-app');
    const addon = join(project, 'custom-native.node');
    const outDir = join(directory, 'release output');
    await writeFile(addon, 'native');
    const fake = createFakeRunner();
    fake.runner.run = async (executable, args, options = {}) => {
      fake.calls.push({ executable, args: [...args], cwd: options.cwd });
      return {
        code: 0,
        stdout: args[0] === '--version' ? 'v24.21.0' : 'Usage: node [options]',
        stderr: '',
      };
    };
    const result = await buildExecutable(
      { input, cwd: project, outDir, nativeAddon: addon, dryRun: true },
      {
        runner: fake.runner,
        packageRoot,
        nodeExecutable: process.execPath,
        logger: { info() {}, success() {}, warn() {}, error() {} },
      },
    );
    expect(result.dryRun).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(fake.calls.map((call) => call.args[0])).toEqual(['--version', '--help']);
  });
});
