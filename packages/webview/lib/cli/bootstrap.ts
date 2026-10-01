import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseCLIArguments } from './args';
import { buildExecutable } from './build';
import { CliError } from './errors';
import { consoleLogger } from './logger';

const packageRoot = resolve(__dirname, '../..');

export async function bootstrapCLI(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  try {
    const parsed = parseCLIArguments(argv);
    if (parsed.kind === 'version') {
      const { version } = readPackageInfo();
      consoleLogger.info(`WebviewJS v${version} · Node.js ${process.version} · ${process.platform}-${process.arch}`);
      return;
    }
    if (parsed.kind === 'help') {
      consoleLogger.info(parsed.scope === 'build' ? buildHelp : topHelp);
      return;
    }
    if (parsed.deprecated) consoleLogger.warn('webview --build is deprecated; use "webview build <entry>".');
    await buildExecutable({ ...parsed.options, cwd: parsed.options.projectRoot });
  } catch (error) {
    const message = error instanceof CliError || error instanceof Error ? error.message : String(error);
    consoleLogger.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

function readPackageInfo(): { version: string; description: string } {
  try {
    const parsed = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      version?: string;
      description?: string;
    };
    return {
      version: parsed.version ?? 'unknown',
      description: parsed.description ?? 'Build standalone WebviewJS applications.',
    };
  } catch {
    return { version: 'unknown', description: 'Build standalone WebviewJS applications.' };
  }
}

const topHelp = `WebviewJS - Build standalone applications

Usage: webview <command> [options]

Commands:
  build <entry>   Build a standalone executable

Options:
  -h, --help      Show help
  -v, --version   Show version

Run "webview build --help" for build options.`;

const buildHelp = `Build a standalone executable

Usage: webview build [entry] [options]

Options:
  -R, --runtime <name>       Runtime: node, bun, or deno (default: node)
  -n, --name <name>          Executable name (default: package name or entry basename)
      --out-dir <directory>  Output directory (default: ./dist)
      --target <target>      Runtime-specific target
      --native-addon <path>  Override the target-specific WebviewJS .node addon
      --asset <path>          Embed assets where supported (repeatable)
  -r, --resources <file>     Read a Node SEA JSON asset map (compatibility option)
      --minify                Minify the Node.js bundle or Bun output
      --verbose               Print subprocess commands
  -d, --dry-run              Validate and print the build plan
  -h, --help                 Show this help

Examples:
  webview build src/main.ts
  webview build src/main.ts --runtime bun --minify
  webview build src/main.ts --runtime deno --out-dir ./release

The deprecated form "webview --build --input <entry>" remains supported temporarily.`;
