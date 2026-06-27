import { Application, getWebviewVersion } from '../../index.js';
import { createServer } from './server.mjs';

async function createWindow() {
  console.log('Initializing http server...');
  await createServer();

  console.log(`Initializing webview (version: ${getWebviewVersion()})`);

  const app = new Application();
  const window = app.createBrowserWindow();
  const webview = window.createWebview();

  if (!webview.isDevtoolsOpen()) webview.openDevtools();
  webview.loadUrl('http://localhost:3000');

  app.run();
}

await createWindow();
