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
const numeric = '(?:0|[1-9][0-9]*)';
const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(`^1\\.${numeric}\\.${numeric}(?:-(${identifier}(?:\\.${identifier})*))?$`);

export function validateRelease({ event, ref, version, tag }) {
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

export async function registryVersion(name, version, fetcher = fetch) {
  const response = await fetcher(`${registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm lookup failed for ${name}@${version}: HTTP ${response.status}`);
  const manifest = await response.json();
  if (manifest.name !== name || manifest.version !== version)
    throw new Error(`Unexpected npm response for ${name}@${version}.`);
  return manifest;
}
export async function requireUnpublished(packages, version, lookup = registryVersion) {
  const existing = [];
  for (const { name } of packages) {
    if (await lookup(name, version)) existing.push(name);
  }
  if (existing.length)
    throw new Error(
      `Version ${version} already exists for: ${existing.join(', ')}. Refusing duplicate/partial release. Inspect registry state and recover manually; this workflow never silently skips packages.`,
    );
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
export async function verifyPublished(packages, version, tag, fetcher = fetch) {
  for (const { name } of packages) {
    // Registry propagation can lag a successful publish. Retry reads only, never publication.
    let verified = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const manifest = await registryVersion(name, version, fetcher);
      const response = await fetcher(`${registry}/-/package/${encodeURIComponent(name)}/dist-tags`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`npm dist-tag lookup failed for ${name}: HTTP ${response.status}`);
      if (manifest && (await response.json())[tag] === version) {
        verified = true;
        break;
      }
      if (attempt < 5) await new Promise((done) => setTimeout(done, 5000));
    }
    if (!verified)
      throw new Error(
        `Publication/tag verification failed: ${name}@${version} (${tag}). Inspect partial release manually.`,
      );
    console.log(`Verified ${name}@${version} (${tag})`);
  }
}

export async function main(command) {
  const version = process.env.RELEASE_VERSION;
  const tag = process.env.RELEASE_TAG;
  validateRelease({ event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, version, tag });
  if (command === 'validate') return;
  if (command === 'version') return setVersions(version);
  if (command === 'unpublished') return requireUnpublished(await allPackages(), version);
  if (command === 'artifacts') return requireArtifacts(await packagePlan(), true);
  const { prepare, publish } = await import('./release-packages.mjs');
  if (command === 'prepare') return prepare(version);
  if (command === 'publish') return publish(version, tag);
  throw new Error(`Unknown release command: ${command}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
