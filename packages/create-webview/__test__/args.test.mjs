import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliArgs } from '../dist/args.js';
import { detectPackageManager, installCommand } from '../dist/package-manager.js';

test('parses defaults and a positional project directory', () => {
  assert.deepEqual(parseCliArgs([]), {
    projectDirectory: undefined,
    template: undefined,
    packageManager: undefined,
    install: true,
    yes: false,
    force: false,
    help: false,
    version: false,
  });

  assert.equal(parseCliArgs(['my-app']).projectDirectory, 'my-app');
});

test('parses the template, package manager, no-install, yes, force, help, and version options', () => {
  const parsed = parseCliArgs([
    'my-app',
    '--template',
    'javascript',
    '--package-manager',
    'bun',
    '--no-install',
    '--yes',
    '--force',
    '--help',
    '--version',
  ]);

  assert.equal(parsed.template, 'javascript');
  assert.equal(parsed.packageManager, 'bun');
  assert.equal(parsed.install, false);
  assert.equal(parsed.yes, true);
  assert.equal(parsed.force, true);
  assert.equal(parsed.help, true);
  assert.equal(parsed.version, true);
});

test('rejects unsupported templates, package managers, unknown flags, and extra directories', () => {
  assert.throws(() => parseCliArgs(['--template', 'react']), /Unknown template "react"/);
  assert.throws(() => parseCliArgs(['--package-manager', 'deno']), /Unknown package manager "deno"/);
  assert.throws(() => parseCliArgs(['--unknown']), /unknown/);
  assert.throws(() => parseCliArgs(['one', 'two']), /Only one project directory/);
});

test('detects supported package managers from npm_config_user_agent', () => {
  assert.equal(detectPackageManager('npm/10.8.2 node/v24.0.0'), 'npm');
  assert.equal(detectPackageManager('bun/1.3.14'), 'bun');
  assert.equal(detectPackageManager('pnpm/9.12.0 npm/? node/v24'), 'pnpm');
  assert.equal(detectPackageManager('yarn/4.5.0 npm/? node/v24'), 'yarn');
  assert.equal(detectPackageManager('unknown/1.0'), 'npm');
  assert.equal(detectPackageManager(''), 'npm');
});

test('maps package managers to executable and argument arrays', () => {
  assert.deepEqual(installCommand('npm'), { command: 'npm', args: ['install'] });
  assert.deepEqual(installCommand('bun'), { command: 'bun', args: ['install'] });
  assert.deepEqual(installCommand('pnpm'), { command: 'pnpm', args: ['install'] });
  assert.deepEqual(installCommand('yarn'), { command: 'yarn', args: [] });
});
