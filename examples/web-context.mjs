import { resolve } from 'node:path';
import { Application } from '../index.js';

const app = new Application();
const context = app.createWebContext({
  dataDirectory: resolve('.webviewjs-example-profile'),
});

const firstWindow = app.createBrowserWindow({
  title: 'Shared context: first webview',
  width: 700,
  height: 500,
});
const secondWindow = app.createBrowserWindow({
  title: 'Shared context: second webview',
  width: 700,
  height: 500,
  x: 740,
  y: 80,
});

const _firstWebview = firstWindow.createWebview({
  url: 'https://example.com',
  webContext: context,
});
const _secondWebview = secondWindow.createWebview({
  url: 'https://example.com',
  webContext: context,
});

console.log('Shared data directory:', context.dataDirectory);

app.on('application-close-requested', () => app.exit());

app.run();
