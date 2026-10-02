import type { GeneratedFile } from '../project.js';
import { typescriptTemplate } from './typescript.js';

export function javascriptTemplate(projectName: string, webviewVersion: string): GeneratedFile[] {
  return typescriptTemplate(projectName, webviewVersion)
    .filter((file) => file.path !== 'src/main.ts')
    .concat({
      path: 'src/main.js',
      content: `import { readFile } from 'node:fs/promises';
import { getAsset, isSea } from 'node:sea';
import { Application } from '@webviewjs/webview';

const app = new Application();

async function main() {
  const window = app.createBrowserWindow({
    title: ${JSON.stringify(titleFromProjectName(projectName))},
    width: 1024,
    height: 768,
  });

  const html = isSea()
    ? getAsset('index.html', 'utf8')
    : await readFile(new URL('./index.html', import.meta.url), 'utf8');
  window.createWebview({ html });

  app.run();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
    })
    .map((file) =>
      file.path === 'package.json' ? { ...file, content: file.content.replaceAll('src/main.ts', 'src/main.js') } : file,
    );
}

function titleFromProjectName(projectName: string): string {
  return projectName
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
}
