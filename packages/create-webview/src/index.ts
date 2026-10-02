#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { runCli } from './cli.js';

async function readPackageVersion(): Promise<string> {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
    version?: unknown;
  };

  if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
    throw new Error('The create-webview package metadata does not contain a version.');
  }

  return packageJson.version;
}

try {
  await runCli({ version: await readPackageVersion() });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
}
