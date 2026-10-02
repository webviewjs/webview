import { parseArgs } from 'node:util';
import { CliError } from './terminal.js';
import type { PackageManager } from './package-manager.js';
import type { TemplateName } from './project.js';

export interface CliOptions {
  projectDirectory?: string;
  template?: TemplateName;
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

  const template = parsed.values.template;
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
    template,
    packageManager,
    install: parsed.values['no-install'] !== true,
    yes: parsed.values.yes === true,
    force: parsed.values.force === true,
    help: parsed.values.help === true,
    version: parsed.values.version === true,
  };
}
