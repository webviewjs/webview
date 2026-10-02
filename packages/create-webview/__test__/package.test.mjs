import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('builds one executable entry for both npm bin aliases', async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.bin, {
    'create-webview': './dist/index.js',
    'create-webview-app': './dist/index.js',
  });

  const entry = await readFile(join(packageRoot, 'dist/index.js'), 'utf8');
  assert.ok(entry.startsWith('#!/usr/bin/env node\n'));
});

test('publishes only built files, README, and MIT license', async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.files, ['dist/', 'README.md', 'LICENSE']);
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.engines.node, '>=24');
  assert.equal(manifest.license, 'MIT');
  assert.ok(await readFile(join(packageRoot, 'README.md'), 'utf8'));
  assert.match(await readFile(join(packageRoot, 'LICENSE'), 'utf8'), /^MIT License/m);
});
