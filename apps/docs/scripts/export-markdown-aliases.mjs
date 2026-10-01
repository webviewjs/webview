import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(appDirectory, 'out');
const markdownDirectory = join(outputDirectory, 'llms.mdx', 'docs');
let pageCount = 0;

async function copyMarkdownPages(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await copyMarkdownPages(path);
      continue;
    }

    if (entry.name !== 'content.md') continue;

    const slug = relative(markdownDirectory, path).split(sep).slice(0, -1);
    const target =
      slug.length === 0
        ? join(outputDirectory, 'index.md')
        : join(outputDirectory, ...slug.slice(0, -1), `${slug.at(-1)}.md`);

    await mkdir(dirname(target), { recursive: true });
    await copyFile(path, target);
    pageCount += 1;
  }
}

await copyMarkdownPages(markdownDirectory);
if (pageCount === 0) {
  throw new Error(`No Fumadocs Markdown routes were exported from ${markdownDirectory}`);
}

console.log(`Exported ${pageCount} per-page Markdown aliases.`);
