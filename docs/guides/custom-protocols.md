# Custom Protocols

Custom protocols let you handle URL schemes like `app://` or `assets://` directly in Node.js — no local HTTP server needed.

## Registering a protocol

Call `win.registerProtocol()` **before** `win.createWebview()`. The handler receives each request and must return a response object synchronously.

```js
import { Application } from '@webviewjs/webview';
import { readFileSync } from 'fs';
import { join, extname } from 'path';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

const app = new Application();
const win = app.createBrowserWindow({ title: 'My App' });

// Register BEFORE createWebview
win.registerProtocol('app', (request) => {
  const url      = new URL(request.url);
  const filePath = join(__dirname, 'dist', url.pathname);

  try {
    const body     = readFileSync(filePath);
    const mimeType = MIME[extname(filePath)] ?? 'application/octet-stream';
    return { statusCode: 200, body, mimeType };
  } catch {
    return {
      statusCode: 404,
      body: Buffer.from(`Not found: ${url.pathname}`),
      mimeType: 'text/plain',
    };
  }
});

// Now create the webview pointing at your custom scheme
const webview = win.createWebview({ url: 'app://localhost/index.html' });

app.run();
```

## Request object

```ts
interface CustomProtocolRequest {
  url: string;           // full URL — e.g. "app://localhost/index.html?q=1"
  method: string;        // "GET", "POST", etc.
  headers: HeaderData[]; // [{ key, value }]
  body?: Buffer;         // request body (POST/PUT), null for GET
}
```

## Response object

```ts
interface CustomProtocolResponse {
  body: Buffer;                  // response bytes (required)
  mimeType?: string;             // default: "application/octet-stream"
  statusCode?: number;           // default: 200
  headers?: HeaderData[];        // extra response headers
}
```

## Multiple protocols

You can register as many protocols as you need before calling `createWebview`:

```js
win.registerProtocol('assets', assetsHandler);
win.registerProtocol('api',    apiHandler);

const webview = win.createWebview({ url: 'assets://localhost/index.html' });
```

## Dynamic / API-style responses

```js
win.registerProtocol('api', (request) => {
  const url  = new URL(request.url);
  const path = url.pathname;

  if (path === '/config') {
    return {
      statusCode: 200,
      mimeType:   'application/json',
      body:       Buffer.from(JSON.stringify({ theme: 'dark', version: '1.0' })),
    };
  }

  return { statusCode: 404, body: Buffer.from('Not found'), mimeType: 'text/plain' };
});
```

## CORS and response headers

Add custom headers via the `headers` field:

```js
return {
  statusCode: 200,
  body,
  mimeType: 'application/json',
  headers: [
    { key: 'Access-Control-Allow-Origin', value: '*' },
    { key: 'Cache-Control',               value: 'no-store' },
  ],
};
```

## Important notes

- **`registerProtocol` must be called before `createWebview`.**  Protocols are registered with the webview engine at build time and cannot be added or removed afterwards.
- The handler is called **synchronously** on the main thread.  Keep it fast; do not use async I/O or blocking calls that take more than a few milliseconds.
- For truly async work (network fetches, database queries), cache or pre-fetch data before the page requests it, then serve from the cache synchronously.
- On **Linux**, custom protocols may require the webview to be running on X11 or Wayland with WebKitGTK ≥ 2.36.

## Comparison with a local server

| | Custom protocol | Local HTTP server |
|---|---|---|
| Port conflict risk | None | Possible |
| Appears in DevTools network tab | Yes | Yes |
| Supports `fetch()` from the page | Yes | Yes |
| Async handler | No (sync only) | Yes |
| Requires extra dependency | No | No |
| URL shown in address bar | `app://localhost/…` | `http://127.0.0.1:PORT/…` |
