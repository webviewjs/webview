import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import {
  main,
  packagePlan,
  registryVersion,
  requireArtifacts,
  requireUnpublished,
  validateRelease,
  verifyDistTag,
} from './release.mjs';

const valid = {
  event: 'workflow_dispatch',
  ref: 'refs/heads/v0',
  version: '0.4.8',
  tag: 'v0',
  packageVersion: '0.4.8',
};
const fastRegistryOptions = {
  maxDurationMs: 100,
  maxAttempts: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  sleep: async () => {},
  log: () => {},
};

function packageIntegrity(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const files = new Set(['package.json']);
  const addFiles = (entry) => {
    const path = join(directory, entry);
    if (!existsSync(path)) return;
    const stat = statSync(path);
    if (stat.isFile()) {
      files.add(relative(directory, path).replaceAll('\\', '/'));
      return;
    }
    for (const child of readdirSync(path)) addFiles(join(entry, child));
  };
  for (const entry of manifest.files ?? []) addFiles(entry);
  const hash = createHash('sha512');
  for (const file of [...files].sort()) {
    hash.update(`${file}\0`);
    hash.update(readFileSync(join(directory, file)));
  }
  return `sha512-${hash.digest('base64')}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value));
}

function npmShimSource() {
  return [
    `#!${process.execPath}`,
    "const crypto = require('node:crypto');",
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    'const args = process.argv.slice(2);',
    'const command = args[0];',
    "const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));",
    'function addFiles(directory, entry, files) {',
    '  const target = path.join(directory, entry);',
    '  if (!fs.existsSync(target)) return;',
    '  const stat = fs.statSync(target);',
    "  if (stat.isFile()) { files.add(path.relative(directory, target).split(path.sep).join('/')); return; }",
    '  for (const child of fs.readdirSync(target)) addFiles(directory, path.join(entry, child), files);',
    '}',
    'function integrity(directory) {',
    "  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));",
    "  const files = new Set(['package.json']);",
    '  for (const entry of pkg.files || []) addFiles(directory, entry, files);',
    "  const hash = crypto.createHash('sha512');",
    '  for (const file of [...files].sort()) { hash.update(file + String.fromCharCode(0)); hash.update(fs.readFileSync(path.join(directory, file))); }',
    "  return 'sha512-' + hash.digest('base64');",
    '}',
    "if (command === 'pack') { process.stdout.write(JSON.stringify({ [manifest.name]: { integrity: integrity(process.cwd()) } })); process.exit(0); }",
    "if (command !== 'publish') { console.error('unexpected npm command: ' + command); process.exit(2); }",
    "if (process.env.FAKE_NPM_FAIL === manifest.name) { console.error('simulated npm publish failure'); process.exit(1); }",
    'const statePath = process.env.FAKE_NPM_STATE;',
    "const entries = JSON.parse(fs.readFileSync(statePath, 'utf8'));",
    "if (entries.some((entry) => entry.name === manifest.name && entry.version === manifest.version)) { console.error('attempted immutable republish'); process.exit(1); }",
    "if (manifest.name === '@webviewjs/webview') {",
    "  const events = JSON.parse(fs.readFileSync(process.env.FAKE_NPM_EVENTS, 'utf8'));",
    "  const verified = new Set(events.filter((event) => event.type === 'verified-platform').map((event) => event.name));",
    "  if (verified.size !== Number(process.env.FAKE_PLATFORM_COUNT)) { console.error('root published before all platform versions were verified'); process.exit(3); }",
    '}',
    'const entry = { name: manifest.name, version: manifest.version, tag: process.env.npm_config_tag, provenance: process.env.npm_config_provenance, integrity: integrity(process.cwd()), manifest, args };',
    'entries.push(entry);',
    'fs.writeFileSync(statePath, JSON.stringify(entries));',
    "const events = JSON.parse(fs.readFileSync(process.env.FAKE_NPM_EVENTS, 'utf8'));",
    "events.push({ type: 'publish', name: manifest.name });",
    'fs.writeFileSync(process.env.FAKE_NPM_EVENTS, JSON.stringify(events));',
    "console.log('+ ' + manifest.name + '@' + manifest.version);",
  ].join('\n');
}

