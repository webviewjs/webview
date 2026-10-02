import { styleText } from 'node:util';

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export function formatTerminal(text: string, style: 'green' | 'red' | 'dim'): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR !== undefined) {
    return text;
  }

  return styleText(style, text);
}

export function writeLine(text = ''): void {
  process.stdout.write(`${text}\n`);
}
