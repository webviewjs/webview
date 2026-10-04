import { expect, test } from 'bun:test';
import { join, resolve } from 'node:path';
import {
  FRAMEWORK_BINARY,
  FRAMEWORK_INSTALL_NAME,
  TARGETS,
  assertInstallName,
  buildIos,
  frameworkInfo,
  getArtifactPath,
  getBuildPlan,
  getCargoArgs,
  parseArgs,
} from '../../scripts/build-ios.js';

test('iOS build options default to release and accept debug builds', () => {
  expect(parseArgs([])).toEqual({ profile: 'release', help: false });
  expect(parseArgs(['--debug'])).toEqual({ profile: 'debug', help: false });
  expect(parseArgs(['--release', '--help'])).toEqual({ profile: 'release', help: true });
  expect(() => parseArgs(['--target', 'aarch64-apple-ios'])).toThrow('Unknown iOS build option: --target');
});

test('the build plan covers the iOS device and both simulator architectures', () => {
  const root = resolve('packages/webview');
  const plan = getBuildPlan(root, 'release');

  expect(TARGETS).toEqual(['aarch64-apple-ios', 'aarch64-apple-ios-sim', 'x86_64-apple-ios']);
  expect(plan.cargoCommands.map(({ args }) => args[args.indexOf('--target') + 1])).toEqual(TARGETS);
  expect(plan.deviceLibrary).toBe(getArtifactPath(root, 'aarch64-apple-ios', 'release'));
  expect(plan.simulatorLibraries).toEqual([
    getArtifactPath(root, 'aarch64-apple-ios-sim', 'release'),
    getArtifactPath(root, 'x86_64-apple-ios', 'release'),
  ]);
  expect(plan.frameworkBinary).toBe(FRAMEWORK_BINARY);
  expect(plan.frameworkBinary).toBe('Webview');
  expect(plan.xcframework.endsWith('Webview.xcframework')).toBe(true);
});

test('cargo iOS build passes N-API dynamic lookup linker arguments', () => {
  const releaseArgs = getCargoArgs('aarch64-apple-ios', 'release');
  const debugArgs = getCargoArgs('aarch64-apple-ios-sim', 'debug');

  expect(releaseArgs).toContain('--release');
  expect(debugArgs).not.toContain('--release');
  expect(releaseArgs.slice(-2)).toEqual(['-C', 'link-arg=-Wl,-undefined,dynamic_lookup']);
});

test('iOS frameworks use their framework name as the executable and identify their platform variant', () => {
  expect(frameworkInfo('device')).toContain('<string>iPhoneOS</string>');
  expect(frameworkInfo('simulator')).toContain('<string>iPhoneSimulator</string>');
  expect(frameworkInfo('device')).toContain('<key>CFBundleExecutable</key>\n  <string>Webview</string>');
  expect(frameworkInfo('device')).not.toContain('webview.node');
});

test('iOS framework install names must match the framework rpath', () => {
  expect(() =>
    assertInstallName('Webview.framework/Webview', `Webview.framework/Webview:\n${FRAMEWORK_INSTALL_NAME}\n`),
  ).not.toThrow();
  expect(() =>
    assertInstallName('Webview.framework/Webview', 'Webview.framework/Webview:\n@rpath/libwebview.dylib\n'),
  ).toThrow(`Expected install name ${FRAMEWORK_INSTALL_NAME}`);
  expect(() =>
    assertInstallName(
      'Webview.framework/Webview',
      'Webview.framework/Webview (architecture arm64):\n@rpath/Webview.framework/Webview\nWebview.framework/Webview (architecture x86_64):\n@rpath/libwebview.dylib\n',
    ),
  ).toThrow(`Expected install name ${FRAMEWORK_INSTALL_NAME}`);
});

test('iOS builds stop before running tools on non-macOS hosts', () => {
  const commands: string[] = [];

  expect(() =>
    buildIos('release', {
      packageRoot: resolve('packages/webview'),
      platform: 'win32',
      runCommand: (command: string) => commands.push(command),
    }),
  ).toThrow('Building the iOS addon requires macOS with Xcode installed.');
  expect(commands).toEqual([]);
});

