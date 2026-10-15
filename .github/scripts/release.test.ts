import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  run,
  webviewRequire,
  validateRelease,
  requireUnpublished,
  registryVersion,
  requireArtifacts,
  readPackage,
  verifyPublished,
  packagePlan,
} from './release.mjs';
import { validateManifest, stageCreator, packWorkspace, inspectTarball } from './release-packages.mjs';

const base = { event: 'workflow_dispatch', ref: 'refs/heads/main', version: '1.0.0-rc.2', tag: 'rc' };
const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});
function temp() {
  const path = mkdtempSync(join(tmpdir(), 'webview-release-test-'));
  temporary.push(path);
  return path;
}
function json(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value));
}

test('only manual main releases accept exact v1 semver and compatible tags', () => {
  for (const version of ['1.0.0', '1.12.3', '1.0.0-rc.2', '1.0.0-beta.1', '1.0.0-alpha.0']) {
    expect(() => validateRelease({ ...base, version, tag: 'next' })).not.toThrow();
  }
  expect(() => validateRelease({ ...base, version: '1.0.0', tag: 'latest' })).not.toThrow();
  for (const change of [
    { event: 'push' },
    { event: 'pull_request' },
    { ref: 'refs/heads/v0' },
    { ref: 'refs/tags/v1.0.0' },
    { version: '0.4.8' },
    { version: '2.0.0' },
    { version: 'v1.0.0' },
    { version: '1.00.0' },
    { version: '1.0.0-rc.02' },
    { version: '1.0.0+build' },
    { version: '1.0.0\n', tag: 'next' },
    { version: '1.0.0; echo bad' },
    { tag: 'v0' },
    { tag: 'other' },
    { tag: 'latest' },
    { tag: 'beta' },
    { version: '1.0.0', tag: 'rc' },
  ])
    expect(() => validateRelease({ ...base, ...change })).toThrow();
});

test('registry errors fail closed; only 404 means missing', async () => {
  expect(await registryVersion('pkg', '1.0.0', async () => new Response('', { status: 404 }))).toBeNull();
  for (const status of [401, 403, 429, 500]) {
    await expect(registryVersion('pkg', '1.0.0', async () => new Response('', { status }))).rejects.toThrow(
      'npm lookup failed',
    );
  }
  await expect(
    registryVersion('pkg', '1.0.0', async () => Response.json({ name: 'wrong', version: '1.0.0' })),
  ).rejects.toThrow('Unexpected');
  expect(await registryVersion('pkg', '1.0.0', async () => Response.json({ name: 'pkg', version: '1.0.0' }))).toEqual({
    name: 'pkg',
    version: '1.0.0',
  });
});

test('partial releases cannot be silently resumed', async () => {
  await expect(
    requireUnpublished([{ name: 'one' }, { name: 'two' }], '1.0.0', async (name: string) =>
      name === 'two' ? {} : null,
    ),
  ).rejects.toThrow('duplicate/partial release');
  await expect(requireUnpublished([{ name: 'one' }], '1.0.0', async () => null)).resolves.toBeUndefined();
});

test('every configured platform has an exact artifact and manifest plan', async () => {
  const plan = await packagePlan();
  expect(plan).toHaveLength(12);
  expect(new Set(plan.map((item: { name: string }) => item.name)).size).toBe(12);
  const directory = temp();
  const binary = 'webview.test.node';
  const item = { target: 'test', path: directory, binary };
  expect(() => requireArtifacts([item], false)).toThrow('Missing');
  writeFileSync(join(directory, binary), '');
  expect(() => requireArtifacts([item], false)).toThrow('empty');
  writeFileSync(join(directory, binary), 'fixture');
  expect(() => requireArtifacts([item], false)).not.toThrow();
});

