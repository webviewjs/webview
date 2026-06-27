import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Application } from '../index.js';

const directory = fileURLToPath(new URL('./assets/custom-protocol/', import.meta.url));
const root = resolve(directory);
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const app = new Application();
const window = app.createBrowserWindow({ title: 'Custom Protocol Example' });

window.registerProtocol('app', async (request) => {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const filePath = resolve(root, pathname);

  if (relative(root, filePath).startsWith('..')) {
    return {
      statusCode: 403,
      body: Buffer.from('Forbidden'),
      mimeType: 'text/plain; charset=utf-8',
    };
  }

  try {
    return {
      statusCode: 200,
      body: await readFile(filePath),
      mimeType: mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    };
  } catch {
    return {
      statusCode: 404,
      body: Buffer.from(`Not found: ${url.pathname}`),
      mimeType: 'text/plain; charset=utf-8',
    };
  }
});

const webview = window.createWebview({ url: 'app://localhost/index.html' });
webview.openDevtools();
app.run();