async function createFixture(
  t,
  { tag = 'latest', resume = false, existingNames = [], invalidExisting, failName } = {},
) {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const directory = mkdtempSync(join(tmpdir(), 'webview-release-'));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = ['beta', 'rc'].includes(tag) ? `0.5.0-${tag}.1` : '0.4.8';
  const plan = await packagePlan(pkg);
  const root = { name: pkg.name };
  const packages = [...plan, root];
  const statePath = join(directory, 'published.json');
  const eventsPath = join(directory, 'events.json');
  const bin = join(directory, 'bin');

  t.after(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  });

  pkg.version = version;
  writeJson(join(directory, 'package.json'), pkg);
  for (const item of plan) {
    mkdirSync(join(directory, item.path), { recursive: true });
    copyFileSync(join(item.path, 'package.json'), join(directory, item.path, 'package.json'));
    const artifact = join(directory, 'artifacts', `bindings-${item.target}`);
    mkdirSync(artifact, { recursive: true });
    writeFileSync(join(artifact, item.binary), `fake native artifact for ${item.target}`);
  }

  mkdirSync(bin);
  const npm = join(bin, 'npm');
  writeFileSync(npm, npmShimSource());
  chmodSync(npm, 0o755);
  writeJson(statePath, []);
  writeJson(eventsPath, []);
  process.env = {
    ...originalEnv,
    PATH: `${bin}:${originalEnv.PATH ?? ''}`,
    RELEASE_VERSION: version,
    RELEASE_TAG: tag,
    RELEASE_RESUME: String(resume),
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/v0',
    FAKE_NPM_STATE: statePath,
    FAKE_NPM_EVENTS: eventsPath,
    FAKE_PLATFORM_COUNT: String(plan.length),
    npm_config_tag: tag,
    npm_config_provenance: 'true',
    npm_config_access: 'public',
  };
  delete process.env.NODE_AUTH_TOKEN;
  if (failName) process.env.FAKE_NPM_FAIL = failName;
  process.chdir(directory);

  const { NapiCli } = await import('@napi-rs/cli');
  await new NapiCli().artifacts({});
  // Preparation synchronizes versions and optionalDependencies without publishing.
  await new NapiCli().prePublish({ tagStyle: 'npm', ghRelease: false, skipOptionalPublish: true });

  for (const name of existingNames) {
    const item = packages.find((candidate) => candidate.name === name);
    assert.ok(item, `unknown seed package: ${name}`);
    const path = item.path || '.';
    const manifest = readJson(join(path, 'package.json'));
    const entry = {
      name,
      version,
      tag,
      integrity: packageIntegrity(path),
      manifest,
    };
    if (invalidExisting?.name === name) {
      if (invalidExisting.kind === 'contents') entry.integrity = 'sha512-invalid-content';
      if (invalidExisting.kind === 'platform') entry.manifest.cpu = ['wrong-architecture'];
      if (invalidExisting.kind === 'identity') entry.manifest.name = '@webviewjs/other-package';
      if (invalidExisting.kind === 'root-dependencies') delete entry.manifest.optionalDependencies[plan[0].name];
      if (invalidExisting.kind === 'tag') entry.tag = 'v0';
    }
    const state = readJson(statePath);
    state.push(entry);
    writeJson(statePath, state);
  }

  globalThis.fetch = async (input) => {
    const pathname = new URL(input).pathname;
    const entries = readJson(statePath);
    if (pathname.startsWith('/-/package/')) {
      const name = decodeURIComponent(pathname.slice('/-/package/'.length, -'/dist-tags'.length));
      const entry = entries.find((candidate) => candidate.name === name);
      const distTags = entry ? { [entry.tag]: entry.version } : {};
      if (entry && distTags[tag] === version) {
        const events = readJson(eventsPath);
        events.push({ type: name === root.name ? 'verified-root' : 'verified-platform', name });
        writeJson(eventsPath, events);
      }
      return Response.json(distTags);
    }
    const lastSlash = pathname.lastIndexOf('/');
    const name = decodeURIComponent(pathname.slice(1, lastSlash));
    const requestedVersion = decodeURIComponent(pathname.slice(lastSlash + 1));
    const entry = entries.find((candidate) => candidate.name === name && candidate.version === requestedVersion);
    return entry
      ? Response.json({ ...entry.manifest, dist: { integrity: entry.integrity } })
      : new Response('', { status: 404 });
  };

  requireArtifacts(plan, true);
  requireArtifacts(plan, false);
  return { directory, plan, packages, root, version, tag, statePath, eventsPath };
}

function shortRetryOptions(fetcher, overrides = {}) {
  let elapsed = 0;
  return {
    fetcher,
    maxDurationMs: 100,
    maxAttempts: 6,
    baseDelayMs: 1,
    maxDelayMs: 4,
    sleep: async (ms) => {
      elapsed += ms;
    },
    now: () => elapsed,
    log: () => {},
    ...overrides,
  };
}

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

test('registry metadata appearing after several HTTP 404 responses is eventually visible', async () => {
  let calls = 0;
  const logs = [];
  const manifest = { name: 'pkg', version: '0.4.8' };
  const result = await registryVersion(
    'pkg',
    '0.4.8',
    shortRetryOptions(
      async () => {
        calls += 1;
        return calls < 4 ? new Response('', { status: 404 }) : Response.json(manifest);
      },
      { retryNotFound: true, log: (message) => logs.push(message) },
    ),
  );
  assert.deepEqual(result, manifest);
  assert.equal(calls, 4);
  assert.equal(logs.length, 3);
  assert.match(logs[0], /pkg@0\.4\.8: HTTP 404, attempt 1\/6, 0ms elapsed/);
  assert.match(logs[1], /attempt 2\/6, 1ms elapsed/);
  assert.match(logs[2], /attempt 3\/6, 3ms elapsed/);
});

