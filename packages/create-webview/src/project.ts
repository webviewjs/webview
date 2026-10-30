import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { formatInstallFailure, installCommand, runCommand } from './package-manager.js';
import type { PackageManager } from './package-manager.js';
import { CliError } from './terminal.js';

interface ExampleEntry {
  path: string;
  kind: 'directory' | 'file';
  sourcePath?: string;
  content?: Buffer;
}

export interface CreateProjectOptions {
  directory: string;
  sourceDirectory: string;
  packageName?: string;
  packageManager: PackageManager;
  install: boolean;
  force?: boolean;
  cwd?: string;
  confirmNonEmpty?: (entries: string[]) => Promise<boolean>;
  runner?: typeof runCommand;
}

export interface CreatedProject {
  directory: string;
  packageName: string;
}

interface PreparedExample {
  entries: ExampleEntry[];
  latestPackages: string[];
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

  const cwd = resolve(options.cwd ?? process.cwd());
  const target = resolve(cwd, options.directory);
  await assertSafeTarget(target, cwd);
  const packageName = normalizePackageName(options.packageName ?? basename(target));
  const example = await prepareExampleEntries(options.sourceDirectory, packageName);

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

  const existingEntries = await readdir(target);
  if (existingEntries.length > 0 && !options.force) {
    const confirmed = await options.confirmNonEmpty?.(existingEntries);
    if (!confirmed) {
      throw new CliError('Target directory is not empty. Use --force to overwrite generated files there.');
    }
  }

  await validateDestination(target, example.entries, options.force === true);
  try {
    for (const entry of example.entries) {
      const destination = destinationPath(target, entry.path);
      if (entry.kind === 'directory') {
        await mkdir(destination, { recursive: true });
        continue;
      }
      await assertSafeDestinationParents(target, entry.path);
      const content = entry.content ?? (await readFile(entry.sourcePath!));
      await writeFile(destination, content, { flag: options.force ? 'w' : 'wx' });
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      `Could not finish copying the example into "${target}"; some files may already have been copied: ${errorMessage(error)}`,
    );
  }

  if (options.install) {
    const { command, args } = installCommand(options.packageManager, example.latestPackages);
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

  return { directory: target, packageName };
}

async function prepareExampleEntries(sourceDirectory: string, packageName: string): Promise<PreparedExample> {
  const source = resolve(sourceDirectory);
  let sourceStat;
  try {
    sourceStat = await lstat(source);
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      throw new CliError(`Example directory does not exist: ${sourceDirectory}`);
    }
    throw error;
  }

  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
    throw new CliError('The example source must be a regular directory.');
  }

  const entries: ExampleEntry[] = [];
  const visit = async (directory: string, prefix = ''): Promise<void> => {
    let children: string[];
    try {
      children = await readdir(directory);
    } catch (error) {
      throw new CliError(`Could not read example directory "${directory}": ${errorMessage(error)}`);
    }

    for (const name of children) {
      if (name === 'node_modules') continue;
      if (!isSafeEntryName(name)) {
        throw new CliError(`The example contains an unsafe path entry: ${JSON.stringify(name)}.`);
      }
      const relativePath = prefix ? join(prefix, name) : name;
      const sourcePath = resolve(source, relativePath);
      if (!isPathInside(source, sourcePath)) {
        throw new CliError(`Refusing to read outside the example directory: ${relativePath}`);
      }

      let stat;
      try {
        stat = await lstat(sourcePath);
      } catch (error) {
        throw new CliError(`Could not inspect example entry "${relativePath}": ${errorMessage(error)}`);
      }
      if (stat.isSymbolicLink()) {
        throw new CliError(`The example contains a symbolic link: ${relativePath}`);
      }
      if (stat.isDirectory()) {
        entries.push({ path: relativePath, kind: 'directory' });
        await visit(sourcePath, relativePath);
        continue;
      }
      if (!stat.isFile()) {
        throw new CliError(`The example contains an unsupported file type: ${relativePath}`);
      }
      entries.push({ path: relativePath, kind: 'file', sourcePath });
    }
  };

  await visit(source);
  const packageEntry = entries.find((entry) => entry.path === 'package.json' && entry.kind === 'file');
  if (!packageEntry?.sourcePath) {
    throw new CliError('The downloaded example is malformed: a root package.json file is required.');
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse((await readFile(packageEntry.sourcePath)).toString('utf8'));
  } catch (error) {
    throw new CliError(`The downloaded example has an invalid package.json: ${errorMessage(error)}`);
  }
  if (!isRecord(manifest)) {
    throw new CliError('The downloaded example has an invalid package.json: expected a JSON object.');
  }
  manifest.name = packageName;

  const latestPackages = new Set<string>();
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const dependencies = manifest[field];
    if (dependencies === undefined) continue;
    if (!isRecord(dependencies)) {
      throw new CliError(`The downloaded example has an invalid package.json: "${field}" must be an object.`);
    }
    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') {
        throw new CliError(`The downloaded example has an invalid dependency version for "${name}".`);
      }
      if (version.startsWith('workspace:')) {
        dependencies[name] = 'latest';
        latestPackages.add(`${name}@latest`);
      }
    }
  }

  packageEntry.content = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { entries, latestPackages: [...latestPackages] };
}

async function validateDestination(target: string, entries: ExampleEntry[], force: boolean): Promise<void> {
  const conflicts: string[] = [];
  for (const entry of entries) {
    const destination = destinationPath(target, entry.path);
    if (!isPathInside(target, destination)) {
      throw new CliError(`Refusing to write outside the target directory: ${entry.path}`);
    }
    await assertSafeDestinationParents(target, entry.path);
    let stat;
    try {
      stat = await lstat(destination);
    } catch (error) {
      if (isNodeError(error, 'ENOENT')) continue;
      throw error;
    }

    if (stat.isSymbolicLink()) {
      throw new CliError(`Cannot copy the example because "${entry.path}" is a symbolic link in the target.`);
    }
    if (entry.kind === 'directory') {
      if (!stat.isDirectory()) {
        throw new CliError(`Cannot create example directory because "${entry.path}" is not a directory.`);
      }
    } else if (!stat.isFile()) {
      throw new CliError(`Cannot write example file because "${entry.path}" is not a regular file.`);
    } else {
      conflicts.push(entry.path);
    }
  }

  if (conflicts.length > 0 && !force) {
    throw new CliError(
      `Example files already exist: ${conflicts.join(', ')}. Re-run with --force to replace only those files.`,
    );
  }
}

async function assertSafeDestinationParents(target: string, relativePath: string): Promise<void> {
  const segments = relativePath.split(sep);
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    current = join(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new CliError(`Cannot copy example content through an unsafe target path: ${relativePath}`);
      }
    } catch (error) {
      if (error instanceof CliError) throw error;
      if (!isNodeError(error, 'ENOENT')) throw error;
    }
  }
}

function destinationPath(target: string, relativePath: string): string {
  return resolve(target, ...relativePath.split(sep));
}

function isSafeEntryName(name: string): boolean {
  return name.length > 0 && name !== '.' && name !== '..' && !/[\\/:\0-\x1f]/.test(name) && !/^[A-Za-z]:/.test(name);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
