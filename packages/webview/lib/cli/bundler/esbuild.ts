import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { build as esbuild } from 'esbuild';
import { CliError } from '../errors';
import { SEA_NATIVE_ASSET_KEY } from '../assets';
import type { BuildAsset, NativeTarget } from '../types';

export interface NodeBundleOptions {
  input: string;
  outfile: string;
  cwd: string;
  minify: boolean;
  addonPath: string;
  packageVersion: string;
}

export interface NodeBundleResult {
  outfile: string;
  addonAsset: BuildAsset;
  addonHash: string;
}

export async function bundleNodeApplication(options: NodeBundleOptions): Promise<NodeBundleResult> {
  const addonHash = createHash('sha256').update(readFileSync(options.addonPath)).digest('hex');
  const prelude = createSeaPrelude(options.packageVersion, addonHash);
  try {
    await esbuild({
      absWorkingDir: options.cwd,
      entryPoints: [options.input],
      outfile: options.outfile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node24',
      minify: options.minify,
      banner: { js: prelude },
      external: ['@webviewjs/webview-*', '*.node'],
      logLevel: 'silent',
    });
  } catch (cause) {
    throw new CliError(`Could not bundle application entry ${options.input}.`, { cause });
  }
  return {
    outfile: options.outfile,
    addonAsset: { key: SEA_NATIVE_ASSET_KEY, path: options.addonPath },
    addonHash,
  };
}

export function createSeaPrelude(packageVersion: string, addonHash: string): string {
  const cacheName = `${packageVersion}-${addonHash}`;
  const key = JSON.stringify(SEA_NATIVE_ASSET_KEY);
  const cache = JSON.stringify(cacheName);
  return `(() => {
  const __wvSea = require('node:sea');
  if (!__wvSea.isSea()) return;
  const __wvFs = require('node:fs');
  const __wvPath = require('node:path');
  const __wvOs = require('node:os');
  const __wvAddon = __wvPath.join(__wvOs.tmpdir(), 'webviewjs', ${cache}, '__webviewjs_native.node');
  __wvFs.mkdirSync(__wvPath.dirname(__wvAddon), { recursive: true, mode: 0o700 });
  if (!__wvFs.existsSync(__wvAddon)) {
    const __wvTemp = __wvAddon + '.' + process.pid + '.' + Math.random().toString(16).slice(2) + '.tmp';
    try {
      __wvFs.writeFileSync(__wvTemp, Buffer.from(__wvSea.getAsset(${key})), { flag: 'wx', mode: 0o700 });
      try {
        __wvFs.renameSync(__wvTemp, __wvAddon);
      } catch (__wvRenameError) {
        if (!__wvFs.existsSync(__wvAddon)) throw __wvRenameError;
        __wvFs.unlinkSync(__wvTemp);
      }
    } catch (__wvWriteError) {
      try { __wvFs.unlinkSync(__wvTemp); } catch {}
      throw __wvWriteError;
    }
  }
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = __wvAddon;
  require = require('node:module').createRequire(process.execPath);
})();`;
}

export function createSeaAssets(userAssets: readonly BuildAsset[], addonPath: string): Record<string, string> {
  const assets = Object.create(null) as Record<string, string>;
  for (const asset of userAssets) assets[asset.key] = asset.path;
  assets[SEA_NATIVE_ASSET_KEY] = addonPath;
  return assets;
}

export function describeAddonAsset(target: NativeTarget, addonPath: string): string {
  return `embedded ${target.os}-${target.arch} WebviewJS native addon (${basename(addonPath)})`;
}
