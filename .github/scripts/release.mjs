import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

export const webview = 'packages/webview';
export const creator = 'packages/create-webview';
// NAPI belongs to this workspace, not the private monorepo root.
export const webviewRequire = createRequire(new URL('../../packages/webview/package.json', import.meta.url));
export const registry = 'https://registry.npmjs.org';
export const registryRetryDefaults = {
  maxDurationMs: 90_000,
  maxAttempts: 12,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};
const numeric = '(?:0|[1-9][0-9]*)';
const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(`^1\\.${numeric}\\.${numeric}(?:-(${identifier}(?:\\.${identifier})*))?$`);

export function validateRelease({ event, ref, version, tag, resume }) {
  if (event !== 'workflow_dispatch' || ref !== 'refs/heads/main') {
    throw new Error('Release requires workflow_dispatch on main.');
  }
  const match = typeof version === 'string' && semver.exec(version);
  if (!match || match[0] !== version)
    throw new Error('version must be exact 1.x SemVer without build metadata (npm does not preserve it).');
  if (!['latest', 'next', 'rc', 'beta'].includes(tag)) throw new Error(`Incompatible npm tag: ${tag}`);
  const prerelease = match[1];
  if (prerelease && tag === 'latest') throw new Error('Prereleases cannot use latest.');
  if (['rc', 'beta'].includes(tag) && prerelease?.split('.')[0] !== tag) {
    throw new Error(`${tag} requires a matching ${tag} prerelease; use next for other versions.`);
  }
  if (resume !== undefined && !['true', 'false'].includes(resume)) {
    throw new Error('resume must be true or false.');
  }
}

export function readPackage(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function writePackage(path, manifest) {
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
export function run(command, args, cwd = '.', capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}).`);
  return result.stdout?.trim();
}

export async function packagePlan() {
  const { parseTriple } = webviewRequire('@napi-rs/cli');
  const pkg = readPackage(`${webview}/package.json`);
  if (
    pkg.name !== '@webviewjs/webview' ||
    !readPackage('package.json').private ||
    (pkg.napi.npmClient && pkg.napi.npmClient !== 'npm')
  )
    throw new Error('Unexpected monorepo release configuration.');
  return pkg.napi.targets.map((target) => {
    const directory = parseTriple(target).platformArchABI;
    const path = `${webview}/npm/${directory}`;
    const manifest = readPackage(`${path}/package.json`);
    if (manifest.name !== `${pkg.name}-${directory}`) throw new Error(`Unexpected package name in ${path}.`);
    return { target, path, name: manifest.name, binary: `${pkg.napi.binaryName}.${directory}.node` };
  });
}
export async function allPackages() {
  return [
    ...(await packagePlan()),
    { name: '@webviewjs/webview' },
    { name: 'create-webview' },
    { name: 'create-webview-app' },
  ];
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
    `npm registry request failed for ${subject}: ${reason} (HTTP ${status}; ${attempts} attempt(s); ${Math.round(elapsedMs)}ms elapsed).`,
  );
}

async function registryJson(url, subject, options = {}) {
  const {
    fetcher = globalThis.fetch,
    validate,
    maxDurationMs = registryRetryDefaults.maxDurationMs,
    maxAttempts = registryRetryDefaults.maxAttempts,
    baseDelayMs = registryRetryDefaults.baseDelayMs,
    maxDelayMs = registryRetryDefaults.maxDelayMs,
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
    now = () => performance.now(),
    log = console.warn,
  } = options;
  const startedAt = now();
  let attempts = 0;
  let lastStatus = 'no response';
  let lastReason = 'request duration exceeded';
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

    if (response?.status === 404) return null;
    if (response && !response.ok) {
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
      return body;
    }

    if (!shouldRetry) break;
    const elapsed = now() - startedAt;
    const remaining = maxDurationMs - elapsed;
    if (attempts >= maxAttempts || remaining <= 0) break;
    const backoffMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempts - 1));
    const delayMs = Math.min(remaining, Math.max(backoffMs, lastRetryAfter ?? 0));
    log(
      `Retrying npm registry request for ${subject}: HTTP ${lastStatus}, attempt ${attempts}/${maxAttempts}, ${Math.round(elapsed)}ms elapsed.`,
    );
    await sleep(delayMs);
  }

  throw registryError(subject, lastStatus, attempts, now() - startedAt, lastReason);
}

export async function registryVersion(name, version, options = {}) {
  const manifest = await registryJson(
    `${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    `${name}@${version}`,
    { ...options, validate: (body) => body?.name === name && body?.version === version },
  );
  return manifest ?? null;
}

