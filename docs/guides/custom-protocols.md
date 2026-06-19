# Custom Protocols

Custom protocols let you serve content to the webview directly from Node.js without running an HTTP server.

## Registering a handler

```js
const webview = win.createWebview({
  url: 'app://index.html',
  ipcHandler: (msg) => { /* … */ },
});
```

> Custom protocol registration is done through wry's builder API. Expose it in the `WebviewOptions` by adding a `customProtocol` field (see the [contributing guide](../contributing.md)).

## Serving local files (current approach)

Until a dedicated custom protocol API is exposed, load local files by reading them and using `loadHtml` / `evaluateScript`, or launch a local server:

```js
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
};

const server = createServer(async (req, res) => {
  const file = `./dist${req.url}`;
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end();
  }
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const webview = win.createWebview({ url: `http://127.0.0.1:${port}/index.html` });
});
```

## Load HTML directly

For small, self-contained UIs:

```js
const webview = win.createWebview({
  html: `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body><h1>Hello</h1></body>
</html>`,
});
```

## Injecting variables at startup

Use `initializationScript` to pass Node-side data to the page before any script runs:

```js
const config = JSON.stringify({ version: '2.0', theme: 'dark' });

const webview = win.createWebview({
  url: 'http://localhost:3000',
  initializationScript: `window.__config__ = ${config};`,
});
```
