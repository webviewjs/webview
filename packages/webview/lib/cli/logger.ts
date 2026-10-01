import { styleText } from 'node:util';
import type { BuildLogger, BuildResult } from './types';
import { formatTarget } from './platform';

export const consoleLogger: BuildLogger = {
  info: (message) => console.log(message),
  success: (message) => console.log(styleText('green', `  ✓ ${message}`)),
  warn: (message) => console.warn(styleText('yellow', message)),
  error: (message) => console.error(styleText('red', message)),
};

export function printBuildPlan(
  runtime: string,
  version: string,
  target: BuildResult['target'],
  entry: string,
  output: string,
  steps: readonly string[],
  logger: BuildLogger = consoleLogger,
): void {
  logger.info(
    [
      'WebviewJS build plan',
      '',
      `  Runtime    ${runtime} ${version}`,
      `  Target     ${formatTarget(target)}`,
      `  Entry      ${entry}`,
      `  Output     ${output}`,
      '',
      '  Steps',
      ...steps.map((step, index) => `  ${index + 1}. ${step}`),
    ].join('\n'),
  );
}

export function printBuildResult(result: BuildResult, entry: string, logger: BuildLogger = consoleLogger): void {
  logger.info(
    [
      'WebviewJS',
      '',
      `  Runtime    ${runtimeLabel(result.runtime)} ${result.runtimeVersion}`,
      `  Target     ${formatTarget(result.target)}`,
      `  Entry      ${entry}`,
      `  Output     ${result.output}`,
      '',
      ...result.steps.map((step) => `  ✓ ${step}`),
      '',
      `Built ${result.output}`,
    ].join('\n'),
  );
}

export function runtimeLabel(name: string): string {
  switch (name) {
    case 'node':
      return 'Node.js';
    case 'bun':
      return 'Bun';
    default:
      return 'Deno';
  }
}
