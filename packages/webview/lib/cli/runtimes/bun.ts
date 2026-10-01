import { basename } from 'node:path';
import { formatCommand } from '../process';
import { executableOutputPath } from '../paths';
import { CliError } from '../errors';
import { formatTarget } from '../platform';
import type { BuildContext, BuildResult, RuntimeInfo } from '../types';
import type { RuntimeBuilder, RuntimeProbeContext } from './runtime';

export class BunRuntimeBuilder implements RuntimeBuilder {
  readonly name = 'bun' as const;

  async probe(context: RuntimeProbeContext): Promise<RuntimeInfo> {
    const versionResult = await context.runner.run(context.runtimeExecutable, ['--version'], { capture: true });
    const version = versionResult.stdout.trim() || versionResult.stderr.trim();
    if (!version) throw new CliError('Could not determine Bun version.');
    return { executable: context.runtimeExecutable, version };
  }

  async validate(context: RuntimeProbeContext): Promise<void> {
    if (context.target.os === 'linux' && context.target.libc === 'musl') {
      throw new CliError(
        'Bun musl targets cannot load WebviewJS because no musl native addon is published. Select a glibc target.',
      );
    }
  }

  plan(context: RuntimeProbeContext, info: RuntimeInfo): string[] {
    const outfile = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const args = ['build', context.options.input, '--compile', '--outfile', outfile];
    if (context.options.target) args.push('--target', context.options.target);
    if (context.options.minify) args.push('--minify');
    for (const asset of context.options.assets) args.push('--asset', asset.path);
    const steps = [`run ${formatCommand(info.executable, args)}`];
    if (context.options.assets.length) steps.push(`embed ${context.options.assets.length} asset(s)`);
    steps.push(`include the ${formatTarget(context.target)} WebviewJS N-API addon through Bun's native addon loader`);
    return steps;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const output = executableOutputPath(context.options.outDir, context.options.name, context.target);
    const args = ['build', context.options.input, '--compile', '--outfile', output];
    if (context.options.target) args.push('--target', context.options.target);
    if (context.options.minify) args.push('--minify');
    for (const asset of context.options.assets) args.push('--asset', asset.path);
    await context.runner.run(context.runtimeExecutable, args, { cwd: context.options.projectRoot });
    return {
      output,
      runtime: 'bun',
      runtimeVersion: context.runtime.version,
      target: context.target,
      steps: [
        `compiled standalone Bun executable for ${formatTarget(context.target)}`,
        `embedded ${context.options.assets.length} user asset(s)`,
        `compiled WebviewJS native addon reference (${basename(context.addonPath)})`,
      ],
    };
  }
}
