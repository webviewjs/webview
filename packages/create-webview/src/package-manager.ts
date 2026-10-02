import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { CliError } from './terminal.js';

export const PACKAGE_MANAGERS = ['npm', 'bun', 'pnpm', 'yarn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export function detectPackageManager(userAgent = process.env.npm_config_user_agent): PackageManager {
  const executable = userAgent?.match(/^([^\s/]+)\//)?.[1]?.toLowerCase();
  if (executable && PACKAGE_MANAGERS.includes(executable as PackageManager)) {
    return executable as PackageManager;
  }
  return 'npm';
}

export function installCommand(packageManager: PackageManager): { command: string; args: string[] } {
  switch (packageManager) {
    case 'npm':
      return { command: 'npm', args: ['install'] };
    case 'bun':
      return { command: 'bun', args: ['install'] };
    case 'pnpm':
      return { command: 'pnpm', args: ['install'] };
    case 'yarn':
      return { command: 'yarn', args: [] };
  }
}

export function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; stdio: 'inherit'; shell: false },
): Promise<void> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, options);
    } catch (error) {
      reject(error);
      return;
    }

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new CliError(`${command} exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}.`));
      }
    });
  });
}

export function formatInstallFailure(error: unknown, packageManager: PackageManager, directory: string): CliError {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
    return new CliError(
      `Could not find "${packageManager}" on PATH. Install it or choose another package manager with --package-manager.`,
    );
  }

  const detail = error instanceof Error ? error.message : String(error);
  return new CliError(
    `Failed to install dependencies with ${packageManager}: ${detail}\nRun "${packageManager} install" in "${directory}" to retry.`,
  );
}
