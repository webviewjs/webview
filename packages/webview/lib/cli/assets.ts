import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { CliError } from './errors';
import type { BuildAsset } from './types';

export const SEA_NATIVE_ASSET_KEY = '__webviewjs_native.node';

export function normalizeAssets(
  assetPaths: readonly string[],
  resourcesPath: string | undefined,
  cwd: string,
): BuildAsset[] {
  const assets: BuildAsset[] = [];
  const keys = new Set<string>();

  const add = (key: string, path: string) => {
    if (!key || key.includes('\0') || key === '__proto__') {
      throw new CliError('Asset names must be non-empty, cannot contain null bytes, and cannot be "__proto__".');
    }
    if (key === SEA_NATIVE_ASSET_KEY) throw new CliError(`Asset name "${key}" is reserved by WebviewJS.`);
    if (keys.has(key)) throw new CliError(`Asset name "${key}" was provided more than once.`);
    const absolutePath = resolve(cwd, path);
    if (!existsSync(absolutePath)) throw new CliError(`Asset does not exist: ${absolutePath}`);
    keys.add(key);
    assets.push({ key, path: absolutePath });
  };

  for (const path of assetPaths) add(basename(path), path);

  if (resourcesPath) {
    const absoluteResources = resolve(cwd, resourcesPath);
    if (!existsSync(absoluteResources)) throw new CliError(`Resources file does not exist: ${absoluteResources}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(absoluteResources, 'utf8'));
    } catch (cause) {
      throw new CliError(`Could not parse resources JSON at ${absoluteResources}.`, { cause });
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new CliError('Resources JSON must be an object mapping asset names to file paths.');
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string' || value.length === 0) {
        throw new CliError(`Resource "${key}" must map to a non-empty file path.`);
      }
      add(key, resolve(dirname(absoluteResources), value));
    }
  }

  return assets;
}

export function validateAssets(assets: readonly BuildAsset[], runtime: 'node' | 'bun' | 'deno'): void {
  for (const asset of assets) {
    let info;
    try {
      info = statSync(asset.path);
    } catch (cause) {
      throw new CliError(`Asset does not exist: ${asset.path}`, { cause });
    }
    if (runtime === 'node' && !info.isFile()) {
      throw new CliError(`Node SEA assets must be files: ${asset.path}`);
    }
  }
}
