import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const registry = 'https://registry.npmjs.org';
const tags = ['latest', 'next', 'rc', 'beta', 'v0'];
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
  for (const { name } of packages) {
    if (await lookup(name, version)) {
      throw new Error(
        `${name}@${version} already exists on npm. Refusing to republish; inspect any partial release before retrying.`,
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

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}).`);
}

export async function main(command) {
  const pkg = readPackage();
  const version = process.env.RELEASE_VERSION;
  const tag = process.env.RELEASE_TAG;
  validateRelease({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    version,
    tag,
    packageVersion: pkg.version,
  });
  if (command === 'validate') return;
  const plan = await packagePlan(pkg);
  const packages = [...plan, { name: pkg.name }];
  if (command === 'unpublished') return requireUnpublished(packages, version);
  if (command === 'artifacts') return requireArtifacts(plan, true);
  if (command === 'assembled') return requireArtifacts(plan, false);
  if (command !== 'publish') throw new Error(`Unknown release command: ${command}`);

  // if (!process.env.NODE_AUTH_TOKEN) throw new Error('NPM_TOKEN is required in the npm-release environment.');
  if (process.env.npm_config_tag !== tag || process.env.npm_config_provenance !== 'true') {
    throw new Error('Publishing requires the requested npm_config_tag and npm_config_provenance=true.');
  }
  requireArtifacts(plan, false);
  await requireUnpublished(packages, version);
  // Keep NAPI's version synchronization and optionalDependencies generation,
  // and its platform publishing, but disable GitHub release side effects.
  const { NapiCli } = await import('@napi-rs/cli');
  await new NapiCli().prePublish({ tagStyle: 'npm', ghRelease: false });
  for (const item of plan) {
    if (readPackage(`${item.path}/package.json`).version !== version)
      throw new Error(`Version mismatch in ${item.path}.`);
    if (readPackage().optionalDependencies?.[item.name] !== version)
      throw new Error(`Missing exact optional dependency: ${item.name}@${version}`);
    if (!(await registryVersion(item.name, version)))
      throw new Error(`Platform publish did not complete: ${item.name}@${version}`);
  }
  // prepublishOnly would publish all platform packages a second time.
  run('npm', ['publish', '--ignore-scripts', '--access', 'public', '--provenance', '--tag', tag]);
  for (const { name } of packages) {
    if (!(await registryVersion(name, version))) throw new Error(`Publication not visible: ${name}@${version}`);
    const response = await fetch(`${registry}/-/package/${encodeURIComponent(name)}/dist-tags`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Cannot verify npm dist-tags for ${name}: HTTP ${response.status}`);
    if ((await response.json())[tag] !== version)
      throw new Error(`npm tag verification failed: ${name}@${tag} must point to ${version}`);
    console.log(`Verified ${name}@${version} (${tag})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
