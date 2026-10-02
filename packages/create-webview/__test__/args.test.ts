import { expect, test } from 'bun:test';
import { parseCliArgs } from '../dist/args.js';
import { detectPackageManager, installCommand } from '../dist/package-manager.js';

test('parses defaults and a positional project directory', () => {
  expect(parseCliArgs([])).toEqual({
    projectDirectory: undefined,
    template: undefined,
    packageManager: undefined,
    install: true,
    yes: false,
    force: false,
    help: false,
    version: false,
  });

  expect(parseCliArgs(['my-app']).projectDirectory).toBe('my-app');
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

  expect(parsed.template).toBe('javascript');
  expect(parsed.packageManager).toBe('bun');
  expect(parsed.install).toBe(false);
  expect(parsed.yes).toBe(true);
  expect(parsed.force).toBe(true);
  expect(parsed.help).toBe(true);
  expect(parsed.version).toBe(true);
});

test('rejects unsupported templates, package managers, unknown flags, and extra directories', () => {
  expect(() => parseCliArgs(['--template', 'react'])).toThrow(/Unknown template "react"/);
  expect(() => parseCliArgs(['--package-manager', 'deno'])).toThrow(/Unknown package manager "deno"/);
  expect(() => parseCliArgs(['--unknown'])).toThrow(/unknown/);
  expect(() => parseCliArgs(['one', 'two'])).toThrow(/Only one project directory/);
});

test('detects supported package managers from npm_config_user_agent', () => {
  expect(detectPackageManager('npm/10.8.2 node/v24.0.0')).toBe('npm');
  expect(detectPackageManager('bun/1.3.14')).toBe('bun');
  expect(detectPackageManager('pnpm/9.12.0 npm/? node/v24')).toBe('pnpm');
  expect(detectPackageManager('yarn/4.5.0 npm/? node/v24')).toBe('yarn');
  expect(detectPackageManager('unknown/1.0')).toBe('npm');
  expect(detectPackageManager('')).toBe('npm');
});

test('maps package managers to executable and argument arrays', () => {
  expect(installCommand('npm')).toEqual({ command: 'npm', args: ['install'] });
  expect(installCommand('bun')).toEqual({ command: 'bun', args: ['install'] });
  expect(installCommand('pnpm')).toEqual({ command: 'pnpm', args: ['install'] });
  expect(installCommand('yarn')).toEqual({ command: 'yarn', args: [] });
});
