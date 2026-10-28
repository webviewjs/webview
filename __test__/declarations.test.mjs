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