test('manifest validation rejects unresolved workspace/catalog and unsafe publication', () => {
  const pkg = { name: 'pkg', version: '1.0.0' };
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']) {
    for (const range of ['workspace:*', 'catalog:', 'catalog:build', 'file:../local', 'https://example.com/pkg.tgz']) {
      expect(() => validateManifest({ ...pkg, [section]: { dependency: range } }, 'pkg', '1.0.0')).toThrow(
        'Non-registry',
      );
    }
    expect(() => validateManifest({ ...pkg, [section]: { dependency: '^1.2.3' } }, 'pkg', '1.0.0')).not.toThrow();
  }
  expect(() => validateManifest({ ...pkg, private: true }, 'pkg', '1.0.0')).toThrow();
  expect(() => validateManifest({ ...pkg, publishConfig: { tag: 'latest' } }, 'pkg', '1.0.0')).toThrow();
  expect(() => validateManifest(pkg, 'pkg', '1.0.1')).toThrow();
});

test('Bun packs real workspace and catalog references to registry semver without lifecycles', () => {
  const directory = temp();
  mkdirSync(join(directory, 'packages/pkg'), { recursive: true });
  mkdirSync(join(directory, 'packages/dep'), { recursive: true });
  mkdirSync(join(directory, 'tarballs'));
  json(join(directory, 'package.json'), {
    private: true,
    workspaces: { packages: ['packages/*'], catalog: { 'is-number': '^7.0.0' } },
  });
  json(join(directory, 'packages/dep/package.json'), { name: 'fixture-dep', version: '1.2.3' });
  json(join(directory, 'packages/pkg/package.json'), {
    name: 'fixture-pkg',
    version: '1.0.0',
    dependencies: { 'fixture-dep': 'workspace:*', 'is-number': 'catalog:' },
    scripts: { prepare: 'exit 99', prepack: 'exit 99', postpack: 'exit 99' },
  });
  run('bun', ['install', '--ignore-scripts'], directory);
  const path = packWorkspace(join(directory, 'packages/pkg'), join(directory, 'tarballs'));
  const manifest = inspectTarball(path, 'fixture-pkg', '1.0.0');
  expect(manifest.dependencies).toEqual({ 'fixture-dep': '1.2.3', 'is-number': '^7.0.0' });
  expect(readPackage(join(directory, 'packages/pkg/package.json')).dependencies['fixture-dep']).toBe('workspace:*');
});

test('both creator stages retain files, aliases and exact version', () => {
  const directory = temp();
  const source = join(directory, 'source');
  mkdirSync(join(source, 'dist'), { recursive: true });
  for (const file of ['README.md', 'LICENSE', 'dist/index.js']) writeFileSync(join(source, file), 'fixture');
  const manifest = {
    name: 'create-webview',
    version: '0.0.0',
    bin: { 'create-webview': './dist/index.js', 'create-webview-app': './dist/index.js' },
    files: ['dist/', 'README.md', 'LICENSE'],
  };
  json(join(source, 'package.json'), manifest);
  for (const name of ['create-webview', 'create-webview-app']) {
    const path = join(directory, name);
    stageCreator(source, path, name, '1.0.0');
    expect(readPackage(join(path, 'package.json'))).toEqual({ ...manifest, name, version: '1.0.0' });
    expect(() =>
      inspectTarball(packWorkspace(path, directory), name, '1.0.0', ['dist/index.js', 'README.md', 'LICENSE']),
    ).not.toThrow();
  }
  json(join(source, 'package.json'), { ...manifest, bin: {} });
  expect(() => stageCreator(source, join(directory, 'bad'), 'create-webview', '1.0.0')).toThrow('alias');
});

test('post-publication checks verify version and requested tag', async () => {
  await expect(
    verifyPublished([{ name: 'pkg' }], '1.0.0', 'next', async (url: string) =>
      Response.json(url.endsWith('dist-tags') ? { next: '1.0.0' } : { name: 'pkg', version: '1.0.0' }),
    ),
  ).resolves.toBeUndefined();
  await expect(
    verifyPublished([{ name: 'pkg' }], '1.0.0', 'next', async (url: string) =>
      url.endsWith('dist-tags') ? new Response('', { status: 403 }) : Response.json({ name: 'pkg', version: '1.0.0' }),
    ),
  ).rejects.toThrow('dist-tag lookup failed');
});

