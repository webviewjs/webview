import { lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { downloadTemplate } from 'giget';
import { CliError } from './terminal.js';

export type TemplateDownloader = typeof downloadTemplate;

export function toGigetSource(input: string): string {
  const source = input.trim();
  if (!source) throw new CliError('An example name or GitHub URL is required.');

  if (!source.includes('://')) {
    if (!isValidSegment(source)) {
      throw new CliError('Example names must be a single safe directory name.');
    }
    return `github:webviewjs/webview/examples/${source}#main`;
  }

  const rawPathMatch = source.match(/^https:\/\/[^/?#]*(\/[^?#]*)?(?:[?#]|$)/i);
  if (!rawPathMatch) {
    throw new CliError('The example URL is malformed. Use a GitHub repository or directory URL.');
  }
  const rawPath = rawPathMatch[1] ?? '/';
  const rawSegments = rawPath.split('/').slice(1);
  if (rawSegments.at(-1) === '') rawSegments.pop();
  if (rawSegments.length < 2 || rawSegments.some((segment) => segment.length === 0)) {
    throw new CliError('GitHub example URLs must include an owner and repository.');
  }

  let segments: string[];
  try {
    segments = rawSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    throw new CliError('The GitHub example URL contains malformed escaping.');
  }
  if (
    segments.some((segment, index) => {
      if (segments[2] === 'tree' && index === 3) return !segment.split('/').every(isValidSegment);
      return !isValidSegment(segment);
    })
  ) {
    throw new CliError('The GitHub example URL contains an unsafe path segment.');
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new CliError('The example URL is malformed. Use a GitHub repository or directory URL.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new CliError('Examples must use an HTTPS URL on github.com without query or fragment parameters.');
  }

  const owner = segments[0]!;
  const repository = segments[1]!.replace(/\.git$/i, '');
  if (!isValidSegment(owner) || !isValidSegment(repository)) {
    throw new CliError('GitHub example URLs must include a valid owner and repository.');
  }

  if (segments.length === 2) return `github:${owner}/${repository}`;

  if (segments[2] === 'tree' && segments.length >= 4) {
    const ref = segments[3]!;
    const subdirectory = segments.slice(4);
    return `github:${owner}/${repository}${subdirectory.length ? `/${subdirectory.join('/')}` : ''}#${ref}`;
  }

  throw new CliError('GitHub example URLs must point to a repository or a /tree/<branch>/<directory> path.');
}

export async function withDownloadedExample<T>(
  example: string,
  useExample: (sourceDirectory: string) => Promise<T>,
  downloader: TemplateDownloader = downloadTemplate,
): Promise<T> {
  const source = toGigetSource(example);
  let temporaryDirectory: string;
  try {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'create-webview-example-'));
  } catch (error) {
    throw new CliError(`Could not create a temporary directory for the example: ${errorMessage(error)}`);
  }

  let result: T | undefined;
  let failure: unknown;
  try {
    let downloaded: Awaited<ReturnType<TemplateDownloader>>;
    try {
      downloaded = await downloader(source, { dir: temporaryDirectory, forceClean: true });
    } catch (error) {
      const message = errorMessage(error);
      if (/\b404\b|not found|could not find/i.test(message)) {
        throw new CliError(`Example "${example}" was not found. Check the example name or GitHub directory URL.`);
      }
      throw new CliError(`Could not download example "${example}": ${message}`);
    }

    const extractedDirectory = resolve(downloaded.dir);
    try {
      const tempRealPath = await realpath(temporaryDirectory);
      const extractedRealPath = await realpath(extractedDirectory);
      if (!isPathInside(tempRealPath, extractedRealPath)) {
        throw new CliError('The downloaded example resolved outside its temporary directory.');
      }
      const extractedStat = await lstat(extractedDirectory);
      if (extractedStat.isSymbolicLink() || !extractedStat.isDirectory()) {
        throw new CliError('The downloaded example is malformed: it did not contain a regular directory.');
      }
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError(`The downloaded example is malformed: ${errorMessage(error)}`);
    }

    result = await useExample(extractedDirectory);
  } catch (error) {
    failure = error;
  }

  try {
    await rm(temporaryDirectory, { recursive: true, force: true });
  } catch (error) {
    const cleanupMessage = `Could not clean up the temporary example directory: ${errorMessage(error)}`;
    failure = failure ? new CliError(`${errorMessage(failure)}; ${cleanupMessage}`) : new CliError(cleanupMessage);
  }

  if (failure) throw failure;
  return result as T;
}

function isValidSegment(segment: string): boolean {
  return segment !== '.' && segment !== '..' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment) && !segment.includes('..');
}

function isPathInside(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return (
    pathFromParent === '' ||
    (!isAbsolute(pathFromParent) && pathFromParent !== '..' && !pathFromParent.startsWith(`..${sep}`))
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