export async function registryPackage(name, version, options = {}) {
  const manifest = await registryVersion(name, version, options);
  if (manifest) return manifest;

  // A dist-tag can become visible before the exact version document propagates.
  const distTags = await registryJson(
    `${registry}/-/package/${encodeURIComponent(name)}/dist-tags`,
    `${name}@${version} dist-tags`,
    {
      ...options,
      validate: (body) =>
        body !== null &&
        typeof body === 'object' &&
        !Array.isArray(body) &&
        Object.values(body).every((tag) => typeof tag === 'string'),
    },
  );
  if (Object.values(distTags ?? {}).includes(version)) return { name, version };
  return null;
}

export async function registryState(packages, version, options = {}) {
  const entries = await Promise.all(
    packages.map(async ({ name }) => [name, await registryPackage(name, version, options)]),
  );
  return new Map(entries);
}

export async function inspectRegistryState(packages, version, resume = false, options = {}) {
  const { lookup = registryPackage, log = console.log, ...registryOptions } = options;
  const entries = await Promise.all(
    packages.map(async ({ name }) => [name, await lookup(name, version, registryOptions)]),
  );
  const state = new Map(entries);
  const existing = packages.filter(({ name }) => state.get(name)).map(({ name }) => name);
  const missing = packages.filter(({ name }) => !state.get(name)).map(({ name }) => name);
  if (existing.length && !resume) {
    throw new Error(
      `Version ${version} already exists for: ${existing.join(', ')}. Refusing duplicate/partial release; use resume=true after inspecting the registry state.`,
    );
  }
  if (resume) {
    log(`Resume registry scan for ${version}: ${existing.length} already published, ${missing.length} missing.`);
    for (const name of existing) log(`Found ${name}@${version}`);
    for (const name of missing) log(`Missing ${name}@${version}`);
  }
  return { state, existing, missing };
}

export function requireArtifacts(plan, downloaded) {
  for (const item of plan) {
    const path = downloaded
      ? `${webview}/artifacts/bindings-${item.target}/${item.binary}`
      : `${item.path}/${item.binary}`;
    let valid = false;
    try {
      const stat = statSync(path);
      valid = stat.isFile() && stat.size > 0;
    } catch {
      /* Report exact path below. */
    }
    if (!valid) throw new Error(`Missing or empty native artifact for ${item.target}: ${path}`);
  }
}
export async function setVersions(version) {
  for (const path of [webview, creator]) {
    const manifest = readPackage(`${path}/package.json`);
    manifest.version = version;
    writePackage(`${path}/package.json`, manifest);
  }
  // Preserve NAPI's platform manifest synchronization, without npm version's workspace lifecycle.
  run('bun', ['run', 'version'], webview);
  await verifyVersions(version);
}
export async function verifyVersions(version, optional = false) {
  const pkg = readPackage(`${webview}/package.json`);
  for (const { path } of [...(await packagePlan()), { path: webview }, { path: creator }]) {
    if (readPackage(`${path}/package.json`).version !== version) throw new Error(`Version mismatch in ${path}.`);
  }
  if (optional)
    for (const { name } of await packagePlan()) {
      if (pkg.optionalDependencies?.[name] !== version)
        throw new Error(`Missing exact platform dependency ${name}@${version}.`);
    }
}
export async function main(command) {
  const version = process.env.RELEASE_VERSION;
  const tag = process.env.RELEASE_TAG;
  const resume = process.env.RELEASE_RESUME ?? 'false';
  validateRelease({ event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, version, tag, resume });
  if (command === 'validate') return;
  if (command === 'version') return setVersions(version);
  if (command === 'unpublished') return inspectRegistryState(await allPackages(), version, resume === 'true');
  if (command === 'artifacts') return requireArtifacts(await packagePlan(), true);
  const { prepare, publish } = await import('./release-packages.mjs');
  if (command === 'prepare') return prepare(version);
  if (command === 'publish') return publish(version, tag, resume === 'true');
  throw new Error(`Unknown release command: ${command}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
