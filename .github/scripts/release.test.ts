import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  run,
  webviewRequire,
  validateRelease,
  registryVersion,
  registryPackage,
  inspectRegistryState,
  requireArtifacts,
  readPackage,
  packagePlan,
  allPackages,
} from './release.mjs';
import {
  validateManifest,
  validatePublishEnvironment,
  publishArguments,
  publishCommand,
  publishPackages,
  stageCreator,
  packWorkspace,
  inspectTarball,
} from './release-packages.mjs';

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
    { resume: 'maybe' },
  ])
    expect(() => validateRelease({ ...base, ...change })).toThrow();
});

test('registry lookups retry rate limits and server failures with Retry-After backoff', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const manifest = { name: 'pkg', version: '1.0.0' };
  const result = await registryVersion('pkg', '1.0.0', {
    maxAttempts: 4,
    sleep: async (delay: number) => void delays.push(delay),
    log: () => {},
    fetcher: async () => {
      attempts += 1;
      if (attempts === 1) return new Response('', { status: 503 });
      if (attempts === 2) return new Response('', { status: 429, headers: { 'retry-after': '2' } });
      return Response.json(manifest);
    },
  });
  expect(result).toEqual(manifest);
  expect(attempts).toBe(3);
  expect(delays).toEqual([500, 2000]);
});

test('registry lookups retry timeouts and network errors but stop after the configured bound', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await registryVersion('pkg', '1.0.0', {
    maxAttempts: 3,
    sleep: async (delay: number) => void delays.push(delay),
    log: () => {},
    fetcher: async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
      if (attempts === 2) throw new TypeError('network is unavailable');
      return Response.json({ name: 'pkg', version: '1.0.0' });
    },
  });
  expect(result).toEqual({ name: 'pkg', version: '1.0.0' });
  expect(delays).toEqual([500, 1000]);
  expect(attempts).toBe(3);

  attempts = 0;
  await expect(
    registryVersion('pkg', '1.0.0', {
      maxAttempts: 2,
      sleep: async () => {},
      log: () => {},
      fetcher: async () => {
        attempts += 1;
        return new Response('', { status: 503 });
      },
    }),
  ).rejects.toThrow('2 attempt(s)');
  expect(attempts).toBe(2);
});

test('registry lookups fail immediately on permanent errors and unexpected metadata', async () => {
  for (const status of [401, 403]) {
    let attempts = 0;
    await expect(
      registryVersion('pkg', '1.0.0', {
        maxAttempts: 4,
        fetcher: async () => {
          attempts += 1;
          return new Response('', { status });
        },
      }),
    ).rejects.toThrow(`HTTP ${status}`);
    expect(attempts).toBe(1);
  }
  let attempts = 0;
  await expect(
    registryVersion('pkg', '1.0.0', {
      maxAttempts: 4,
      fetcher: async () => {
        attempts += 1;
        return Response.json({ name: 'wrong', version: '1.0.0' });
      },
    }),
  ).rejects.toThrow('unexpected registry metadata');
  expect(attempts).toBe(1);
});

test('registry 404 is absent unless the exact version is already visible through a dist-tag', async () => {
  expect(await registryVersion('pkg', '1.0.0', { fetcher: async () => new Response('', { status: 404 }) })).toBeNull();
  const urls: string[] = [];
  const existing = await registryPackage('pkg', '1.0.0', {
    fetcher: async (input: string | URL | Request) => {
      urls.push(String(input));
      return String(input).endsWith('/dist-tags')
        ? Response.json({ next: '1.0.0' })
        : new Response('', { status: 404 });
    },
  });
  expect(existing).toEqual({ name: 'pkg', version: '1.0.0' });
  expect(urls).toHaveLength(2);
  const missing = await registryPackage('pkg', '1.0.0', {
    fetcher: async (input: string | URL | Request) =>
      String(input).endsWith('/dist-tags') ? Response.json({ next: '0.9.0' }) : new Response('', { status: 404 }),
  });
  expect(missing).toBeNull();
  await expect(
    registryPackage('pkg', '1.0.0', {
      fetcher: async (input: string | URL | Request) =>
        String(input).endsWith('/dist-tags') ? Response.json({ next: 100 }) : new Response('', { status: 404 }),
    }),
  ).rejects.toThrow('unexpected registry metadata');
});

