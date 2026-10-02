import { basename, relative, resolve } from 'node:path';
import { parseCliArgs } from './args.js';
import { detectPackageManager } from './package-manager.js';
import type { PackageManager } from './package-manager.js';
import {
  confirmNonEmptyDirectory,
  promptPackageManager,
  promptPackageName,
  promptProjectDirectory,
  promptTemplate,
} from './prompts.js';
import { createProject, normalizePackageName } from './project.js';
import type { TemplateName } from './project.js';
import { CliError, formatTerminal, writeLine } from './terminal.js';

export async function runCli(options: { version: string; args?: string[] }): Promise<void> {
  const parsed = parseCliArgs(options.args ?? process.argv.slice(2));
  if (parsed.help) {
    writeLine(helpText());
    return;
  }
  if (parsed.version) {
    writeLine(options.version);
    return;
  }

  writeLine(formatTerminal('Create WebviewJS', 'dim'));
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !parsed.yes);
  let directory = parsed.projectDirectory;
  if (!directory) {
    if (interactive) {
      directory = await promptProjectDirectory();
    } else if (parsed.yes) {
      directory = 'webview-app';
    } else {
      throw new CliError('Project directory is required in non-interactive mode.');
    }
  }

  const template: TemplateName = parsed.template ?? (interactive ? await promptTemplate('typescript') : 'typescript');
  const detectedPackageManager = detectPackageManager();
  const packageManager: PackageManager =
    parsed.packageManager ??
    (interactive ? await promptPackageManager(detectedPackageManager) : detectedPackageManager);

  const absoluteDirectory = resolve(directory);
  const requestedName = basename(absoluteDirectory);
  let packageName: string;
  try {
    packageName = normalizePackageName(requestedName);
  } catch (error) {
    if (!interactive) throw error;
    packageName = normalizePackageName(await promptPackageName('my-webview-app'));
  }
  if (packageName !== requestedName) {
    writeLine(`Using npm package name "${packageName}" from directory "${requestedName}".`);
  }

  const confirmNonEmpty = interactive ? confirmNonEmptyDirectory : undefined;
  writeLine();
  writeLine(`Creating ${directory}...`);
  const project = await createProject({
    directory,
    packageName,
    template,
    packageManager,
    install: parsed.install,
    force: parsed.force,
    webviewVersion: options.version,
    confirmNonEmpty,
  });

  writeLine(formatTerminal('✓ Created project', 'green'));
  if (parsed.install) writeLine(formatTerminal('✓ Installed dependencies', 'green'));
  writeLine();
  writeLine('Next:');
  writeLine(`  cd ${shellArgument(relative(process.cwd(), project.directory) || '.')}`);
  if (!parsed.install) {
    writeLine(`  ${installCommandText(packageManager)}`);
  }
  writeLine(`  ${devCommandText(packageManager)}`);
}

function helpText(): string {
  return `Create a WebviewJS desktop application.

Usage:
  create-webview [project-directory] [options]

Options:
  --template <typescript|javascript>  Choose the starter template (default: typescript)
  --package-manager <npm|bun|pnpm|yarn>  Choose dependency installation and instructions
  --no-install                         Skip dependency installation
  --yes, -y                            Use defaults without prompts
  --force                              Replace only conflicting generated files
  --help, -h                           Show this help
  --version, -v                        Show the package version
`;
}

function installCommandText(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'npm':
      return 'npm install';
    case 'bun':
      return 'bun install';
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn';
  }
}

function devCommandText(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'npm':
      return 'npm run dev';
    case 'bun':
      return 'bun run dev';
    case 'pnpm':
      return 'pnpm dev';
    case 'yarn':
      return 'yarn dev';
  }
}

function shellArgument(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
