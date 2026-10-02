const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const packageRoot = resolve(__dirname, '..');

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: packageRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Forward build flags such as --target to NAPI, while keeping them away from run-s.
run([resolve(__dirname, 'build.js'), ...process.argv.slice(2)]);
run([resolve(__dirname, 'clean-lib.js')]);
run([require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json']);