const publicationPlan = [
  { name: '@webviewjs/webview-linux-x64-gnu', path: 'platform-linux' },
  { name: '@webviewjs/webview-darwin-arm64', path: 'platform-macos' },
  { name: '@webviewjs/webview', path: 'primary.tgz', tarball: true },
  { name: 'create-webview', path: 'creator.tgz', tarball: true },
  { name: 'create-webview-app', path: 'creator-mirror.tgz', tarball: true },
];

function publicationHarness(initiallyPublished: string[] = [], failName?: string) {
  const published = new Set(initiallyPublished);
  const writes: string[] = [];
  const logs: string[] = [];
  let failed = false;
  return {
    published,
    writes,
    logs,
    options: {
      lookup: async (name: string, version: string) => (published.has(name) ? { name, version } : null),
      publishPackage: async (item: { name: string }) => {
        if (item.name === failName && !failed) {
          failed = true;
          throw new Error('simulated npm publish failure');
        }
        if (published.has(item.name)) throw new Error(`attempted immutable republish: ${item.name}`);
        writes.push(item.name);
        published.add(item.name);
      },
      log: (message: string) => logs.push(message),
    },
  };
}

test('normal publication writes all missing packages in platform-primary-creator order', async () => {
  const harness = publicationHarness();
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', false, harness.options);
  expect(harness.writes).toEqual(publicationPlan.map(({ name }) => name));
  expect(result.reused).toEqual([]);
  expect(result.missing).toEqual(publicationPlan.map(({ name }) => name));
  expect(result.newlyPublished).toEqual(publicationPlan.map(({ name }) => name));
  expect(publishArguments('rc')).toEqual([
    'publish',
    '--ignore-scripts',
    '--access',
    'public',
    '--provenance',
    '--tag',
    'rc',
  ]);
  expect(publishCommand(publicationPlan[0], 'rc')).toEqual({
    args: publishArguments('rc'),
    cwd: 'platform-linux',
  });
  expect(publishCommand(publicationPlan[2], 'rc')).toEqual({
    args: publishArguments('rc', 'primary.tgz'),
    cwd: '.',
  });
  expect(harness.logs.some((message) => message.includes('Missing'))).toBe(true);
  expect(harness.logs.some((message) => message.includes('Published new packages'))).toBe(true);
});

test('normal publication rejects any existing exact version before npm writes', async () => {
  const harness = publicationHarness([publicationPlan[0].name]);
  await expect(publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', false, harness.options)).rejects.toThrow(
    'Refusing duplicate/partial release',
  );
  expect(harness.writes).toEqual([]);
});

test('resume reuses mixed native and primary packages and publishes only missing packages', async () => {
  const harness = publicationHarness([publicationPlan[0].name, publicationPlan[2].name]);
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, harness.options);
  expect(harness.writes).toEqual([publicationPlan[1].name, publicationPlan[3].name, publicationPlan[4].name]);
  expect(result.reused).toEqual([publicationPlan[0].name, publicationPlan[2].name]);
  expect(harness.logs.some((message) => message.includes('Reused existing package'))).toBe(true);
  expect(harness.logs.some((message) => message.includes('Missing'))).toBe(true);
});

test('resume can publish only missing native packages before existing primary and creators', async () => {
  const missingNative = publicationPlan[1].name;
  const harness = publicationHarness(
    publicationPlan.filter(({ name }) => name !== missingNative).map(({ name }) => name),
  );
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, harness.options);
  expect(harness.writes).toEqual([missingNative]);
  expect(result.newlyPublished).toEqual([missingNative]);
});

test('resume can publish missing creator packages after all native and primary packages exist', async () => {
  const harness = publicationHarness(publicationPlan.slice(0, 3).map(({ name }) => name));
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, harness.options);
  expect(harness.writes).toEqual(['create-webview', 'create-webview-app']);
  expect(result.newlyPublished).toEqual(['create-webview', 'create-webview-app']);
});

