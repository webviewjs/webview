import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, resolve } from 'node:path';
import { CliError } from './errors';
import { formatTarget, nativePackageName } from './platform';
import type { NativeTarget } from './types';

export interface ResolvedNativeAddon {
  path: string;
  packageName: string;
}

export function nativeAddonFileName(target: NativeTarget): string {
  const suffix =
    target.os === 'darwin'
      ? `darwin-${target.arch}`
      : target.os === 'win32'
        ? `win32-${target.arch}-msvc`
        : target.arch === 'arm'
          ? 'linux-arm-gnueabihf'
          : `linux-${target.arch}-${target.libc ?? 'gnu'}`;
  return `webview.${suffix}.node`;
}

export function packageRootFromModule(moduleDirectory: string = __dirname): string {
  return resolve(moduleDirectory, '../..');
}

export function resolveNativeAddon(
  target: NativeTarget,
  projectRoot: string,
  packageRoot = packageRootFromModule(),
  override?: string,
): ResolvedNativeAddon {
  const packageName = nativePackageName(target);
  if (override) {
    const absolute = resolve(projectRoot, override);
    validateNativeAddonPath(absolute, target);
    return { path: absolute, packageName };
  }

  const projectRequire = createRequire(join(projectRoot, 'package.json'));
  try {
    const resolved = projectRequire.resolve(packageName);
    validateNativeAddonPath(resolved, target);
    return { path: resolved, packageName };
  } catch (cause) {
    if (cause instanceof CliError) throw cause;
  }

  // Development builds place N-API output beside the package or in npm/<target>.
  const localCandidates = [
    join(packageRoot, nativeAddonFileName(target)),
    join(packageRoot, 'npm', packageName.slice('@webviewjs/webview-'.length), nativeAddonFileName(target)),
  ];
  const localAddon = localCandidates.find((candidate) => existsSync(candidate));
  if (localAddon) {
    validateNativeAddonPath(localAddon, target);
    return { path: localAddon, packageName };
  }

  throw new CliError(
    `Could not find the ${formatTarget(target)} WebviewJS native addon (${packageName}) from ${projectRoot}. ` +
      `Install the target-specific optional dependency for the target platform, or pass --native-addon <path>. ` +
      `Cross-compilation never uses the host addon as a fallback.`,
  );
}

export function validateNativeAddonPath(path: string, target: NativeTarget): void {
  if (!path.endsWith('.node')) throw new CliError(`Native addon must end in .node: ${path}`);
  if (!existsSync(path) || !statSync(path).isFile()) throw new CliError(`Native addon file does not exist: ${path}`);
  const inferred = inferNativeTarget(basename(path));
  if (inferred && !sameNativeTarget(inferred, target)) {
    throw new CliError(
      `Native addon "${path}" is for ${formatTarget(inferred)}, but the requested target is ${formatTarget(target)}.`,
    );
  }
}

export function inferNativeTarget(fileName: string): NativeTarget | undefined {
  const match = /^webview\.(darwin|win32|linux)-(.+)\.node$/u.exec(fileName);
  if (!match) return undefined;
  const [, os, suffix] = match;
  if (os === 'darwin' && (suffix === 'x64' || suffix === 'arm64')) return { os, arch: suffix };
  if (os === 'win32') {
    const arch = suffix.replace(/-msvc$/u, '');
    if (suffix.endsWith('-msvc') && (arch === 'x64' || arch === 'arm64' || arch === 'ia32')) {
      return { os, arch };
    }
  }
  if (os === 'linux') {
    const target = suffix.match(/^(x64|arm64|ia32|arm)-(gnu|musl|gnueabihf)$/u);
    if (target) {
      const arch = target[1] as NativeTarget['arch'];
      const libc = target[2] === 'musl' ? 'musl' : 'gnu';
      return { os, arch, libc };
    }
  }
  return undefined;
}

function sameNativeTarget(left: NativeTarget, right: NativeTarget): boolean {
  return (
    left.os === right.os &&
    left.arch === right.arch &&
    (left.os !== 'linux' || (left.libc ?? 'gnu') === (right.libc ?? 'gnu'))
  );
}
