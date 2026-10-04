const { spawnSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { isAbsolute, join, relative, resolve, sep } = require('node:path');

const packageRoot = resolve(__dirname, '..');
const TARGETS = ['aarch64-apple-ios', 'aarch64-apple-ios-sim', 'x86_64-apple-ios'];
const NAPI_LINK_ARGS = ['-C', 'link-arg=-Wl,-undefined,dynamic_lookup'];
const FRAMEWORK_BINARY = 'Webview';
const FRAMEWORK_INSTALL_NAME = '@rpath/Webview.framework/Webview';

function parseArgs(args) {
  const options = { profile: 'release', help: false };

  for (const arg of args) {
    if (arg === '--debug') {
      options.profile = 'debug';
    } else if (arg === '--release') {
      options.profile = 'release';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown iOS build option: ${arg}`);
    }
  }

  return options;
}

function getArtifactPath(root, target, profile) {
  return join(root, 'target', target, profile, 'libwebview.dylib');
}

function getCargoArgs(target, profile) {
  const args = ['rustc', '--lib', '--manifest-path', 'Cargo.toml', '--target', target];

  if (profile === 'release') {
    args.push('--release');
  }

  return [...args, '--', ...NAPI_LINK_ARGS];
}

function getBuildPlan(root, profile) {
  const outputRoot = join(root, 'target', 'ios', profile);
  const stagingRoot = join(outputRoot, 'staging');
  const deviceFramework = join(stagingRoot, 'device', 'Webview.framework');
  const simulatorFramework = join(stagingRoot, 'simulator', 'Webview.framework');
  const xcframework = join(outputRoot, 'Webview.xcframework');
  const frameworkBinary = FRAMEWORK_BINARY;

  return {
    outputRoot,
    stagingRoot,
    deviceFramework,
    simulatorFramework,
    xcframework,
    frameworkBinary,
    targets: TARGETS,
    cargoCommands: TARGETS.map((target) => ({
      command: 'cargo',
      args: getCargoArgs(target, profile),
    })),
    simulatorLibraries: [
      getArtifactPath(root, 'aarch64-apple-ios-sim', profile),
      getArtifactPath(root, 'x86_64-apple-ios', profile),
    ],
    deviceLibrary: getArtifactPath(root, 'aarch64-apple-ios', profile),
  };
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }
}

function runCommandCapture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }

  return result.stdout ?? '';
}

function assertInstallName(binary, output) {
  const installNames = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(':'));

  if (installNames.length === 0 || installNames.some((installName) => installName !== FRAMEWORK_INSTALL_NAME)) {
    throw new Error(
      `Expected install name ${FRAMEWORK_INSTALL_NAME} for ${binary}; otool reported ${installNames.join(', ') || 'none'}`,
    );
  }
}

function frameworkInfo(platform) {
  const supportedPlatform = platform === 'device' ? 'iPhoneOS' : 'iPhoneSimulator';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${FRAMEWORK_BINARY}</string>
  <key>CFBundleIdentifier</key>
  <string>org.webviewjs.webview</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Webview</string>
  <key>CFBundlePackageType</key>
  <string>FMWK</string>
  <key>CFBundleSupportedPlatforms</key>
  <array>
    <string>${supportedPlatform}</string>
  </array>
</dict>
</plist>
`;
}

function assertGeneratedPath(path, root) {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Refusing to remove generated path outside ${resolvedRoot}: ${resolvedPath}`);
  }
}

function buildIos(profile = 'release', options = {}) {
  const root = options.packageRoot ?? packageRoot;
  const hostPlatform = options.platform ?? process.platform;

  if (hostPlatform !== 'darwin') {
    throw new Error('Building the iOS addon requires macOS with Xcode installed.');
  }

  const plan = getBuildPlan(root, profile);
  const run = options.runCommand ?? runCommand;
  const capture = options.runCommandCapture ?? runCommandCapture;
  const fileExists = options.existsSync ?? existsSync;
  const copyFile = options.copyFileSync ?? copyFileSync;
  const makeDirectory = options.mkdirSync ?? mkdirSync;
  const removePath = options.rmSync ?? rmSync;
  const writeFile = options.writeFileSync ?? writeFileSync;

  run('rustup', ['target', 'add', ...plan.targets], root);

  for (const { command, args } of plan.cargoCommands) {
    run(command, args, root);
  }

  for (const artifact of [plan.deviceLibrary, ...plan.simulatorLibraries]) {
    if (!fileExists(artifact)) {
      throw new Error(`Expected iOS build output was not created: ${artifact}`);
    }
  }

  assertGeneratedPath(plan.stagingRoot, join(root, 'target', 'ios'));
  assertGeneratedPath(plan.xcframework, join(root, 'target', 'ios'));
  removePath(plan.stagingRoot, { recursive: true, force: true });
  removePath(plan.xcframework, { recursive: true, force: true });

  makeDirectory(plan.deviceFramework, { recursive: true });
  makeDirectory(plan.simulatorFramework, { recursive: true });

  const deviceBinary = join(plan.deviceFramework, plan.frameworkBinary);
  const simulatorBinary = join(plan.simulatorFramework, plan.frameworkBinary);
  copyFile(plan.deviceLibrary, deviceBinary);
  writeFile(join(plan.deviceFramework, 'Info.plist'), frameworkInfo('device'));
  writeFile(join(plan.simulatorFramework, 'Info.plist'), frameworkInfo('simulator'));

  run('lipo', ['-create', ...plan.simulatorLibraries, '-output', simulatorBinary], root);

  for (const binary of [deviceBinary, simulatorBinary]) {
    run('install_name_tool', ['-id', FRAMEWORK_INSTALL_NAME, binary], root);
    assertInstallName(binary, capture('otool', ['-D', binary], root));
  }

  run('lipo', ['-verify_arch', 'arm64', deviceBinary], root);
  run('lipo', ['-verify_arch', 'arm64', 'x86_64', simulatorBinary], root);
  run(
    'xcodebuild',
    [
      '-create-xcframework',
      '-framework',
      plan.deviceFramework,
      '-framework',
      plan.simulatorFramework,
      '-output',
      plan.xcframework,
    ],
    root,
  );

  if (!fileExists(plan.xcframework)) {
    throw new Error(`Expected XCFramework was not created: ${plan.xcframework}`);
  }

  return plan.xcframework;
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/build-ios.js [--release|--debug]\n\n' +
      'Builds experimental iOS device and simulator N-API artifacts on macOS.\n' +
      'The XCFramework is written to target/ios/<profile>/Webview.xcframework.\n',
  );
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const outputPath = buildIos(options.profile);
      process.stdout.write(`Created ${outputPath}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
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
};
