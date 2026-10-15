import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const registry = 'https://registry.npmjs.org';
const tags = ['latest', 'next', 'rc', 'beta', 'v0'];
const registryRetryDefaults = {
  maxDurationMs: 90_000,
  maxAttempts: 12,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};
// SemVer 2.0: numeric identifiers cannot have leading zeroes.
const numeric = '(?:0|[1-9][0-9]*)';
const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(
  `^0\\.${numeric}\\.${numeric}(?:-(${identifier}(?:\\.${identifier})*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`,
);

export function validateRelease({ event, ref, version, tag, packageVersion }) {
  if (event !== 'workflow_dispatch' || ref !== 'refs/heads/v0') {
    throw new Error('Release requires workflow_dispatch on the v0 branch.');
  }
  const match = typeof version === 'string' && semver.exec(version);
  if (!match) throw new Error('version must be an exact SemVer 2.0 version in the 0.x series.');
  if (version !== packageVersion) throw new Error(`Requested ${version}, but package.json contains ${packageVersion}.`);
  if (!tags.includes(tag)) throw new Error(`Unsupported npm tag: ${tag}`);
  if (match[1] && tag === 'latest') throw new Error('Prereleases cannot use the latest tag.');
}

function readPackage(path = 'package.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function packagePlan(pkg) {
  const { parseTriple } = await import('@napi-rs/cli');
  return pkg.napi.targets.map((target) => {
    const directory = parseTriple(target).platformArchABI;
    const path = `npm/${directory}`;
    const manifest = readPackage(`${path}/package.json`);
    if (manifest.name !== `${pkg.name}-${directory}`) throw new Error(`Unexpected package name in ${path}.`);
    return { target, path, name: manifest.name, binary: `${pkg.napi.binaryName}.${directory}.node` };
  });
}

function retryAfterMs(response) {
  const value = response.headers?.get('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function registryError(subject, status, attempts, elapsedMs, reason) {
  return new Error(
    `npm registry verification failed for ${subject}: ${reason} (HTTP ${status}; ${attempts} attempt(s); ${Math.round(elapsedMs)}ms elapsed).`,
  );
}

async function registryJson(url, subject, options = {}) {
  const {
    fetcher = globalThis.fetch,
    retryNotFound = false,
    retryIf,
    validate,
    maxDurationMs = registryRetryDefaults.maxDurationMs,
    maxAttempts = registryRetryDefaults.maxAttempts,
    baseDelayMs = registryRetryDefaults.baseDelayMs,
    maxDelayMs = registryRetryDefaults.maxDelayMs,
    sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)),
    now = () => performance.now(),
    log = console.warn,
    notFoundAtExhaustion = 'error',
  } = options;
  const startedAt = now();
  let attempts = 0;
  let lastStatus = 'no response';
  let lastReason = 'verification duration exceeded';
  let lastRetryAfter = null;

  while (attempts < maxAttempts) {
    const elapsedMs = now() - startedAt;
    const remainingMs = maxDurationMs - elapsedMs;
    if (remainingMs <= 0) break;

    attempts += 1;
    let response;
    let shouldRetry = false;
    try {
      response = await fetcher(url, {
        headers: { 'cache-control': 'no-cache, no-store' },
        signal: AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(30_000, remainingMs)))),
      });
    } catch (error) {
      lastStatus = 'network error';
      lastReason =
        error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'request timed out' : 'request failed';
      lastRetryAfter = null;
      shouldRetry = true;
    }

    if (response?.status === 404) {
      lastStatus = '404';
      lastReason = 'requested metadata is not visible yet';
      shouldRetry = retryNotFound;
      if (!retryNotFound) return null;
    } else if (response && !response.ok) {
      lastStatus = String(response.status);
      lastReason = `registry returned HTTP ${response.status}`;
      if (response.status === 429 || response.status >= 500) {
        shouldRetry = true;
        lastRetryAfter = retryAfterMs(response);
      } else {
        throw registryError(subject, lastStatus, attempts, now() - startedAt, lastReason);
      }
    } else if (response?.ok) {
      let body;
      try {
        body = await response.json();
      } catch {
        throw registryError(subject, String(response.status), attempts, now() - startedAt, 'invalid JSON response');
      }
      if (validate && !validate(body)) {
        throw registryError(
          subject,
          String(response.status),
          attempts,
          now() - startedAt,
          'unexpected registry metadata',
        );
      }
      if (!retryIf || retryIf(body)) return body;
      lastStatus = String(response.status);
      lastReason = 'requested registry metadata is not visible yet';
      shouldRetry = true;
      lastRetryAfter = null;
    }

    if (!shouldRetry) break;
    const elapsed = now() - startedAt;
    const remaining = maxDurationMs - elapsed;
    if (attempts >= maxAttempts || remaining <= 0) break;
    const backoffMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempts - 1));
    const delayMs = Math.min(remaining, Math.max(backoffMs, lastRetryAfter ?? 0));
    log(
      `Retrying npm registry verification for ${subject}: HTTP ${lastStatus}, attempt ${attempts}/${maxAttempts}, ${Math.round(elapsed)}ms elapsed.`,
    );
    await sleep(delayMs);
  }

  const elapsedMs = now() - startedAt;
  if (lastStatus === '404' && notFoundAtExhaustion === 'null') return null;
  throw registryError(subject, lastStatus, attempts, elapsedMs, lastReason);
}

