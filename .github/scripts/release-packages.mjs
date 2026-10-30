import { cpSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import {
  webview,
  webviewRequire,
  creator,
  readPackage,
  writePackage,
  run,
  packagePlan,
  allPackages,
  requireArtifacts,
  verifyVersions,
  requireUnpublished,
  verifyPublished,
} from './release.mjs';

// Use npm's own SemVer implementation, already installed as a NAPI CLI dependency.
const napiRequire = createRequire(webviewRequire.resolve('@napi-rs/cli'));
const { validRange } = napiRequire('semver');
const output = '.release';
export function validateManifest(pkg, name, version) {
  if (pkg.name !== name || pkg.version !== version || pkg.private)
    throw new Error(`Unexpected publish identity: ${pkg.name}@${pkg.version}`);
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']) {
    for (const [dependency, range] of Object.entries(pkg[section] ?? {})) {
      if (typeof range !== 'string' || !validRange(range)) {
        throw new Error(`Non-registry semver dependency ${section}.${dependency}: ${range}`);
      }
    }
  }
  if (
    pkg.publishConfig?.tag ||
    pkg.publishConfig?.provenance === false ||
    (pkg.publishConfig?.registry && pkg.publishConfig.registry.replace(/\/$/, '') !== 'https://registry.npmjs.org')
  ) {
    throw new Error(`Unsafe publishConfig for ${name}.`);
  }
}
export function inspectTarball(path, name, version, required = []) {
  const manifest = JSON.parse(run('tar', ['-xOf', path, 'package/package.json'], '.', true));
  validateManifest(manifest, name, version);
  const files = new Set(
    run('tar', ['-tzf', path], '.', true)
      .split('\n')
      .map((file) => file.replace(/^\.\//, '')),
  );
  for (const file of required) if (!files.has(`package/${file}`)) throw new Error(`Missing ${file} in ${path}.`);
  return manifest;
}
export function packWorkspace(path, destination) {
  // --quiet returns Bun's actual output filename; never guess scoped-package filenames.
  const filename = run(
    'bun',
    ['pm', 'pack', '--ignore-scripts', '--quiet', '--destination', resolve(destination)],
    path,
    true,
  );
  const tarball = resolve(path, filename);
  if (!existsSync(tarball)) throw new Error(`Bun did not produce the reported tarball: ${tarball}`);
  return tarball;
}
export function validatePublishEnvironment(tag, env = process.env) {
  if (env.npm_config_tag !== tag || env.npm_config_provenance !== 'true' || env.npm_config_ignore_scripts !== 'true') {
    throw new Error('NAPI publishing requires explicit tag, provenance, and ignore-scripts settings.');
  }
}
export function stageCreator(source, destination, name, version) {
  mkdirSync(destination, { recursive: true });
  for (const file of ['package.json', 'README.md', 'LICENSE', 'dist'])
    cpSync(join(source, file), join(destination, file), { recursive: true });
  const manifest = readPackage(join(destination, 'package.json'));
  manifest.name = name;
  manifest.version = version;
  for (const alias of ['create-webview', 'create-webview-app']) {
    if (manifest.bin?.[alias] !== './dist/index.js') throw new Error(`Missing creator CLI alias ${alias}.`);
  }
  validateManifest(manifest, name, version);
  writePackage(join(destination, 'package.json'), manifest);
}
export async function prepare(version) {
  if (existsSync(output)) throw new Error('Remove stale .release staging before preparing another release.');
  mkdirSync(output);
  requireArtifacts(await packagePlan(), true);
  run('bun', ['run', 'artifacts'], webview);
  requireArtifacts(await packagePlan(), false);
  run('bun', ['run', 'build:lib'], webview);
  run('bun', ['--filter', 'create-webview', 'build']);
  const { NapiCli } = webviewRequire('@napi-rs/cli');
  // Prepare NAPI's versions/dependencies without publishing yet, so every tarball
  // and creator stage can be validated before the first irreversible npm write.
  await new NapiCli().prePublish({
    cwd: resolve(webview),
    tagStyle: 'npm',
    ghRelease: false,
    skipOptionalPublish: true,
  });
  await verifyVersions(version, true);
  for (const item of await packagePlan()) {
    const manifest = readPackage(`${item.path}/package.json`);
    validateManifest(manifest, item.name, version);
    if (manifest.main !== item.binary) throw new Error(`Unexpected platform entry point: ${item.name}`);
    const result = JSON.parse(run('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], item.path, true));
    const packed = Array.isArray(result) ? result[0] : result[item.name];
    if (!packed?.files.some((file) => file.path === item.binary))
      throw new Error(`Native binary excluded from ${item.name}.`);
  }
  const tarballs = [];
  const path = packWorkspace(webview, output);
  const packed = inspectTarball(path, '@webviewjs/webview', version, [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/cli/index.js',
    'cli/index.mjs',
    'js-bindings.js',
    'js-bindings.d.ts',
    'README.md',
    'LICENSE',
  ]);
  for (const { name } of await packagePlan())
    if (packed.optionalDependencies?.[name] !== version)
      throw new Error(`Packed platform dependency mismatch: ${name}`);
  tarballs.push({ name: packed.name, path });
  const staging = mkdtempSync(join(tmpdir(), 'webview-creators-'));
  try {
    for (const name of ['create-webview', 'create-webview-app']) {
      const stage = join(staging, name);
      stageCreator(creator, stage, name, version);
      // Staging is outside Bun's workspace and already normalized; retain npm packing.
      const result = JSON.parse(
        run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', resolve(output)], stage, true),
      );
      const path = resolve(output, (Array.isArray(result) ? result[0] : result[name]).filename);
      inspectTarball(path, name, version, ['dist/index.js', 'README.md', 'LICENSE']);
      tarballs.push({ name, path });
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  writePackage(`${output}/plan.json`, { version, tarballs });
  for (const { path } of tarballs)
    run('npm', [
      'publish',
      path,
      '--dry-run',
      '--ignore-scripts',
      '--access',
      'public',
      '--tag',
      process.env.RELEASE_TAG,
    ]);
}
export async function publish(version, tag) {
  validatePublishEnvironment(tag);
  const plan = readPackage(`${output}/plan.json`);
  if (
    plan.version !== version ||
    plan.tarballs.map((item) => item.name).join(',') !== '@webviewjs/webview,create-webview,create-webview-app'
  )
    throw new Error('Stale or invalid release plan.');
  await verifyVersions(version, true);
  const platforms = await packagePlan();
  requireArtifacts(platforms, false);
  for (const item of platforms) validateManifest(readPackage(`${item.path}/package.json`), item.name, version);
  for (const item of plan.tarballs) inspectTarball(item.path, item.name, version);
  await requireUnpublished(await allPackages(), version);
  try {
    // NAPI owns platform publication. It invokes npm publish and inherits the
    // provenance/tag/ignore-scripts environment; do not publish these again.
    const { NapiCli } = webviewRequire('@napi-rs/cli');
    await new NapiCli().prePublish({ cwd: resolve(webview), tagStyle: 'npm', ghRelease: false });
    await verifyPublished(platforms, version, tag);
    for (const item of plan.tarballs) {
      await requireUnpublished([item], version);
      run('npm', ['publish', item.path, '--ignore-scripts', '--provenance', '--access', 'public', '--tag', tag]);
    }
    await verifyPublished(await allPackages(), version, tag);
  } catch (error) {
    throw new Error(
      'Release failed and may be partially published. Inspect npm versions and tags before manual recovery; reruns refuse existing versions.',
      { cause: error },
    );
  }
}
