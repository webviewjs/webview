import { expect, test } from 'bun:test';
import { parseCliArgs } from '../dist/args.js';
import { detectPackageManager, installCommand } from '../dist/package-manager.js';

test('parses defaults and a positional project directory', () => {
  expect(parseCliArgs([])).toEqual({
    projectDirectory: undefined,
    example: 'basic-ts',
    explicitExample: false,
    packageManager: undefined,
    install: true,
    yes: false,
    force: false,
    help: false,
    version: false,
  });

  expect(parseCliArgs(['my-app']).projectDirectory).toBe('my-app');
});

test('parses examples, the deprecated template alias, package manager, and shared options', () => {
  const parsed = parseCliArgs([
    'my-app',
    '--example',
    'basic-js',
    '--package-manager',
    'bun',
    '--no-install',
    '--yes',
    '--force',
    '--help',
    '--version',
  ]);

  expect(parsed.example).toBe('basic-js');
  expect(parsed.explicitExample).toBe(true);
  expect(parsed.packageManager).toBe('bun');
  expect(parsed.install).toBe(false);
  expect(parsed.yes).toBe(true);
  expect(parsed.force).toBe(true);
  expect(parsed.help).toBe(true);
  expect(parsed.version).toBe(true);
});

test('maps deprecated template choices and rejects unsupported or conflicting options', () => {
  expect(parseCliArgs(['--template', 'typescript']).example).toBe('basic-ts');
  expect(parseCliArgs(['--template', 'javascript']).example).toBe('basic-js');
  expect(() => parseCliArgs(['--template', 'react'])).toThrow(/Unknown template "react"/);
  expect(() => parseCliArgs(['--template', 'typescript', '--example', 'basic-ts'])).toThrow(/Use either --example/);
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
  expect(installCommand('npm', ['@webviewjs/webview@latest'])).toEqual({
    command: 'npm',
    args: ['install', '@webviewjs/webview@latest'],
  });
  expect(installCommand('bun')).toEqual({ command: 'bun', args: ['install'] });
  expect(installCommand('bun', ['@webviewjs/webview@latest'])).toEqual({
    command: 'bun',
    args: ['add', '@webviewjs/webview@latest'],
  });
  expect(installCommand('pnpm')).toEqual({ command: 'pnpm', args: ['install'] });
  expect(installCommand('pnpm', ['@webviewjs/webview@latest'])).toEqual({
    command: 'pnpm',
    args: ['add', '@webviewjs/webview@latest'],
  });
  expect(installCommand('yarn')).toEqual({ command: 'yarn', args: [] });
  expect(installCommand('yarn', ['@webviewjs/webview@latest'])).toEqual({
    command: 'yarn',
    args: ['add', '@webviewjs/webview@latest'],
  });
});