test('registry verification retries are bounded and report exhaustion diagnostics', async () => {
  let calls = 0;
  await assert.rejects(
    registryVersion(
      'pkg',
      '0.4.8',
      shortRetryOptions(
        async () => {
          calls += 1;
          return new Response('', { status: 404 });
        },
        { retryNotFound: true, maxAttempts: 3 },
      ),
    ),
    /pkg@0\.4\.8: requested metadata is not visible yet \(HTTP 404; 3 attempt\(s\); 3ms elapsed\)/,
  );
  assert.equal(calls, 3);
});

test('registry verification retries HTTP 429 and 5xx but fails permanent errors immediately', async () => {
  const statuses = [429, 503];
  let calls = 0;
  const manifest = { name: 'pkg', version: '0.4.8' };
  const result = await registryVersion(
    'pkg',
    '0.4.8',
    shortRetryOptions(async () => {
      const status = statuses[calls++];
      return status ? new Response('', { status }) : Response.json(manifest);
    }),
  );
  assert.deepEqual(result, manifest);
  assert.equal(calls, 3);

  calls = 0;
  const recovered = await registryVersion(
    'pkg',
    '0.4.8',
    shortRetryOptions(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('temporary network error');
      return Response.json(manifest);
    }),
  );
  assert.deepEqual(recovered, manifest);
  assert.equal(calls, 2);

  calls = 0;
  await assert.rejects(
    registryVersion(
      'pkg',
      '0.4.8',
      shortRetryOptions(async () => {
        calls += 1;
        return new Response('', { status: 401 });
      }),
    ),
    /HTTP 401; 1 attempt\(s\)/,
  );
  assert.equal(calls, 1);
});

test('dist-tag verification retries a visible package until the requested tag propagates', async () => {
  let calls = 0;
  await verifyDistTag(
    '@scope/pkg',
    '0.4.8',
    'latest',
    shortRetryOptions(async () => {
      calls += 1;
      return Response.json(calls < 3 ? { latest: '0.4.7' } : { latest: '0.4.8' });
    }),
  );
  assert.equal(calls, 3);
});

test('npm lookups preserve the normal already-published safeguard', async () => {
  assert.equal(await registryVersion('pkg', '0.4.8', { fetcher: async () => new Response('', { status: 404 }) }), null);
  await assert.rejects(
    requireUnpublished([{ name: 'already-published' }], '0.4.8', async () => ({})),
    /already exists/,
  );
});

test('resume state scan treats an expected 404 as missing without verification retries', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: plan.map((item) => item.name),
  });
  const mockFetch = globalThis.fetch;
  let rootLookups = 0;
  globalThis.fetch = async (input, options) => {
    const pathname = new URL(input).pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const name = decodeURIComponent(pathname.slice(1, lastSlash));
    if (!pathname.includes('/-/package/') && name === fixture.root.name) {
      rootLookups += 1;
      return new Response('', { status: 404 });
    }
    return mockFetch(input, options);
  };

  const messages = [];
  const originalLog = console.log;
  console.log = (message) => messages.push(String(message));
  try {
    await main('unpublished', { registryOptions: shortRetryOptions(globalThis.fetch) });
  } finally {
    console.log = originalLog;
  }

  assert.equal(rootLookups, 1);
  assert.ok(messages.some((message) => message.includes('Missing @webviewjs/webview@0.4.8')));
});

