const { spawnSync } = require('node:child_process');
const { dirname, join } = require('node:path');

const postbuild = require('./postbuild');

const cliPackageJson = require.resolve('@napi-rs/cli/package.json');
const napiCli = join(dirname(cliPackageJson), 'dist', 'cli.js');
const args = [
  napiCli,
  'build',
  '--platform',
  '--js',
  'js-bindings.js',
  '--dts',
  'js-bindings.d.ts',
  ...process.argv.slice(2),
];

console.log(`Executing \x1b[36mnapi ${args.slice(1).join(' ')}\x1b[0m`);

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

postbuild();
