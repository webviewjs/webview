import { expect, onTestFinished, test } from 'bun:test';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadTemplate } from 'giget';
import type { TemplateDownloader } from '../dist/examples.js';
import { toGigetSource, withDownloadedExample } from '../dist/examples.js';

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'create-webview-example-test-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('resolves named examples and supported GitHub repository or directory URLs', () => {
  expect(toGigetSource('basic-ts')).toBe('github:webviewjs/webview/examples/basic-ts#main');
  expect(toGigetSource('https://github.com/owner/repo')).toBe('github:owner/repo');
  expect(toGigetSource('https://github.com/owner/repo.git/')).toBe('github:owner/repo');
  expect(toGigetSource('https://github.com/owner/repo/tree/main/examples/basic-js')).toBe(
    'github:owner/repo/examples/basic-js#main',
  );
  expect(toGigetSource('https://github.com/owner/repo/tree/release-1')).toBe('github:owner/repo#release-1');
  expect(toGigetSource('https://github.com/owner/repo/tree/feature%2Ftheme/examples/basic-ts')).toBe(
    'github:owner/repo/examples/basic-ts#feature/theme',
  );
});

test('rejects unsupported hosts, protocols, malformed paths, and traversal', () => {
  for (const source of [
    '',
    '../outside',
    'https://gitlab.com/owner/repo',
    'http://github.com/owner/repo',
    'https://github.com/owner',
    'https://github.com/owner/repo/blob/main/example.ts',
    'https://github.com/owner/repo/tree/main/%2e%2e/private',
    'https://github.com/owner/repo?tab=readme',
  ]) {
    expect(() => toGigetSource(source)).toThrow();
  }
});

test('downloads to a temporary directory outside the project and removes it after use', async () => {
  const project = await temporaryDirectory();
  let downloadDirectory = '';
  const downloader: TemplateDownloader = async (source, options) => {
    expect(source).toBe('github:webviewjs/webview/examples/basic-ts#main');
    downloadDirectory = options.dir!;
    expect(downloadDirectory.startsWith(project)).toBe(false);
    await mkdir(downloadDirectory, { recursive: true });
    await writeFile(join(downloadDirectory, 'starter.txt'), 'downloaded\n');
    return { dir: downloadDirectory, source: 'webviewjs/webview/examples/basic-ts' } as Awaited<
      ReturnType<typeof downloadTemplate>
    >;
  };

  const copied = await withDownloadedExample(
    'basic-ts',
    async (sourceDirectory) => {
      expect(await readFile(join(sourceDirectory, 'starter.txt'), 'utf8')).toBe('downloaded\n');
      return sourceDirectory;
    },
    downloader,
  );

  expect(copied).toBe(downloadDirectory);
  await expect(access(downloadDirectory)).rejects.toThrow();
});

test('cleans temporary downloads when copying fails and reports missing examples clearly', async () => {
  const failingDownloader: TemplateDownloader = async (_source, options) => {
    await mkdir(options.dir!, { recursive: true });
    await writeFile(join(options.dir!, 'partial.txt'), 'partial');
    return { dir: options.dir!, source: 'mock' } as Awaited<ReturnType<typeof downloadTemplate>>;
  };
  let temporary = '';
  const recordingDownloader: TemplateDownloader = async (source, options) => {
    temporary = options.dir!;
    return failingDownloader(source, options);
  };

  await expect(
    withDownloadedExample(
      'basic-ts',
      async () => {
        throw new Error('copy failed');
      },
      recordingDownloader,
    ),
  ).rejects.toThrow(/copy failed/);
  await expect(access(temporary)).rejects.toThrow();

  const missing: TemplateDownloader = async () => {
    throw new Error('HTTP 404: Not Found');
  };
  await expect(withDownloadedExample('missing-example', async () => undefined, missing)).rejects.toThrow(
    /Example "missing-example" was not found/,
  );
});

test('reports network failures and removes the temporary download directory', async () => {
  let temporary = '';
  const offline: TemplateDownloader = async (_source, options) => {
    temporary = options.dir!;
    throw new Error('connection reset');
  };

  await expect(withDownloadedExample('basic-ts', async () => undefined, offline)).rejects.toThrow(
    /Could not download example "basic-ts": connection reset/,
  );
  await expect(access(temporary)).rejects.toThrow();
});

test.skipIf(process.env.CREATE_WEBVIEW_INTEGRATION !== '1')(
  'downloads the repository-hosted basic-ts example',
  async () => {
    await withDownloadedExample('basic-ts', async (sourceDirectory) => {
      const manifest = JSON.parse(await readFile(join(sourceDirectory, 'package.json'), 'utf8'));
      expect(manifest.dependencies['@webviewjs/webview']).toBeTruthy();
      expect(await readFile(join(sourceDirectory, 'src/main.ts'), 'utf8')).toContain('new Application()');
    });
  },
);