test('iOS build runs rust targets and packages device plus simulator outputs', () => {
  const root = resolve('packages/webview');
  const commands: Array<{ command: string; args: string[] }> = [];
  const removed: string[] = [];
  const written: string[] = [];
  const copied: string[] = [];
  const made: string[] = [];
  const captured: string[] = [];

  const output = buildIos('debug', {
    packageRoot: root,
    platform: 'darwin',
    runCommand: (command: string, args: string[]) => {
      commands.push({ command, args });
    },
    runCommandCapture: (_command: string, args: string[]) => {
      captured.push(args[1]);
      return `${args[1]}:\n${FRAMEWORK_INSTALL_NAME}\n`;
    },
    existsSync: (path: string) => path.endsWith('libwebview.dylib') || path.endsWith('Webview.xcframework'),
    rmSync: (path: string) => removed.push(path),
    mkdirSync: (path: string) => made.push(path),
    copyFileSync: (_source: string, destination: string) => copied.push(destination),
    writeFileSync: (path: string) => written.push(path),
  });

  expect(output).toBe(getBuildPlan(root, 'debug').xcframework);
  expect(commands[0]).toEqual({
    command: 'rustup',
    args: ['target', 'add', ...TARGETS],
  });
  expect(commands.slice(1, 4).every(({ command }) => command === 'cargo')).toBe(true);
  expect(commands.slice(1, 4).every(({ args }) => !args.includes('--release'))).toBe(true);
  expect(commands.some(({ command, args }) => command === 'lipo' && args.includes('-create'))).toBe(true);
  expect(commands.filter(({ command }) => command === 'install_name_tool').map(({ args }) => args)).toEqual([
    ['-id', FRAMEWORK_INSTALL_NAME, join(getBuildPlan(root, 'debug').deviceFramework, 'Webview')],
    ['-id', FRAMEWORK_INSTALL_NAME, join(getBuildPlan(root, 'debug').simulatorFramework, 'Webview')],
  ]);
  expect(captured).toHaveLength(2);
  expect(commands.at(-1)?.command).toBe('xcodebuild');
  expect(commands.at(-1)?.args).toContain('-create-xcframework');
  expect(removed).toHaveLength(2);
  expect(made).toHaveLength(2);
  expect(copied[0].endsWith('Webview')).toBe(true);
  expect(written.some((path) => path.endsWith('Info.plist'))).toBe(true);
});

test('iOS packaging stops before XCFramework creation when an input artifact is missing', () => {
  const root = resolve('packages/webview');
  const plan = getBuildPlan(root, 'release');
  const commands: string[] = [];
  const removed: string[] = [];

  expect(() =>
    buildIos('release', {
      packageRoot: root,
      platform: 'darwin',
      runCommand: (command: string) => commands.push(command),
      existsSync: (path: string) => path !== plan.deviceLibrary,
      rmSync: (path: string) => removed.push(path),
    }),
  ).toThrow(`Expected iOS build output was not created: ${plan.deviceLibrary}`);

  expect(commands).toEqual(['rustup', 'cargo', 'cargo', 'cargo']);
  expect(removed).toEqual([]);
});

test('iOS packaging propagates tool failures without running later packaging steps', () => {
  const root = resolve('packages/webview');
  const commands: string[] = [];

  expect(() =>
    buildIos('release', {
      packageRoot: root,
      platform: 'darwin',
      runCommand: (command: string) => {
        commands.push(command);
        if (command === 'lipo') throw new Error('simulator lipo failed');
      },
      runCommandCapture: (_command: string, args: string[]) => `${args[1]}:\n${FRAMEWORK_INSTALL_NAME}\n`,
      existsSync: () => true,
      rmSync: () => {},
      mkdirSync: () => {},
      copyFileSync: () => {},
      writeFileSync: () => {},
    }),
  ).toThrow('simulator lipo failed');

  expect(commands).toEqual(['rustup', 'cargo', 'cargo', 'cargo', 'lipo']);
});

test('iOS packaging rejects a framework with an unexpected install name before creating the XCFramework', () => {
  const root = resolve('packages/webview');
  const commands: string[] = [];

  expect(() =>
    buildIos('release', {
      packageRoot: root,
      platform: 'darwin',
      runCommand: (command: string) => commands.push(command),
      runCommandCapture: (_command: string, args: string[]) => `${args[1]}:\n@rpath/libwebview.dylib\n`,
      existsSync: () => true,
      rmSync: () => {},
      mkdirSync: () => {},
      copyFileSync: () => {},
      writeFileSync: () => {},
    }),
  ).toThrow(`Expected install name ${FRAMEWORK_INSTALL_NAME}`);

  expect(commands).toContain('install_name_tool');
  expect(commands).not.toContain('xcodebuild');
});