test('resume skips npm writes when every package version already exists', async () => {
  const harness = publicationHarness(publicationPlan.map(({ name }) => name));
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, harness.options);
  expect(harness.writes).toEqual([]);
  expect(result.reused).toEqual(publicationPlan.map(({ name }) => name));
  expect(result.newlyPublished).toEqual([]);
});

test('a failed partial release is safely recoverable with resume=true', async () => {
  const harness = publicationHarness([], publicationPlan[1].name);
  await expect(publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', false, harness.options)).rejects.toThrow(
    'rerun with resume=true',
  );
  expect(harness.writes).toEqual([publicationPlan[0].name]);
  const resumed = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, harness.options);
  expect(resumed.reused).toEqual([publicationPlan[0].name]);
  expect(harness.writes).toEqual(publicationPlan.map(({ name }) => name));
});

test('successful npm commands complete publication without waiting for registry visibility', async () => {
  let lookups = 0;
  const writes: string[] = [];
  const result = await publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', true, {
    lookup: async () => {
      lookups += 1;
      return null;
    },
    publishPackage: async ({ name }: { name: string }) => writes.push(name),
    log: () => {},
  });
  expect(result.newlyPublished).toEqual(publicationPlan.map(({ name }) => name));
  expect(writes).toEqual(publicationPlan.map(({ name }) => name));
  expect(lookups).toBe(publicationPlan.length);
});

test('failed native npm publication does not publish the primary or creator packages', async () => {
  const harness = publicationHarness([], publicationPlan[1].name);
  await expect(publishPackages(publicationPlan, '1.0.0-rc.3', 'rc', false, harness.options)).rejects.toThrow(
    'simulated npm publish failure',
  );
  expect(harness.writes).toEqual([publicationPlan[0].name]);
  expect(harness.published.has('@webviewjs/webview')).toBe(false);
  expect(harness.published.has('create-webview')).toBe(false);
});

test('resume registry scan logs existing and missing packages and normal mode remains fail-closed', async () => {
  const packages = publicationPlan.slice(0, 2);
  const logs: string[] = [];
  const options = {
    lookup: async (name: string, version: string) => (name === packages[0].name ? { name, version } : null),
    log: (message: string) => logs.push(message),
  };
  const state = await inspectRegistryState(packages, '1.0.0-rc.3', true, options);
  expect(state.existing).toEqual([packages[0].name]);
  expect(state.missing).toEqual([packages[1].name]);
  expect(logs.some((message) => message.includes('Found'))).toBe(true);
  expect(logs.some((message) => message.includes('Missing'))).toBe(true);
  await expect(inspectRegistryState(packages, '1.0.0-rc.3', false, options)).rejects.toThrow(
    'Refusing duplicate/partial release',
  );
});

