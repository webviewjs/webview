import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
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
} from '../dist/cli/index.js';
import { NodeRuntimeBuilder } from '../dist/cli/runtimes/node.js';

const packageRoot = join(import.meta.dirname, '..');

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
  assert.equal(typeof bootstrapCLI, 'function');
  const shim = join(packageRoot, 'cli/index.mjs');
  const result = spawnSync(process.execPath, [shim, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /WebviewJS v0\.4\.7/u);
});

test('argument parsing uses positional input, Node default, package name and dist output', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory);
    const parsed = parseCLIArguments(['build', input], project);
    assert.equal(parsed.kind, 'build');
    if (parsed.kind !== 'build') return;
    assert.equal(parsed.options.runtime, 'node');
    assert.equal(parsed.options.input, input);
    assert.equal(parsed.options.outDir, join(project, 'dist'));
    assert.equal(parsed.options.name, 'my-app');
    assert.equal(parsed.deprecated, false);
  });
});

test('argument parsing validates runtime and runtime-specific targets', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory);
    assert.throws(() => parseCLIArguments(['build', input, '--runtime', 'nodejs'], project), /Unknown runtime/u);
    assert.throws(
      () => parseCLIArguments(['build', input, '--runtime', 'bun', '--target', 'bun-linux-x64-musl'], project),
      /does not publish musl native addons/u,
    );
    assert.throws(
      () => parseCLIArguments(['build', input, '--runtime', 'bun', '--target', 'bun-windows-ia32'], project),
      /Unsupported bun target/u,
    );
    assert.throws(
      () => parseCLIArguments(['build', input, '--runtime', 'node', '--target', 'darwin-arm64'], project),
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
    assert.equal(parsed.kind, 'build');
    if (parsed.kind !== 'build') return;
    assert.equal(parsed.deprecated, true);
    assert.equal(parsed.options.name, 'my_app.v2');
    assert.deepEqual(parsed.options.assets, [
      { key: 'custom-config', path: join(resourceDirectory, 'config file.json') },
    ]);
    assert.throws(
      () =>
        parseCLIArguments(
          ['build', input, '--runtime', 'bun', '--resources', join(resourceDirectory, 'map.json')],
          project,
        ),
      /Node SEA compatibility option/u,
    );
  });
});

test('asset flags support paths with spaces and resource maps report invalid JSON', async () => {
  await withTempDirectory(async (directory) => {
    const { project, input } = await makeProject(directory, 'simple');
    const asset = join(project, 'an asset.txt');
    await writeFile(asset, 'hello');
    const parsed = parseCLIArguments(['build', input, '--asset', asset], project);
    assert.equal(parsed.kind, 'build');
    if (parsed.kind === 'build') assert.deepEqual(parsed.options.assets, [{ key: 'an asset.txt', path: asset }]);

    const malformed = join(project, 'assets.json');
    await writeFile(malformed, '{nope');
    assert.throws(
      () => parseCLIArguments(['build', input, '--resources', malformed], project),
      /parse resources JSON/u,
    );
  });
});

test('executable names preserve sensible punctuation and reject path separators', () => {
  assert.equal(normalizeExecutableName('my-app', '/tmp', 'src/main.js'), 'my-app');
  assert.equal(normalizeExecutableName('foo_bar', '/tmp', 'src/main.js'), 'foo_bar');
  assert.equal(normalizeExecutableName('foo.bar', '/tmp', 'src/main.js'), 'foo.bar');
  assert.throws(() => normalizeExecutableName('../escape', '/tmp', 'src/main.js'), /Invalid executable name/u);
  assert.equal(
    getOutputPath({ outDir: '/tmp/release', name: 'my-app' }, { os: 'win32', arch: 'x64' }),
    '/tmp/release/my-app.exe',
  );
  assert.equal(
    getOutputPath({ outDir: '/tmp/release', name: 'my-app.exe' }, { os: 'win32', arch: 'x64' }),
    '/tmp/release/my-app.exe',
  );
  assert.deepEqual(parseCLIArguments(['--help']).kind, 'help');
  assert.deepEqual(parseCLIArguments(['build', '--help']).kind, 'help');
  assert.deepEqual(parseCLIArguments(['--version']).kind, 'version');
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
  for (const [target, packageName] of targets) assert.equal(nativePackageName(target), packageName);
  assert.throws(() => nativePackageName({ os: 'linux', arch: 'x64', libc: 'musl' }), /does not publish/u);
  assert.deepEqual(parseRuntimeTarget('deno', 'aarch64-pc-windows-msvc'), { os: 'win32', arch: 'arm64' });
});

