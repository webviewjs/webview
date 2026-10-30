import { expect, onTestFinished, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProject, normalizePackageName } from '../dist/project.js';

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'create-webview-test-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function makeExample(directory: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const basicTypeScriptExample = join(repositoryRoot, 'examples/basic-ts');
const basicJavaScriptExample = join(repositoryRoot, 'examples/basic-js');

function options(directory: string, overrides = {}) {
  return {
    directory,
    sourceDirectory: basicTypeScriptExample,
    packageManager: 'npm',
    install: false,
    ...overrides,
  };
}

test('creates the TypeScript project files and resolves workspace dependencies to npm latest', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'my-app');
  const created = await createProject(options(target, { cwd: parent }));

  expect(created.packageName).toBe('my-app');
  expect(await readdir(target)).not.toContain('node_modules');
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
    build: 'webview build src/main.ts --asset src/index.html',
  });
  expect(manifest.dependencies['@webviewjs/webview']).toBe('latest');
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
  expect(await readFile(join(target, 'README.md'), 'utf8')).toMatch(/WebviewJS starter/);
});

test('creates JavaScript entry files and resolves its workspace dependency to npm latest', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'desktop_tool');
  await createProject(
    options(target, { cwd: parent, packageName: 'desktop_tool', sourceDirectory: basicJavaScriptExample }),
  );

  const entries = await readdir(join(target, 'src'));
  expect(entries.sort()).toEqual(['index.html', 'main.js']);
  expect(await readFile(join(target, 'src/main.js'), 'utf8')).toMatch(/async function main\(\)/);
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  expect(manifest.name).toBe('desktop_tool');
  expect(manifest.scripts.dev).toBe('node src/main.js');
  expect(manifest.scripts.start).toBe('node src/main.js');
  expect(manifest.scripts.build).toBe('webview build src/main.js --asset src/index.html');
  expect(manifest.dependencies['@webviewjs/webview']).toBe('latest');
});

test('preserves nested files, dotfiles, empty directories, and dependency versions', async () => {
  const parent = await temporaryDirectory();
  const source = join(parent, 'source');
  const target = join(parent, 'new-app');
  await makeExample(source, {
    'package.json': JSON.stringify({
      name: 'starter-name',
      dependencies: { '@webviewjs/webview': '~0.4.1', 'other-package': '^3.2.0' },
      custom: { enabled: true },
    }),
    '.env.example': 'VALUE=example\n',
    'src/.hidden/config.json': '{"enabled":true}\n',
    'assets/one/two.txt': 'deep content\n',
  });
  await mkdir(join(source, 'empty'), { recursive: true });

  await createProject(options(target, { cwd: parent, packageName: 'custom-app', sourceDirectory: source }));

  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  expect(manifest.name).toBe('custom-app');
  expect(manifest.dependencies).toEqual({ '@webviewjs/webview': '~0.4.1', 'other-package': '^3.2.0' });
  expect(manifest.custom).toEqual({ enabled: true });
  expect(await readFile(join(target, '.env.example'), 'utf8')).toBe('VALUE=example\n');
  expect(await readFile(join(target, 'src/.hidden/config.json'), 'utf8')).toBe('{"enabled":true}\n');
  expect(await readFile(join(target, 'assets/one/two.txt'), 'utf8')).toBe('deep content\n');
  expect(await readdir(join(target, 'empty'))).toEqual([]);
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

test('force overwrites only conflicting files and keeps unrelated content', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'occupied');
  await mkdir(target);
  await writeFile(join(target, 'package.json'), '{"old":true}\n');
  await writeFile(join(target, 'keep.txt'), 'keep me\n');

  await createProject(options(target, { cwd: parent, force: true }));
  expect(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).name).toBe('occupied');
  expect(await readFile(join(target, 'keep.txt'), 'utf8')).toBe('keep me\n');
});

test('rejects malformed examples and source symlinks before creating project files', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'bad-example');
  const malformed = join(parent, 'malformed');
  await makeExample(malformed, { 'package.json': '{broken' });
  await expect(createProject(options(target, { cwd: parent, sourceDirectory: malformed }))).rejects.toThrow(
    /invalid package\.json/,
  );
  expect(await readdir(parent)).toContain('malformed');
  expect(await readdir(parent)).not.toContain('bad-example');

  const linked = join(parent, 'linked');
  await makeExample(linked, { 'package.json': '{"name":"linked"}' });
  await writeFile(join(parent, 'outside.txt'), 'outside');
  await symlink(join(parent, 'outside.txt'), join(linked, 'link.txt'));
  await expect(
    createProject(options(join(parent, 'linked-target'), { cwd: parent, sourceDirectory: linked })),
  ).rejects.toThrow(/symbolic link/);
});

test('refuses destination symlink parents and symlink project roots', async () => {
  const parent = await temporaryDirectory();
  const target = join(parent, 'symlink-parent');
  const external = join(parent, 'external');
  await mkdir(target);
  await mkdir(external);
  await symlink(external, join(target, 'src'));

  await expect(createProject(options(target, { cwd: parent, force: true }))).rejects.toThrow(/symbolic link/);
  expect(await readdir(external)).toEqual([]);

  const rootLink = join(parent, 'root-link');
  await symlink(external, rootLink);
  await expect(createProject(options(rootLink, { cwd: parent, force: true }))).rejects.toThrow(
    /cannot be a symbolic link/,
  );
});

test('adds workspace dependencies at the npm latest tag using argument arrays', async () => {
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
  expect(calls[0].args).toEqual(['add', '@webviewjs/webview@latest']);
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
