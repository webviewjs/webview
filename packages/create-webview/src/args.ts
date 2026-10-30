import { parseArgs } from 'node:util';
import { CliError } from './terminal.js';
import type { PackageManager } from './package-manager.js';

export interface CliOptions {
  projectDirectory?: string;
  example: string;
  explicitExample: boolean;
  packageManager?: PackageManager;
  install: boolean;
  yes: boolean;
  force: boolean;
  help: boolean;
  version: boolean;
}

export function parseCliArgs(args: string[]): CliOptions {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args,
      options: {
        example: { type: 'string' },
        template: { type: 'string' },
        'no-install': { type: 'boolean' },
        'package-manager': { type: 'string' },
        yes: { type: 'boolean', short: 'y' },
        force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error));
  }

  if (parsed.positionals.length > 1) {
    throw new CliError('Only one project directory can be supplied.');
  }

  const rawExample = parsed.values.example;
  const example = typeof rawExample === 'string' ? rawExample : undefined;
  const rawTemplate = parsed.values.template;
  const template = typeof rawTemplate === 'string' ? rawTemplate : undefined;
  if (example !== undefined && template !== undefined) {
    throw new CliError('Use either --example or the deprecated --template option, not both.');
  }
  if (template !== undefined && template !== 'typescript' && template !== 'javascript') {
    throw new CliError(`Unknown template "${template}". Choose "typescript" or "javascript".`);
  }

  const packageManager = parsed.values['package-manager'];
  if (
    packageManager !== undefined &&
    packageManager !== 'npm' &&
    packageManager !== 'bun' &&
    packageManager !== 'pnpm' &&
    packageManager !== 'yarn'
  ) {
    throw new CliError(`Unknown package manager "${packageManager}". Choose npm, bun, pnpm, or yarn.`);
  }

  return {
    projectDirectory: parsed.positionals[0],
    example: example ?? (template === 'javascript' ? 'basic-js' : template === 'typescript' ? 'basic-ts' : 'basic-ts'),
    explicitExample: example !== undefined || template !== undefined,
    packageManager,
    install: parsed.values['no-install'] !== true,
    yes: parsed.values.yes === true,
    force: parsed.values.force === true,
    help: parsed.values.help === true,
    version: parsed.values.version === true,
  };
}