test('native resolver is project-anchored and never falls back to a host addon', async () => {
  await withTempDirectory(async (directory) => {
    const { project } = await makeProject(directory);
    const localPackage = join(directory, 'webview-package');
    await mkdir(localPackage);
    await writeFile(join(localPackage, 'webview.darwin-arm64.node'), 'host placeholder');
    assert.throws(
      () => resolveNativeAddon({ os: 'win32', arch: 'x64' }, project, localPackage),
      /win32-x64.*optional dependency/u,
    );

    const targetPackage = join(project, 'node_modules/@webviewjs/webview-win32-x64-msvc');
    await mkdir(targetPackage, { recursive: true });
    const addon = join(targetPackage, 'webview.win32-x64-msvc.node');
    await writeFile(addon, 'target placeholder');
    await writeFile(join(targetPackage, 'package.json'), JSON.stringify({ main: 'webview.win32-x64-msvc.node' }));
    assert.equal(resolveNativeAddon({ os: 'win32', arch: 'x64' }, project, localPackage).path, realpathSync(addon));
    assert.throws(
      () =>
        resolveNativeAddon(
          { os: 'win32', arch: 'x64' },
          project,
          localPackage,
          join(localPackage, 'webview.darwin-arm64.node'),
        ),
      /requested target is win32-x64/u,
    );
  });
});

test('process runner preserves exact arguments and distinguishes missing commands from non-zero exits', async () => {
  const argument = '/tmp/a path/with spaces.txt';
  const result = await processRunner.run(
    process.execPath,
    ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', argument],
    { capture: true },
  );
  assert.deepEqual(JSON.parse(result.stdout), [argument]);
  assert.match(formatCommand(process.execPath, [argument]), /"\/tmp\/a path\/with spaces\.txt"/u);

  await assert.rejects(processRunner.run('/definitely/missing/webview-runtime', [], { capture: true }), (error) => {
    assert.equal(error.kind, 'not-found');
    return true;
  });
  await assert.rejects(processRunner.run(process.execPath, ['-e', 'process.exit(7)'], { capture: true }), (error) => {
    assert.equal(error.kind, 'failed');
    assert.equal(error.exitCode, 7);
    return true;
  });
});

test('SEA prelude embeds the private addon asset and extracts it under a version/hash cache', () => {
  const digest = 'a'.repeat(64);
  const prelude = createSeaPrelude('0.4.7', digest);
  assert.match(prelude, /__webviewjs_native\.node/u);
  assert.match(prelude, /NAPI_RS_NATIVE_LIBRARY_PATH/u);
  assert.match(prelude, /createRequire\(process\.execPath\)/u);
  assert.match(prelude, /0\.4\.7-[a]{64}/u);
  assert.match(prelude, /renameSync/u);
  assert.match(prelude, /Buffer\.from\(__wvSea\.getAsset/u);
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
    assert.equal(result.output, output);
    assert.equal(config.main, join(tempDir, 'bundled-entry.cjs'));
    assert.equal(config.output, join(tempDir, 'sea-prep.blob'));
    assert.equal(config.useCodeCache, false);
    assert.equal(config.useSnapshot, false);
    assert.equal(config.assets['__webviewjs_native.node'], addonPath);
    const postjectCall = fake.calls.find((call) => call.args[0].includes('postject'));
    assert.ok(postjectCall);
    assert.equal(postjectCall.executable, fakeNode);
    assert.equal(postjectCall.args[0], resolvePostjectCli(packageRoot));
    assert.ok(postjectCall.args.includes('NODE_SEA_BLOB'));
    assert.ok(postjectCall.args.includes('NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'));
    assert.ok(postjectCall.args.includes(join(tempDir, 'sea-prep.blob')));
    assert.ok(!postjectCall.args.includes('npx'));
    assert.equal(
      fake.calls.some((call) => call.args[0] === '--experimental-sea-config'),
      true,
    );
    assert.equal(existsSync(join(dirname(output), 'sea-config.json')), false, 'SEA config stays in the temp directory');
    assert.equal(existsSync(join(dirname(output), 'sea-prep.blob')), false, 'SEA blob stays in the temp directory');
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
    assert.equal(config.output, output);
    assert.deepEqual(
      fake.calls.map((call) => call.args[0]),
      ['--build-sea'],
    );
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
  assert.equal((await builder.probe({ ...base, runner: probe24.runner })).supportsBuildSea, false);
  const probe25 = createFakeRunner();
  probe25.runner.run = async (_executable, args) => ({
    code: 0,
    stdout: args[0] === '--version' ? 'v25.5.0' : '  --build-sea config.json',
    stderr: '',
  });
  assert.equal((await builder.probe({ ...base, runner: probe25.runner })).supportsBuildSea, true);

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
    assert.ok(postjectCall);
    assert.deepEqual(postjectCall.args.slice(-2), ['--macho-segment-name', 'NODE_SEA']);
    assert.ok(fake.calls.some((call) => call.executable === 'codesign' && call.args[0] === '--remove-signature'));
    assert.ok(fake.calls.some((call) => call.executable === 'codesign' && call.args[0] === '--sign'));
    assert.equal(fakeNode.length > 0, true);
    assert.equal(tempDir.includes('temp build'), true);
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
    assert.equal(result.dryRun, true);
    assert.equal(existsSync(outDir), false);
    assert.deepEqual(
      fake.calls.map((call) => call.args[0]),
      ['--version', '--help'],
    );
  });
});
