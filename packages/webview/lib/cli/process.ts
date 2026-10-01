import { spawn } from 'node:child_process';
import type { SpawnOptions } from 'node:child_process';
import { ProcessExecutionError } from './errors';

export interface ProcessOutput {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunProcessOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  capture?: boolean;
  allowNonZero?: boolean;
  onCommand?: (command: string) => void;
}

export interface ProcessRunner {
  run(executable: string, args: readonly string[], options?: RunProcessOptions): Promise<ProcessOutput>;
}

export function formatCommand(executable: string, args: readonly string[]): string {
  return [executable, ...args].map(formatArgument).join(' ');
}

function formatArgument(value: string): string {
  if (value === '') return '""';
  if (!/[\s"']/u.test(value)) return value;
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export const processRunner: ProcessRunner = {
  run(executable, args, options = {}) {
    return new Promise((resolve, reject) => {
      const capture = options.capture === true;
      const command = formatCommand(executable, args);
      options.onCommand?.(command);

      const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      };

      let child;
      try {
        child = spawn(executable, [...args], spawnOptions);
      } catch (cause) {
        reject(new ProcessExecutionError(executable, args, 'failed', { cause }));
        return;
      }

      let stdout = '';
      let stderr = '';
      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => (stdout += chunk));
      child.stderr?.on('data', (chunk: string) => (stderr += chunk));
      child.once('error', (cause: NodeJS.ErrnoException) => {
        reject(
          new ProcessExecutionError(executable, args, cause.code === 'ENOENT' ? 'not-found' : 'failed', { cause }),
        );
      });
      child.once('close', (code) => {
        const result = { code: code ?? 1, stdout, stderr };
        if (result.code !== 0 && !options.allowNonZero) {
          reject(new ProcessExecutionError(executable, args, 'failed', { exitCode: result.code }));
          return;
        }
        resolve(result);
      });
    });
  },
};
