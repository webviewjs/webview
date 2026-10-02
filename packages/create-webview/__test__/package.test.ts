import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('builds one executable entry for both npm bin aliases', async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  expect(manifest.bin).toEqual({
    'create-webview': './dist/index.js',
    'create-webview-app': './dist/index.js',
  });

  const entry = await readFile(join(packageRoot, 'dist/index.js'), 'utf8');
  expect(entry.startsWith('#!/usr/bin/env node\n')).toBeTruthy();
});

test('publishes only built files, README, and MIT license', async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  expect(manifest.files).toEqual(['dist/', 'README.md', 'LICENSE']);
  expect(manifest.type).toBe('module');
  expect(manifest.engines.node).toBe('>=24');
  expect(manifest.license).toBe('MIT');
  expect(await readFile(join(packageRoot, 'README.md'), 'utf8')).toBeTruthy();
  expect(await readFile(join(packageRoot, 'LICENSE'), 'utf8')).toMatch(/^MIT License/m);
});
