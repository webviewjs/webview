import type { PlatformInfo } from './platform';
import type { ProcessRunner } from './process';

export type RuntimeName = 'node' | 'bun' | 'deno';
export type NativeOs = 'darwin' | 'win32' | 'linux';
export type NativeArch = 'x64' | 'arm64' | 'ia32' | 'arm';

export interface NativeTarget {
  os: NativeOs;
  arch: NativeArch;
  libc?: 'gnu' | 'musl';
}

export interface BuildAsset {
  /** SEA asset key. Other runtimes preserve the file's path when embedding it. */
  key: string;
  path: string;
}

/** Fully normalized options used by runtime adapters. Paths are absolute. */
export interface BuildOptions {
  runtime: RuntimeName;
  input: string;
  outDir: string;
  name: string;
  target?: string;
  nativeAddon?: string;
  minify: boolean;
  verbose: boolean;
  assets: BuildAsset[];
  dryRun: boolean;
  projectRoot: string;
}

export interface BuildExecutableOptions {
  runtime?: RuntimeName | string;
  input?: string;
  outDir?: string;
  /** Backwards-compatible programmatic alias for outDir. */
  output?: string;
  name?: string;
  target?: string;
  nativeAddon?: string;
  minify?: boolean;
  verbose?: boolean;
  assets?: readonly (string | BuildAsset)[];
  resources?: string;
  dryRun?: boolean;
  cwd?: string;
}

export interface SeaOptions {
  useCodeCache: boolean;
  execArgv: string[];
  execArgvExtension: 'none' | 'env' | 'cli';
  useSnapshot: false;
}

export interface RuntimeInfo {
  executable: string;
  version: string;
  supportsBuildSea?: boolean;
}

export interface BuildResult {
  output: string;
  runtime: RuntimeName;
  runtimeVersion: string;
  target: NativeTarget;
  steps: string[];
  dryRun?: boolean;
}

export interface BuildLogger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface BuildServices {
  runner?: ProcessRunner;
  platform?: PlatformInfo;
  packageRoot?: string;
  nodeExecutable?: string;
  bunExecutable?: string;
  denoExecutable?: string;
  logger?: BuildLogger;
}

export interface BuildContext {
  options: BuildOptions;
  target: NativeTarget;
  addonPath: string;
  packageVersion: string;
  packageRoot: string;
  tempDir: string;
  runtimeExecutable: string;
  runtime: RuntimeInfo;
  seaOptions: SeaOptions;
  runner: ProcessRunner;
  logger: BuildLogger;
}