test('missing assembled artifacts abort before any package publication', async (t) => {
  const fixture = await createFixture(t, { tag: 'latest' });
  const item = fixture.plan[0];
  rmSync(join(fixture.directory, item.path, item.binary), { force: true });
  assert.throws(() => requireArtifacts(fixture.plan, false), /Missing or empty/);
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /Missing or empty/);
  assert.equal(readJson(fixture.statePath).length, 0);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

for (const tag of ['latest', 'next', 'rc', 'beta', 'v0']) {
  test(`normal release publishes all packages with ${tag}, exact versions, tags, and provenance`, async (t) => {
    const fixture = await createFixture(t, { tag });
    await main('publish', { registryOptions: fastRegistryOptions });
    const published = readJson(fixture.statePath);
    assert.equal(published.length, 13);
    assert.deepEqual(
      new Set(published.map((item) => item.name)),
      new Set([...fixture.plan.map((item) => item.name), fixture.root.name]),
    );
    for (const item of published) {
      assert.equal(item.version, fixture.version);
      assert.equal(item.tag, tag);
      assert.equal(item.provenance, 'true');
      assert.ok(item.args.includes('--provenance'));
      assert.deepEqual(item.args.slice(-2), ['--tag', tag]);
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
    assert.equal(published.at(-1).manifest.optionalDependencies[fixture.plan[0].name], fixture.version);
    assert.equal(Object.hasOwn(process.env, 'NODE_AUTH_TOKEN'), false, 'OIDC publishing must not require a token');

    const events = readJson(fixture.eventsPath);
    const rootPublishIndex = events.findIndex((event) => event.type === 'publish' && event.name === fixture.root.name);
    assert.notEqual(rootPublishIndex, -1);
    assert.equal(
      new Set(
        events
          .slice(0, rootPublishIndex)
          .filter((event) => event.type === 'verified-platform')
          .map((event) => event.name),
      ).size,
      fixture.plan.length,
      'root publish follows verification of every platform package',
    );
    await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /already exists/);
    assert.equal(readJson(fixture.statePath).length, 13, 'retry must not invoke npm again');
  });
}

test('normal release rejects an existing version before invoking npm', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, { tag: 'latest', existingNames: [plan[0].name] });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /already exists/);
  assert.equal(readJson(fixture.statePath).length, 1);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('resume publishes only missing platforms and the root after verifying reused packages', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const existingNames = plan.slice(0, 3).map((item) => item.name);
  const fixture = await createFixture(t, { tag: 'latest', resume: true, existingNames });
  await main('publish', { registryOptions: fastRegistryOptions });
  const published = readJson(fixture.statePath);
  assert.equal(published.length, 13);
  assert.equal(published.filter((item) => existingNames.includes(item.name)).length, 3);
  assert.equal(published.filter((item) => !existingNames.includes(item.name)).length, 10);
  const finalEvents = readJson(fixture.eventsPath);
  const rootPublishIndex = finalEvents.findIndex(
    (event) => event.type === 'publish' && event.name === fixture.root.name,
  );
  assert.equal(
    new Set(
      finalEvents
        .slice(0, rootPublishIndex)
        .filter((event) => event.type === 'verified-platform')
        .map((event) => event.name),
    ).size,
    plan.length,
  );
});

test('resume of the actual 0.4.8 state reuses all twelve platform packages and publishes only root', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: plan.map((item) => item.name),
  });
  await main('publish', { registryOptions: fastRegistryOptions });
  assert.equal(readJson(fixture.statePath).length, 13);
  const published = readJson(fixture.eventsPath).filter((event) => event.type === 'publish');
  assert.deepEqual(
    published.map((item) => item.name),
    [fixture.root.name],
  );
});

test('resume rejects existing packages whose contents or platform metadata do not match', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: [plan[0].name],
    invalidExisting: { name: plan[0].name, kind: 'contents' },
  });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /contents do not match/);
  assert.equal(readJson(fixture.statePath).length, 1, 'no missing package is published after invalid state');
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('resume rejects platform metadata mismatches before publishing missing packages', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: [plan[0].name],
    invalidExisting: { name: plan[0].name, kind: 'platform' },
  });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /platform metadata mismatch/);
  assert.equal(readJson(fixture.statePath).length, 1);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('resume rejects an existing package with the wrong registry identity', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: [plan[0].name],
    invalidExisting: { name: plan[0].name, kind: 'identity' },
  });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /unexpected registry metadata/);
  assert.equal(readJson(fixture.statePath).length, 1);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('resume rejects an existing root package with incomplete optionalDependencies', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: [pkg.name],
    invalidExisting: { name: pkg.name, kind: 'root-dependencies' },
  });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /missing .*optionalDependencies/);
  assert.equal(readJson(fixture.statePath).length, 1);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('resume rejects an existing package whose requested dist-tag does not match', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, {
    tag: 'latest',
    resume: true,
    existingNames: [plan[0].name],
    invalidExisting: { name: plan[0].name, kind: 'tag' },
  });
  await assert.rejects(
    main('publish', { registryOptions: fastRegistryOptions }),
    /requested registry metadata is not visible/,
  );
  assert.equal(readJson(fixture.statePath).length, 1);
  assert.equal(
    readJson(fixture.eventsPath).some((event) => event.type === 'publish'),
    false,
  );
});

test('failed npm publication propagates and does not mark the release complete', async (t) => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const plan = await packagePlan(pkg);
  const fixture = await createFixture(t, { tag: 'latest', failName: plan[1].name });
  await assert.rejects(main('publish', { registryOptions: fastRegistryOptions }), /failed \(exit 1\)/);
  const published = readJson(fixture.statePath);
  assert.deepEqual(
    published.map((item) => item.name),
    [plan[0].name],
  );
  assert.equal(
    published.some((item) => item.name === fixture.root.name),
    false,
  );
});
