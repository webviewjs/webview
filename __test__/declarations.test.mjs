import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = resolve(repoRoot, 'node_modules/typescript/bin/tsc');

test('generated NAPI declarations compile without skipping library checks', () => {
  const result = spawnSync(
    process.execPath,
    [tsc, '--noEmit', '--skipLibCheck', 'false', '--target', 'ESNext', '--module', 'commonjs', 'js-bindings.d.ts'],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

test('webview drag-drop events have typed payloads and keep window file events', () => {
  const result = spawnSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--target',
      'ESNext',
      '--module',
      'commonjs',
      '--moduleResolution',
      'node',
      resolve(repoRoot, '__test__/types/native-file-drop.ts'),
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

test('Application exposes the dock icon APIs with Buffer input', () => {
  const declarations = readFileSync(resolve(repoRoot, 'js-bindings.d.ts'), 'utf8');

  assert.match(declarations, /setDockIcon\(icon: Buffer\): void;/);
  assert.match(declarations, /removeDockIcon\(\): void;/);
});
