import { expect, onTestFinished, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProject, normalizePackageName } from '../dist/project.js';

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'create-webview-test-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
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

test('creates the TypeScript project files and matching WebviewJS manifest', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'my-app');
  const created = await createProject(options(target, { cwd: parent }));

  expect(created.packageName).toBe('my-app');
  expect(created.template).toBe('typescript');
  for (const file of ['package.json', 'README.md', '.gitignore', 'src/main.ts', 'src/index.html']) {
    await readFile(join(target, file), 'utf8');
  }

  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  expect(manifest.name).toBe('my-app');
  expect(manifest.private).toBe(true);
  expect(manifest.type).toBe('module');
  expect(manifest.scripts).toEqual({
    dev: 'node src/main.ts',
    start: 'node src/main.ts',
    build: 'webview build src/main.ts --name my-app --asset src/index.html',
  });
  expect(manifest.dependencies['@webviewjs/webview']).toBe('9.8.7');
  expect(manifest.engines.node).toBe('>=24');

  const main = await readFile(join(target, 'src/main.ts'), 'utf8');
  expect(main).toMatch(/async function main\(\)/);
  expect(main).toMatch(/new Application\(\)/);
  expect(main).toMatch(/createBrowserWindow/);
  expect(main).toMatch(/isSea\(\)/);
  expect(main).toMatch(/getAsset\('index\.html', 'utf8'\)/);
  expect(main).toMatch(/new URL\('\.\/index\.html', import\.meta\.url\)/);
  expect(main).toMatch(/createWebview\(\{ html \}\)/);
  expect(main).toMatch(/app\.run\(\)/);

  const html = await readFile(join(target, 'src/index.html'), 'utf8');
  expect(html).toMatch(/Your native window is running\./);
  expect(html).toMatch(/<style>/);
  expect(html.endsWith('\n')).toBe(true);
});

test('creates JavaScript entry files and scripts without a TypeScript entry', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'desktop_tool');
  await createProject(options(target, { cwd: parent, packageName: 'desktop_tool', template: 'javascript' }));

  const entries = await readdir(join(target, 'src'));
  expect(entries.sort()).toEqual(['index.html', 'main.js']);
  expect(await readFile(join(target, 'src/main.js'), 'utf8')).toMatch(/async function main\(\)/);
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  expect(manifest.scripts.dev).toBe('node src/main.js');
  expect(manifest.scripts.start).toBe('node src/main.js');
  expect(manifest.scripts.build).toBe('webview build src/main.js --name desktop_tool --asset src/index.html');
});

test('uses an empty existing directory', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'empty-project');
  await mkdir(target);
  await createProject(options(target, { cwd: parent }));
  expect(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).name).toBe('empty-project');
});

test('refuses a non-empty directory by default without modifying its files', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'keep.txt'), 'keep me\n');

  await expect(createProject(options(target, { cwd: parent }))).rejects.toThrow(/Target directory is not empty/);
  expect(await readdir(target)).toEqual(['keep.txt']);
  expect(await readFile(join(target, 'keep.txt'), 'utf8')).toBe('keep me\n');
});

test('asks before using non-empty directories and keeps unrelated files', async () => {
  const parent = await temporaryDirectory();
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

  expect(entriesSeen).toEqual(['keep.txt']);
  expect(await readFile(join(target, 'keep.txt'), 'utf8')).toBe('keep me\n');
  expect(await readFile(join(target, 'src/main.ts'), 'utf8')).toBeTruthy();
});

test('force overwrites only conflicting generated files and keeps other content', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'package.json'), '{"old":true}\n');
  await writeFile(join(target, 'keep.txt'), 'keep me\n');

  await createProject(options(target, { cwd: parent, force: true }));
  expect(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).name).toBe('occupied');
  expect(await readFile(join(target, 'keep.txt'), 'utf8')).toBe('keep me\n');
});

test('uses executable and argument arrays with paths containing spaces', async () => {
  const parent = await temporaryDirectory();
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

  expect(calls.length).toBe(1);
  expect(calls[0].command).toBe('pnpm');
  expect(calls[0].args).toEqual(['install']);
  expect(calls[0].runnerOptions.cwd).toBe(target);
  expect(calls[0].runnerOptions.shell).toBe(false);
});

test('reports an unavailable package manager without exposing an ENOENT stack', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'bun-project');
  const missing = Object.assign(new Error('spawn bun ENOENT'), { code: 'ENOENT' });

  await expect(
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
  ).rejects.toThrow(/Could not find "bun" on PATH/);
});

test('normalizes ordinary package names and rejects surprising names', () => {
  expect(normalizePackageName('My App')).toBe('my-app');
  expect(normalizePackageName('example.webview')).toBe('example.webview');
  expect(normalizePackageName('desktop_tool')).toBe('desktop_tool');
  expect(() => normalizePackageName('bad/name')).toThrow(/not a valid npm package name/);
});

test('refuses the current repository root as a target', async () => {
  const cwd = process.cwd();
  const target = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  await expect(createProject(options(target, { cwd }))).rejects.toThrow(/protected directory/);
});

test('refuses the filesystem root and home directory as targets', async () => {
  const cwd = process.cwd();
  const filesystemRoot = parse(cwd).root;
  await expect(createProject(options(filesystemRoot, { cwd }))).rejects.toThrow(/protected directory/);
  await expect(createProject(options(homedir(), { cwd }))).rejects.toThrow(/protected directory/);
});
