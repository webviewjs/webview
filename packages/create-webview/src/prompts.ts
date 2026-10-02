import { createInterface } from 'node:readline/promises';
import type { Interface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { CliError } from './terminal.js';
import type { PackageManager } from './package-manager.js';
import type { TemplateName } from './project.js';

async function ask<T extends string>(
  rl: Interface,
  question: string,
  options: readonly T[],
  labels: Readonly<Record<T, string>>,
  defaultValue: T,
): Promise<T> {
  stdout.write(`${question}\n`);
  options.forEach((option, index) => {
    stdout.write(`  ${index === options.indexOf(defaultValue) ? '>' : ' '} ${labels[option]}\n`);
  });
  const answer = (await rl.question(`Select [${options.indexOf(defaultValue) + 1}]: `)).trim();
  if (!answer) return defaultValue;

  const byIndex = Number(answer);
  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= options.length) {
    return options[byIndex - 1]!;
  }

  const match = options.find((option) => option === answer.toLowerCase());
  if (match) return match;
  throw new CliError(`Choose one of: ${options.join(', ')}.`);
}

export async function promptProjectDirectory(defaultValue = 'my-webview-app'): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`Project name (${defaultValue}): `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

export async function promptPackageName(defaultValue: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`Package name (${defaultValue}): `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

export async function promptTemplate(defaultValue: TemplateName = 'typescript'): Promise<TemplateName> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await ask(
      rl,
      'Template:',
      ['typescript', 'javascript'] as const,
      { typescript: 'TypeScript', javascript: 'JavaScript' },
      defaultValue,
    );
  } finally {
    rl.close();
  }
}

export async function promptPackageManager(defaultValue: PackageManager): Promise<PackageManager> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await ask(
      rl,
      'Package manager:',
      ['npm', 'bun', 'pnpm', 'yarn'] as const,
      { npm: 'npm', bun: 'bun', pnpm: 'pnpm', yarn: 'yarn' },
      defaultValue,
    );
  } finally {
    rl.close();
  }
}

export async function confirmNonEmptyDirectory(entries: string[]): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write(`The target directory contains: ${entries.join(', ')}\n`);
    const answer = (await rl.question('Continue and keep existing files? [y/N] ')).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}
