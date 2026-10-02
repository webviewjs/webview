import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createProject, normalizePackageName } from '../dist/project.js';

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'create-webview-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function options(directory, overrides = {}) {
  return {
    directory,
    template: 'typescript',
    packageManager: 'npm',
    install: false,
    webviewVersion: '9.8.7',
    ...overrides,
  };
}

test('creates the TypeScript project files and matching WebviewJS manifest', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'my-app');
  const created = await createProject(options(target, { cwd: parent }));

  assert.equal(created.packageName, 'my-app');
  assert.equal(created.template, 'typescript');
  for (const file of ['package.json', 'README.md', '.gitignore', 'src/main.ts', 'src/index.html']) {
    await readFile(join(target, file), 'utf8');
  }

  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'my-app');
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  assert.deepEqual(manifest.scripts, {
    dev: 'node src/main.ts',
    start: 'node src/main.ts',
    build: 'webview build src/main.ts --name my-app --asset src/index.html',
  });
  assert.equal(manifest.dependencies['@webviewjs/webview'], '9.8.7');
  assert.equal(manifest.engines.node, '>=24');

  const main = await readFile(join(target, 'src/main.ts'), 'utf8');
  assert.match(main, /async function main\(\)/);
  assert.match(main, /new Application\(\)/);
  assert.match(main, /createBrowserWindow/);
  assert.match(main, /isSea\(\)/);
  assert.match(main, /getAsset\('index\.html', 'utf8'\)/);
  assert.match(main, /new URL\('\.\/index\.html', import\.meta\.url\)/);
  assert.match(main, /createWebview\(\{ html \}\)/);
  assert.match(main, /app\.run\(\)/);

  const html = await readFile(join(target, 'src/index.html'), 'utf8');
  assert.match(html, /Your native window is running\./);
  assert.match(html, /<style>/);
  assert.equal(html.endsWith('\n'), true);
});

test('creates JavaScript entry files and scripts without a TypeScript entry', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'desktop_tool');
  await createProject(options(target, { cwd: parent, packageName: 'desktop_tool', template: 'javascript' }));

  const entries = await readdir(join(target, 'src'));
  assert.deepEqual(entries.sort(), ['index.html', 'main.js']);
  assert.match(await readFile(join(target, 'src/main.js'), 'utf8'), /async function main\(\)/);
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.dev, 'node src/main.js');
  assert.equal(manifest.scripts.start, 'node src/main.js');
  assert.equal(manifest.scripts.build, 'webview build src/main.js --name desktop_tool --asset src/index.html');
});

test('uses an empty existing directory', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'empty-project');
  await mkdir(target);
  await createProject(options(target, { cwd: parent }));
  assert.equal(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).name, 'empty-project');
});

test('refuses a non-empty directory by default without modifying its files', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'keep.txt'), 'keep me\n');

  await assert.rejects(createProject(options(target, { cwd: parent })), /Target directory is not empty/);
  assert.deepEqual(await readdir(target), ['keep.txt']);
  assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep me\n');
});

test('asks before using non-empty directories and keeps unrelated files', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'keep.txt'), 'keep me\n');
  let entriesSeen;

  await createProject(
    options(target, {
      cwd: parent,
      confirmNonEmpty: async (entries) => {
        entriesSeen = entries;
        return true;
      },
    }),
  );

  assert.deepEqual(entriesSeen, ['keep.txt']);
  assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep me\n');
  assert.ok(await readFile(join(target, 'src/main.ts'), 'utf8'));
});

test('force overwrites only conflicting generated files and keeps other content', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'package.json'), '{"old":true}\n');
  await writeFile(join(target, 'keep.txt'), 'keep me\n');

  await createProject(options(target, { cwd: parent, force: true }));
  assert.equal(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).name, 'occupied');
  assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep me\n');
});

test('uses executable and argument arrays with paths containing spaces', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'app directory with spaces');
  const calls = [];
  await createProject(
    options(target, {
      cwd: parent,
      packageName: 'app-directory-with-spaces',
      packageManager: 'pnpm',
      install: true,
      runner: async (command, args, runnerOptions) => {
        calls.push({ command, args, runnerOptions });
      },
    }),
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'pnpm');
  assert.deepEqual(calls[0].args, ['install']);
  assert.equal(calls[0].runnerOptions.cwd, target);
  assert.equal(calls[0].runnerOptions.shell, false);
});

test('reports an unavailable package manager without exposing an ENOENT stack', async (t) => {
  const parent = await temporaryDirectory(t);
  const target = join(parent, 'bun-project');
  const missing = Object.assign(new Error('spawn bun ENOENT'), { code: 'ENOENT' });

  await assert.rejects(
    createProject(
      options(target, {
        cwd: parent,
        packageManager: 'bun',
        install: true,
        runner: async () => {
          throw missing;
        },
      }),
    ),
    /Could not find "bun" on PATH/,
  );
});

test('normalizes ordinary package names and rejects surprising names', () => {
  assert.equal(normalizePackageName('My App'), 'my-app');
  assert.equal(normalizePackageName('example.webview'), 'example.webview');
  assert.equal(normalizePackageName('desktop_tool'), 'desktop_tool');
  assert.throws(() => normalizePackageName('bad/name'), /not a valid npm package name/);
});

test('refuses the current repository root as a target', async () => {
  const cwd = process.cwd();
  const target = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  await assert.rejects(createProject(options(target, { cwd })), /protected directory/);
});

test('refuses the filesystem root and home directory as targets', async () => {
  const cwd = process.cwd();
  const filesystemRoot = parse(cwd).root;
  await assert.rejects(createProject(options(filesystemRoot, { cwd })), /protected directory/);
  await assert.rejects(createProject(options(homedir(), { cwd })), /protected directory/);
});