export async function registryVersion(name, version, options = {}) {
  const manifest = await registryJson(
    `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    `${name}@${version}`,
    { ...options, validate: (body) => body?.name === name && body?.version === version },
  );
  if (!manifest) return null;
  return manifest;
}

export async function verifyDistTag(name, version, tag, options = {}) {
  await registryJson(`${registry}/-/package/${encodeURIComponent(name)}/dist-tags`, `${name}@${tag}=${version}`, {
    ...options,
    retryNotFound: true,
    retryIf: (distTags) => distTags?.[tag] === version,
  });
}

export async function requireUnpublished(packages, version, lookup = registryVersion) {
  for (const { name } of packages) {
    if (await lookup(name, version, { retryNotFound: false })) {
      throw new Error(
        `${name}@${version} already exists on npm. Refusing to republish; use resume=true after inspecting the partial release.`,
      );
    }
  }
}

export function requireArtifacts(plan, downloaded) {
  for (const item of plan) {
    const path = downloaded ? `artifacts/bindings-${item.target}/${item.binary}` : `${item.path}/${item.binary}`;
    let valid = false;
    try {
      const stat = statSync(path);
      valid = stat.isFile() && stat.size > 0;
    } catch {
      // Report the exact target and path instead of NAPI's silent skip.
    }
    if (!valid) throw new Error(`Missing or empty native artifact for ${item.target}: ${path}`);
  }
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}).`);
}

async function verifyPackage(item, version, tag, registryOptions = {}) {
  const manifest = await registryVersion(item.name, version, { ...registryOptions, retryNotFound: true });
  if (!manifest) throw new Error(`Publication not visible after retries: ${item.name}@${version}.`);
  await verifyDistTag(item.name, version, tag, registryOptions);
  console.log(`Verified ${item.name}@${version} (${tag})`);
}

async function registryState(packages, version, registryOptions = {}) {
  const entries = await Promise.all(
    packages.map(async (item) => {
      const manifest = await registryVersion(item.name, version, {
        ...registryOptions,
        // In a state scan, a 404 means this immutable version is missing. Retry 404s
        // only after our own publish operation, where the registry may still be
        // propagating newly published metadata.
        retryNotFound: false,
      });
      return [item.name, manifest];
    }),
  );
  return new Map(entries);
}

function publishArgs(tag) {
  return ['publish', '--ignore-scripts', '--access', 'public', '--provenance', '--tag', tag];
}

export async function main(command, { registryOptions = {} } = {}) {
  const pkg = readPackage();
  const version = process.env.RELEASE_VERSION;
  const tag = process.env.RELEASE_TAG;
  const resume = process.env.RELEASE_RESUME === 'true';
  const lookup = (name, requestedVersion, options = {}) =>
    registryVersion(name, requestedVersion, { ...registryOptions, ...options });
  validateRelease({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    version,
    tag,
    packageVersion: pkg.version,
  });
  if (command === 'validate') return;
  const plan = await packagePlan(pkg);
  const root = { name: pkg.name };
  const packages = [...plan, root];
  if (command === 'unpublished') {
    if (!resume) return requireUnpublished(packages, version, lookup);
    const state = await registryState(packages, version, registryOptions);
    const present = packages.filter(({ name }) => state.get(name)).map(({ name }) => name);
    const missing = packages.filter(({ name }) => !state.get(name)).map(({ name }) => name);
    console.log(`Resume registry scan for ${version}: ${present.length} already published, ${missing.length} missing.`);
    for (const name of present) console.log(`Found ${name}@${version}`);
    for (const name of missing) console.log(`Missing ${name}@${version}`);
    return;
  }
  if (command === 'artifacts') return requireArtifacts(plan, true);
  if (command === 'assembled') return requireArtifacts(plan, false);
  if (command !== 'publish') throw new Error(`Unknown release command: ${command}`);

  // npm trusted publishing may provide OIDC instead of NODE_AUTH_TOKEN.
  if (process.env.npm_config_tag !== tag || process.env.npm_config_provenance !== 'true') {
    throw new Error('Publishing requires the requested npm_config_tag and npm_config_provenance=true.');
  }
  requireArtifacts(plan, false);
  let existing = new Map();
  if (resume) {
    existing = await registryState(packages, version, registryOptions);
  } else {
    await requireUnpublished(packages, version, lookup);
  }

  // Keep NAPI's version synchronization and optionalDependencies generation,
  // but publish packages individually so resume never republishes existing versions.
  const { NapiCli } = await import('@napi-rs/cli');
  await new NapiCli().prePublish({ tagStyle: 'npm', ghRelease: false, skipOptionalPublish: true });
  for (const item of plan) {
    if (readPackage(`${item.path}/package.json`).version !== version) {
      throw new Error(`Version mismatch in ${item.path}.`);
    }
    if (readPackage().optionalDependencies?.[item.name] !== version) {
      throw new Error(`Missing exact optional dependency: ${item.name}@${version}`);
    }
  }

  const reused = [];
  const newlyPublished = [];

  // In resume mode, an exact package@version registry hit is enough to reuse it.
  // No npm install, tarball download, or signature audit is needed.
  if (resume) {
    for (const item of packages) {
      if (!existing.has(item.name)) continue;
      reused.push(item.name);
      console.log(`Reused existing package: ${item.name}@${version}`);
    }
  }

  for (const item of plan) {
    if (resume && existing.get(item.name)) continue;
    run('npm', publishArgs(tag), item.path);
    newlyPublished.push(item.name);
    console.log(`Published new package: ${item.name}@${version}`);
    await verifyPackage(item, version, tag, registryOptions);
  }

  // The root package is published last, after every platform package is visible and verified.
  if (!(resume && existing.get(root.name))) {
    run('npm', publishArgs(tag), '.');
    newlyPublished.push(root.name);
    console.log(`Published new package: ${root.name}@${version}`);
    await verifyPackage(root, version, tag, registryOptions);
  }

  console.log(`Reused existing packages: ${reused.length ? reused.join(', ') : '(none)'}`);
  console.log(`Published new packages: ${newlyPublished.length ? newlyPublished.join(', ') : '(none)'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
