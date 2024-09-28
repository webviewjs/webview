import { join } from 'node:path';
import { Application, getWebviewVersion } from '../../index.js';
import { Worker } from 'node:worker_threads';

console.log('Initializing http server worker...');

const worker = new Worker(join(import.meta.dirname, 'server.mjs'), {
  stdout: true,
  stderr: true,
});

worker.on('message', (message) => {
  if (message === 'ready') createWindow();
});

function createWindow() {
  console.log(`Initializing webview (version: ${getWebviewVersion()})`);

  const app = new Application();
  const window = app.createBrowserWindow();

  if (!window.isDevtoolsOpen()) window.openDevtools();
  window.loadUrl('http://localhost:3000');

  app.run();
}