test('workflow structure keeps all automatic events read-only and publishing manual', async () => {
  const { YAML } = await import('bun');
  const { readFileSync } = await import('node:fs');
  const workflow = (name: string) => YAML.parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')) as any;
  const ci = workflow('CI');
  const build = workflow('Build');
  const release = workflow('Release');
  expect(Object.keys(ci.on).sort()).toEqual(['pull_request', 'push']);
  for (const event of ['push', 'pull_request']) expect(ci.on[event].branches).toEqual(['main', 'v[0-9]']);
  expect(ci.permissions).toEqual({ contents: 'read' });
  expect(build.permissions).toEqual({ contents: 'read' });
  expect(Object.keys(build.on)).toEqual(['workflow_call']);
  expect(ci.jobs.build.uses).toBe('./.github/workflows/Build.yml');
  expect(release.jobs.build.uses).toBe('./.github/workflows/Build.yml');
  expect(Object.keys(release.on)).toEqual(['workflow_dispatch']);
  expect(Object.keys(release.on.workflow_dispatch.inputs).sort()).toEqual(['npm_tag', 'version']);
  expect(release.on.workflow_dispatch.inputs.npm_tag.default).toBe('next');
  expect(release.concurrency).toEqual({ group: 'npm-release', 'cancel-in-progress': false });
  expect(release.jobs.publish.environment).toBe('npm-release');
  expect(release.jobs.publish.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  expect(release.jobs.build.needs).toBe('validate');
  const publishingStep = release.jobs.publish.steps.at(-1);
  expect(publishingStep.env.npm_config_provenance).toBe('true');
  expect(publishingStep.env.npm_config_ignore_scripts).toBe('true');
  for (const name of ['CI', 'Build']) {
    expect(JSON.stringify(workflow(name))).not.toContain('NPM_TOKEN');
    expect(JSON.stringify(workflow(name))).not.toContain('release.mjs publish');
  }
  const plan = await packagePlan();
  const matrix = build.jobs.build.strategy.matrix.settings.map((item: { target: string }) => item.target);
  expect([...matrix, 'x86_64-unknown-freebsd'].sort()).toEqual(
    plan.map((item: { target: string }) => item.target).sort(),
  );
});

test('release scripts resolve workspace dependencies without root hoisting in Bun and Node', () => {
  const directory = temp();
  mkdirSync(join(directory, '.github/scripts'), { recursive: true });
  mkdirSync(join(directory, 'packages/webview/node_modules/@napi-rs'), { recursive: true });
  json(join(directory, 'package.json'), { private: true });
  json(join(directory, 'packages/webview/package.json'), { name: '@webviewjs/webview', napi: { targets: [] } });
  for (const file of ['release.mjs', 'release-packages.mjs']) {
    cpSync(new URL(file, import.meta.url), join(directory, '.github/scripts', file));
  }
  symlinkSync(
    dirname(webviewRequire.resolve('@napi-rs/cli/package.json')),
    join(directory, 'packages/webview/node_modules/@napi-rs/cli'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const script = `
    import { packagePlan } from './.github/scripts/release.mjs';
    import { validateManifest } from './.github/scripts/release-packages.mjs';
    if ((await packagePlan()).length !== 0) throw new Error('Unexpected fixture plan');
    validateManifest({ name: 'pkg', version: '1.0.0', dependencies: { dep: '^1.0.0' } }, 'pkg', '1.0.0');
    let rejected = false;
    try { validateManifest({ name: 'pkg', version: '1.0.0', dependencies: { dep: 'workspace:*' } }, 'pkg', '1.0.0'); }
    catch { rejected = true; }
    if (!rejected) throw new Error('Unresolved dependency accepted');
    console.log('workspace dependencies resolved');
  `;
  for (const runtime of ['bun', 'node']) {
    expect(run(runtime, ['--input-type=module', '--eval', script], directory, true)).toBe(
      'workspace dependencies resolved',
    );
  }
});