test('all fifteen release packages include twelve native builds and three monorepo packages', async () => {
  const packages = await allPackages();
  expect(packages).toHaveLength(15);
  expect(packages.slice(-3).map(({ name }) => name)).toEqual([
    '@webviewjs/webview',
    'create-webview',
    'create-webview-app',
  ]);
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

test('Trusted Publishing needs no auth token and retains publish safety settings', () => {
  const env = {
    npm_config_tag: 'rc',
    npm_config_provenance: 'true',
    npm_config_ignore_scripts: 'true',
  };
  expect(env.NODE_AUTH_TOKEN).toBeUndefined();
  expect(() => validatePublishEnvironment('rc', env)).not.toThrow();
  for (const change of [
    { npm_config_tag: 'next' },
    { npm_config_provenance: 'false' },
    { npm_config_ignore_scripts: 'false' },
  ]) {
    expect(() => validatePublishEnvironment('rc', { ...env, ...change })).toThrow();
  }
});

test('workflow structure keeps all automatic events read-only and publishing manual', async () => {
  const { YAML } = await import('bun');
  const { readFileSync } = await import('node:fs');
  const workflow = (name: string) => YAML.parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')) as any;
  const ci = workflow('Validation');
  const build = workflow('Build');
  const release = workflow('CI');
  expect(release['run-name']).toBe('Publish ${{ inputs.version }} (npm tag: ${{ inputs.npm_tag }})');
  expect(Object.keys(ci.on).sort()).toEqual(['pull_request', 'push']);
  for (const event of ['push', 'pull_request']) expect(ci.on[event].branches).toEqual(['main', 'v[0-9]']);
  expect(ci.permissions).toEqual({ contents: 'read' });
  expect(build.permissions).toEqual({ contents: 'read' });
  expect(Object.keys(build.on)).toEqual(['workflow_call']);
  expect(ci.jobs.build.uses).toBe('./.github/workflows/Build.yml');
  expect(release.jobs.build.uses).toBe('./.github/workflows/Build.yml');
  expect(Object.keys(release.on)).toEqual(['workflow_dispatch']);
  expect(Object.keys(release.on.workflow_dispatch.inputs).sort()).toEqual(['npm_tag', 'resume', 'version']);
  expect(release.on.workflow_dispatch.inputs.version.description).toBe('Exact 1.x SemVer version to stamp and publish');
  expect(release.on.workflow_dispatch.inputs.npm_tag.default).toBe('next');
  expect(release.on.workflow_dispatch.inputs.npm_tag.options).toEqual(['latest', 'next', 'rc', 'beta']);
  expect(release.on.workflow_dispatch.inputs.resume).toEqual({
    description: 'Reuse exact package versions already published to npm',
    required: false,
    default: false,
    type: 'boolean',
  });
  expect(release.concurrency).toEqual({ group: 'npm-release', 'cancel-in-progress': false });
  expect(release.jobs.publish.environment).toBe('npm-release');
  expect(release.jobs.publish.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  expect(release.jobs.publish.env.RELEASE_RESUME).toBe('${{ inputs.resume }}');
  expect(
    release.jobs.validate.steps.find((step: any) => step.name === 'Validate branch, semver, and dist-tag').env
      .RELEASE_RESUME,
  ).toBe('${{ inputs.resume }}');
  expect(
    release.jobs.validate.steps.find((step: any) => step.name === 'Inspect npm registry state before building').env
      .RELEASE_RESUME,
  ).toBe('${{ inputs.resume }}');
  const setupNode = release.jobs.publish.steps.find((step: any) => step.uses === 'actions/setup-node@v4');
  expect(setupNode.with['node-version']).toBe(24);
  expect(setupNode.with).not.toHaveProperty('registry-url');
  expect(
    release.jobs.publish.steps.find((step: any) => step.name === 'Install npm CLI with Trusted Publishing support').run,
  ).toBe('npm install --global npm@11.21.0');
  expect(JSON.stringify(release)).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN/);
  expect(release.jobs.build.needs).toBe('validate');
  expect(release.jobs.build.with).toEqual({ version: '${{ inputs.version }}', npm_tag: '${{ inputs.npm_tag }}' });
  const publishingStep = release.jobs.publish.steps.at(-1);
  expect(publishingStep.env.npm_config_provenance).toBe('true');
  expect(publishingStep.env.npm_config_ignore_scripts).toBe('true');
  const githubRelease = release.jobs['github-release'];
  expect(githubRelease.needs).toBe('publish');
  expect(githubRelease.permissions).toEqual({ contents: 'write' });
  const releaseCheckout = githubRelease.steps.find((step: any) => step.uses === 'actions/checkout@v4');
  expect(releaseCheckout.with['fetch-depth']).toBe(0);
  const createRelease = githubRelease.steps.find(
    (step: any) => step.name === 'Create GitHub Release with native artifacts',
  );
  expect(createRelease.env.GH_TOKEN).toBe('${{ github.token }}');
  expect(createRelease.run).toContain('assets=(packages/webview/artifacts/bindings-*/*.node)');
  expect(createRelease.run).toContain('git merge-base --is-ancestor');
  expect(createRelease.run).toContain('gh release upload');
  expect(createRelease.run).toContain('release_options+=(--prerelease)');
  expect(createRelease.run).toContain('--target "$GITHUB_SHA"');
  expect(createRelease.run).toContain('gh release view "$release_tag" --json assets');
  for (const name of ['Validation', 'Build']) {
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
