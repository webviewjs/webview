import { access, constants, stat } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { CliError } from './errors';
import type { NativeArch, NativeTarget, RuntimeName } from './types';

export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  libc?: 'gnu' | 'musl';
}

export function getHostPlatform(): PlatformInfo {
  let libc: 'gnu' | 'musl' | undefined;
  if (process.platform === 'linux') {
    const report = process.report?.getReport?.() as { header?: { glibcVersionRuntime?: string } } | undefined;
    libc = report?.header?.glibcVersionRuntime ? 'gnu' : 'musl';
  }
  return { os: process.platform, arch: process.arch, libc };
}

export function toNativeTarget(platform: PlatformInfo): NativeTarget {
  if (!['darwin', 'win32', 'linux'].includes(platform.os)) {
    throw new CliError(`WebviewJS executable builds do not support host operating system "${platform.os}".`);
  }
  if (!['x64', 'arm64', 'ia32', 'arm'].includes(platform.arch)) {
    throw new CliError(`WebviewJS does not publish a desktop native addon for ${platform.os}-${platform.arch}.`);
  }
  const target: NativeTarget = {
    os: platform.os as NativeTarget['os'],
    arch: platform.arch as NativeArch,
  };
  if (target.os === 'linux') target.libc = platform.libc ?? 'gnu';
  return target;
}

const BUN_TARGETS: Record<string, NativeTarget> = {
  'bun-darwin-x64': { os: 'darwin', arch: 'x64' },
  'bun-darwin-arm64': { os: 'darwin', arch: 'arm64' },
  'bun-linux-x64': { os: 'linux', arch: 'x64', libc: 'gnu' },
  'bun-linux-arm64': { os: 'linux', arch: 'arm64', libc: 'gnu' },
  'bun-linux-x64-musl': { os: 'linux', arch: 'x64', libc: 'musl' },
  'bun-linux-arm64-musl': { os: 'linux', arch: 'arm64', libc: 'musl' },
  'bun-windows-x64': { os: 'win32', arch: 'x64' },
  'bun-windows-arm64': { os: 'win32', arch: 'arm64' },
};

const DENO_TARGETS: Record<string, NativeTarget> = {
  'x86_64-pc-windows-msvc': { os: 'win32', arch: 'x64' },
  'aarch64-pc-windows-msvc': { os: 'win32', arch: 'arm64' },
  'x86_64-apple-darwin': { os: 'darwin', arch: 'x64' },
  'aarch64-apple-darwin': { os: 'darwin', arch: 'arm64' },
  'x86_64-unknown-linux-gnu': { os: 'linux', arch: 'x64', libc: 'gnu' },
  'aarch64-unknown-linux-gnu': { os: 'linux', arch: 'arm64', libc: 'gnu' },
};

export function parseRuntimeTarget(
  runtime: RuntimeName,
  value: string | undefined,
  host: PlatformInfo = getHostPlatform(),
): NativeTarget {
  if (!value) {
    const hostTarget = toNativeTarget(host);
    if (runtime === 'bun' && !Object.values(BUN_TARGETS).some((target) => sameTarget(target, hostTarget))) {
      throw new CliError(`Bun does not support host target ${formatTarget(hostTarget)}.`);
    }
    if (runtime === 'deno' && !Object.values(DENO_TARGETS).some((target) => sameTarget(target, hostTarget))) {
      throw new CliError(`Deno does not support host target ${formatTarget(hostTarget)}.`);
    }
    return hostTarget;
  }
  if (runtime === 'node') {
    throw new CliError(
      'Node SEA uses the current Node executable and cannot cross-compile. Remove --target or build on the target platform.',
    );
  }

  const targets = runtime === 'bun' ? BUN_TARGETS : DENO_TARGETS;
  const target = targets[value];
  if (!target) {
    const available = Object.keys(targets).join(', ');
    throw new CliError(`Unsupported ${runtime} target "${value}". Supported targets: ${available}.`);
  }
  if (runtime === 'bun' && target.libc === 'musl') {
    throw new CliError(
      `Bun can target musl, but WebviewJS does not publish musl native addons. Use a glibc target such as "bun-linux-x64".`,
    );
  }
  return { ...target };
}

function sameTarget(left: NativeTarget, right: NativeTarget): boolean {
  return (
    left.os === right.os &&
    left.arch === right.arch &&
    (left.os !== 'linux' || (left.libc ?? 'gnu') === (right.libc ?? 'gnu'))
  );
}

export function nativeTargetKey(target: NativeTarget): string {
  const platform = target.os === 'win32' ? 'win32' : target.os;
  const libc = target.os === 'linux' ? `-${target.libc ?? 'gnu'}` : '';
  return `${platform}-${target.arch}${libc}`;
}

export function formatTarget(target: NativeTarget): string {
  return `${target.os}-${target.arch}${target.os === 'linux' ? `-${target.libc ?? 'gnu'}` : ''}`;
}

export function nativePackageName(target: NativeTarget): string {
  if (target.os === 'linux' && (target.libc ?? 'gnu') !== 'gnu') {
    throw new CliError(`WebviewJS does not publish a ${formatTarget(target)} native addon.`);
  }
  const suffix =
    target.os === 'darwin'
      ? `darwin-${target.arch}`
      : target.os === 'win32'
        ? `win32-${target.arch}-msvc`
        : target.arch === 'arm'
          ? 'linux-arm-gnueabihf'
          : `linux-${target.arch}-gnu`;
  const available = new Set([
    'darwin-x64',
    'darwin-arm64',
    'win32-x64-msvc',
    'win32-arm64-msvc',
    'win32-ia32-msvc',
    'linux-x64-gnu',
    'linux-arm64-gnu',
    'linux-ia32-gnu',
    'linux-arm-gnueabihf',
  ]);
  if (!available.has(suffix)) {
    throw new CliError(`WebviewJS does not publish a ${formatTarget(target)} native addon.`);
  }
  return `@webviewjs/webview-${suffix}`;
}

export function assertRuntimeTarget(runtime: RuntimeName, target: NativeTarget): void {
  // Parsing is the runtime-capability check. This additionally checks the N-API intersection.
  nativePackageName(target);
  if (runtime === 'node' && target.os !== process.platform) {
    throw new CliError('Node SEA cannot cross-compile to a different operating system.');
  }
}

export async function findExecutable(name: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const paths = (env.PATH ?? '').split(delimiter).filter(Boolean);
  const suffixes = process.platform === 'win32' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  const candidates = paths.flatMap((path) =>
    suffixes.map((suffix) =>
      join(path, suffix && !name.toLowerCase().endsWith(suffix.toLowerCase()) ? `${name}${suffix}` : name),
    ),
  );
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (!info.isFile()) continue;
      await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      return candidate;
    } catch {
      // Continue searching PATH.
    }
  }
  return undefined;
}

export function executableName(runtime: RuntimeName): string {
  return runtime === 'node' ? process.execPath : runtime;
}
