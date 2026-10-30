import { readFile } from 'node:fs/promises';
import { getAsset, isSea } from 'node:sea';
import { Application } from '@webviewjs/webview';

const app: Application = new Application();

async function main(): Promise<void> {
  const window = app.createBrowserWindow({
    title: 'Webview App',
    width: 1024,
    height: 768,
  });

  const html = isSea()
    ? getAsset('index.html', 'utf8')
    : await readFile(new URL('./index.html', import.meta.url), 'utf8');
  window.createWebview({ html });

  app.run();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
