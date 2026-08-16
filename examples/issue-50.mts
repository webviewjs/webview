import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
// import fs from 'node:fs';
// import os from 'node:os';
// import path from 'node:path';
import { Application } from '../index.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css',
};
// const userDataDir = path.join(process.env.LOCALAPPDATA || os.homedir(), 'NexfepDevelopment.webview2-data');
// if (!fs.existsSync(userDataDir)) {
//   fs.mkdirSync(userDataDir, { recursive: true });
// }
// process.env.WEBVIEW2_USER_DATA_FOLDER = userDataDir;
const app = new Application();
const win = app.createBrowserWindow({ title: 'My App' });

win.registerProtocol('app', async (request) => {
  const url = new URL(request.url);
  const path = join(process.cwd(), 'test', url.pathname);

  try {
    return new Response(await readFile(path), {
      headers: {
        'Content-Type': MIME[extname(path) as keyof typeof MIME] ?? 'application/octet-stream',
      },
    });
  } catch {
    return new Response(`Not found: ${url.pathname}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});

const webview = win.createWebview();
webview.loadUrl('app://localhost/index.html');
app.run();
