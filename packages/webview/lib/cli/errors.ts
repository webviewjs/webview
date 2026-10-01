export class CliError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CliError';
  }
}

export class ProcessExecutionError extends CliError {
  readonly executable: string;
  readonly args: readonly string[];
  readonly exitCode?: number;
  readonly kind: 'not-found' | 'failed';

  constructor(
    executable: string,
    args: readonly string[],
    kind: 'not-found' | 'failed',
    options: { exitCode?: number; cause?: unknown } = {},
  ) {
    const command = [executable, ...args].join(' ');
    const message =
      kind === 'not-found'
        ? `Could not find executable "${executable}". Install it or put it on PATH.`
        : `Command failed with exit code ${options.exitCode ?? 1}: ${command}`;
    super(message, { cause: options.cause });
    this.name = 'ProcessExecutionError';
    this.executable = executable;
    this.args = args;
    this.exitCode = options.exitCode;
    this.kind = kind;
  }
}
