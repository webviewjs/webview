import { Application, getWebviewVersion } from '../../index.js';
import { Worker } from 'node:worker_threads';

console.log('Initializing http server worker...');

const worker = new Worker(new URL('./server.mjs', import.meta.url).pathname, {
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
