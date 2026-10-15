import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  main,
  packagePlan,
  registryVersion,
  requireArtifacts,
  requireUnpublished,
  validateRelease,
} from './release.mjs';

const valid = {
  event: 'workflow_dispatch',
  ref: 'refs/heads/v0',
  version: '0.4.8',
  tag: 'v0',
  packageVersion: '0.4.8',
};

test('release accepts every supported dist-tag and valid 0.x versions', () => {
  for (const tag of ['latest', 'next', 'rc', 'beta', 'v0']) validateRelease({ ...valid, tag });
  for (const version of ['0.0.0', '0.5.0-beta.1', '0.5.0-rc.0+build.1', '0.4.8+build']) {
    validateRelease({ ...valid, version, packageVersion: version });
  }
});

test('release rejects automatic events, other refs, invalid semver, mismatches, and unsafe tags', () => {
  for (const event of ['push', 'pull_request', 'workflow_call'])
    assert.throws(() => validateRelease({ ...valid, event }));
  for (const ref of ['refs/heads/main', 'refs/heads/v1', 'refs/tags/v0'])
    assert.throws(() => validateRelease({ ...valid, ref }));
  for (const version of [
    '1.0.0',
    'v0.4.8',
    '0.04.8',
    '0.4.08',
    '0.4.8-01',
    '0.4.8-',
    '0.4.8\n',
    '0.4.8; echo unsafe',
  ]) {
    assert.throws(() => validateRelease({ ...valid, version, packageVersion: version }));
  }
  assert.throws(() => validateRelease({ ...valid, packageVersion: '0.4.7' }), /package.json/);
  assert.throws(() => validateRelease({ ...valid, tag: 'unknown' }), /Unsupported/);
  assert.throws(
    () => validateRelease({ ...valid, version: '0.5.0-beta.1', packageVersion: '0.5.0-beta.1', tag: 'latest' }),
    /Prereleases/,
  );
});

test('npm lookups only treat HTTP 404 as an unpublished version', async () => {
  assert.equal(await registryVersion('pkg', '0.4.8', async () => new Response('', { status: 404 })), null);
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(
      registryVersion('pkg', '0.4.8', async () => new Response('', { status })),
      /npm lookup failed/,
    );
  }
  await assert.rejects(
    registryVersion('pkg', '0.4.8', async () => Response.json({ name: 'wrong', version: '0.4.8' })),
    /Unexpected/,
  );
  await assert.rejects(
    requireUnpublished([{ name: 'already-published' }], '0.4.8', async () => ({})),
    /already exists/,
  );
});

for (const tag of ['latest', 'next', 'rc', 'beta', 'v0']) {
  test(`NAPI assembles and publishes all 13 packages with ${tag}, exact versions, and provenance using fake npm`, async (t) => {
    const originalCwd = process.cwd();
    const originalEnv = { ...process.env };
    const originalFetch = globalThis.fetch;
    const directory = mkdtempSync(join(tmpdir(), 'webview-release-'));
    t.after(() => {
      process.chdir(originalCwd);
      process.env = originalEnv;
      globalThis.fetch = originalFetch;
      rmSync(directory, { recursive: true, force: true });
    });
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const plan = await packagePlan(pkg);
    assert.equal(plan.length, 12);
    pkg.version = tag === 'latest' || tag === 'v0' ? '0.4.8' : `0.5.0-${tag}.1`;
    writeFileSync(join(directory, 'package.json'), JSON.stringify(pkg));
    for (const item of plan) {
      mkdirSync(join(directory, item.path), { recursive: true });
      copyFileSync(`${item.path}/package.json`, join(directory, item.path, 'package.json'));
      const artifact = join(directory, 'artifacts', `bindings-${item.target}`);
      mkdirSync(artifact, { recursive: true });
      writeFileSync(join(artifact, item.binary), 'fake native artifact');
    }
    const state = join(directory, 'published.json');
    writeFileSync(state, '[]');
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    const npm = join(bin, 'npm');
    writeFileSync(
      npm,
      `#!${process.execPath}
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
const state = process.env.FAKE_NPM_STATE;
const entries = JSON.parse(fs.readFileSync(state));
if (process.env.FAKE_NPM_FAIL === pkg.name) { console.error('simulated npm failure'); process.exit(1); }
entries.push({name: pkg.name, version: pkg.version, tag: process.env.npm_config_tag, provenance: process.env.npm_config_provenance, args: process.argv.slice(2)});
fs.writeFileSync(state, JSON.stringify(entries));
`,
    );
    chmodSync(npm, 0o755);
    Object.assign(process.env, {
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_NPM_STATE: state,
      RELEASE_VERSION: pkg.version,
      RELEASE_TAG: tag,
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_REF: 'refs/heads/v0',
      NODE_AUTH_TOKEN: 'fake-token-never-sent',
      npm_config_tag: tag,
      npm_config_provenance: 'true',
    });
    globalThis.fetch = async (url) => {
      const entries = JSON.parse(readFileSync(state));
      const pathname = new URL(url).pathname;
      if (pathname.startsWith('/-/package/')) {
        const name = decodeURIComponent(pathname.slice('/-/package/'.length, -'/dist-tags'.length));
        return Response.json({ [tag]: entries.find((entry) => entry.name === name)?.version });
      }
      const [name, version] = pathname.slice(1).split('/').map(decodeURIComponent);
      const entry = entries.find((entry) => entry.name === name && entry.version === version);
      return entry ? Response.json(entry) : new Response('', { status: 404 });
    };
    process.chdir(directory);
    requireArtifacts(plan, true);
    const { NapiCli } = await import('@napi-rs/cli');
    await new NapiCli().artifacts({});
    requireArtifacts(plan, false);
    rmSync(join(directory, plan[0].path, plan[0].binary));
    assert.throws(() => requireArtifacts(plan, false), /Missing or empty/);
    await assert.rejects(main('publish'), /Missing or empty/);
    assert.equal(JSON.parse(readFileSync(state)).length, 0);
    writeFileSync(join(directory, plan[0].path, plan[0].binary), 'fake native artifact');
    if (tag === 'beta') {
      process.env.FAKE_NPM_FAIL = plan[0].name;
      await assert.rejects(main('publish'), /simulated npm failure/);
      assert.equal(JSON.parse(readFileSync(state)).length, 0);
      delete process.env.FAKE_NPM_FAIL;
    }
    await main('publish');
    const published = JSON.parse(readFileSync(state));
    assert.equal(published.length, 13);
    assert.deepEqual(
      new Set(published.map((item) => item.name)),
      new Set([...plan.map((item) => item.name), pkg.name]),
    );
    for (const item of published) {
      assert.equal(item.version, pkg.version);
      assert.equal(item.tag, tag);
      assert.equal(item.provenance, 'true');
    }
    assert.deepEqual(published.at(-1).args, [
      'publish',
      '--ignore-scripts',
      '--access',
      'public',
      '--provenance',
      '--tag',
      tag,
    ]);
    await assert.rejects(main('publish'), /already exists/);
    assert.equal(JSON.parse(readFileSync(state)).length, 13, 'retry must not invoke npm again');
  });
}
