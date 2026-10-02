import { lstat, mkdir, readdir, realpath, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { javascriptTemplate } from './templates/javascript.js';
import { typescriptTemplate } from './templates/typescript.js';
import { formatInstallFailure, installCommand, runCommand } from './package-manager.js';
import type { PackageManager } from './package-manager.js';
import { CliError } from './terminal.js';

export type TemplateName = 'typescript' | 'javascript';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface CreateProjectOptions {
  directory: string;
  packageName?: string;
  template: TemplateName;
  packageManager: PackageManager;
  install: boolean;
  webviewVersion: string;
  force?: boolean;
  cwd?: string;
  confirmNonEmpty?: (entries: string[]) => Promise<boolean>;
  runner?: typeof runCommand;
}

export interface CreatedProject {
  directory: string;
  packageName: string;
  template: TemplateName;
}

export function normalizePackageName(input: string): string {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase().replace(/\s+/g, '-');
  if (
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    normalized === 'node_modules' ||
    normalized === 'favicon.ico' ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(normalized)
  ) {
    throw new CliError(
      `"${input}" is not a valid npm package name. Use lowercase letters, numbers, dots, underscores, or hyphens.`,
    );
  }

  return normalized;
}

export async function createProject(options: CreateProjectOptions): Promise<CreatedProject> {
  if (!options.directory.trim()) {
    throw new CliError('Project directory cannot be empty.');
  }
  if (!options.webviewVersion.trim()) {
    throw new CliError('A WebviewJS version is required to create the project.');
  }

  const cwd = resolve(options.cwd ?? process.cwd());
  const target = resolve(cwd, options.directory);
  await assertSafeTarget(target, cwd);

  const packageName = normalizePackageName(options.packageName ?? basename(target));
  const files =
    options.template === 'typescript'
      ? typescriptTemplate(packageName, options.webviewVersion)
      : javascriptTemplate(packageName, options.webviewVersion);

  let rootStat;
  try {
    rootStat = await lstat(target);
  } catch (error) {
    if (!isNodeError(error, 'ENOENT')) throw error;
  }

  if (rootStat?.isSymbolicLink()) {
    throw new CliError('The target directory cannot be a symbolic link.');
  }
  if (rootStat && !rootStat.isDirectory()) {
    throw new CliError('The target path exists and is not a directory.');
  }

  await mkdir(target, { recursive: true });
  await assertSafeTarget(target, cwd);

  const entries = await readdir(target);
  if (entries.length > 0 && !options.force) {
    const confirmed = await options.confirmNonEmpty?.(entries);
    if (!confirmed) {
      throw new CliError('Target directory is not empty. Use --force to overwrite generated files there.');
    }
  }

  const srcPath = join(target, 'src');
  let srcStat;
  try {
    srcStat = await lstat(srcPath);
  } catch (error) {
    if (!isNodeError(error, 'ENOENT')) throw error;
  }
  if (srcStat?.isSymbolicLink() || (srcStat && !srcStat.isDirectory())) {
    throw new CliError('The project contains a "src" path that is not a regular directory.');
  }

  const conflicts: string[] = [];
  for (const file of files) {
    const destination = join(target, file.path);
    try {
      const stat = await lstat(destination);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new CliError(`Cannot write generated file because "${file.path}" is not a regular file.`);
      }
      conflicts.push(file.path);
    } catch (error) {
      if (!isNodeError(error, 'ENOENT')) throw error;
    }
  }

  if (conflicts.length > 0 && !options.force) {
    throw new CliError(
      `Generated files already exist: ${conflicts.join(', ')}. Re-run with --force to replace only those files.`,
    );
  }

  if (srcStat === undefined) {
    await mkdir(srcPath);
  }

  for (const file of files) {
    const destination = join(target, file.path);
    if (!isPathInside(target, destination)) {
      throw new CliError(`Refusing to write outside the target directory: ${file.path}`);
    }
    await writeFile(destination, file.content.endsWith('\n') ? file.content : `${file.content}\n`, {
      encoding: 'utf8',
      flag: options.force ? 'w' : 'wx',
    }).catch((error: unknown) => {
      if (isNodeError(error, 'EEXIST')) {
        throw new CliError(`Generated file already exists: ${file.path}. Re-run with --force to replace it.`);
      }
      throw error;
    });
  }

  if (options.install) {
    const { command, args } = installCommand(options.packageManager);
    try {
      await (options.runner ?? runCommand)(command, args, {
        cwd: target,
        stdio: 'inherit',
        shell: false,
      });
    } catch (error) {
      throw formatInstallFailure(error, options.packageManager, target);
    }
  }

  return { directory: target, packageName, template: options.template };
}

async function assertSafeTarget(target: string, cwd: string): Promise<void> {
  const canonicalTarget = await canonicalizePossiblyMissingPath(target);
  const protectedPaths = new Set<string>([
    await canonicalizePossiblyMissingPath(parse(target).root),
    await canonicalizePossiblyMissingPath(homedir()),
  ]);

  const gitRoot = await findGitRoot(cwd);
  if (gitRoot) protectedPaths.add(await canonicalizePossiblyMissingPath(gitRoot));

  if (protectedPaths.has(canonicalTarget)) {
    throw new CliError(`Refusing to scaffold into a protected directory: ${target}`);
  }
}

async function canonicalizePossiblyMissingPath(path: string): Promise<string> {
  let current = resolve(path);
  const suffix: string[] = [];

  while (true) {
    try {
      const canonical = await realpath(current);
      return resolve(canonical, ...suffix);
    } catch (error) {
      if (!isNodeError(error, 'ENOENT') && !isNodeError(error, 'ENOTDIR')) throw error;
      const parent = dirname(current);
      if (parent === current) return resolve(current, ...suffix);
      suffix.unshift(basename(current));
      current = parent;
    }
  }
}

async function findGitRoot(start: string): Promise<string | undefined> {
  let current = resolve(start);
  while (true) {
    try {
      await lstat(join(current, '.git'));
      return current;
    } catch (error) {
      if (!isNodeError(error, 'ENOENT')) throw error;
    }

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isPathInside(parent: string, child: string): boolean {
  const relativePath = relative(parent, child);
  return (
    relativePath === '' || (!isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${sep}`))
  );
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
