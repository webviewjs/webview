# Custom Protocols

Custom protocols handle URL schemes such as `app://` without starting a local HTTP server. Register each scheme before creating a webview.

```js
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Application } from '@webviewjs/webview';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css',
};

const app = new Application();
const win = app.createBrowserWindow();

win.registerProtocol('app', async (request) => {
  const url = new URL(request.url);
  const path = join(process.cwd(), 'dist', url.pathname);

  try {
    return new Response(await readFile(path), {
      headers: { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' },
    });
  } catch {
    return new Response(`Not found: ${url.pathname}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});

win.createWebview({ url: 'app://localhost/index.html' });
app.run();
```

The handler receives the standard global Fetch API `Request`. It may return a
`Response`, a Promise of a `Response`, or the legacy plain object shown below.
This makes Fetch-compatible routers such as Hono usable directly. Rejected
handlers and thrown errors become a `500 text/plain` response.

## Hono

Forward the request directly to a Hono application. Hono returns a standard
Fetch API `Response`, so no adapter or HTTP server is required:

```js
import { Hono } from 'hono';

const router = new Hono();

router.get('/*', (context) => {
  return context.html(`<h1>Current page: ${context.req.path}</h1>`);
});

win.registerProtocol('app', (request) => router.fetch(request));
win.createWebview({ url: 'app://localhost/' });
```

The runnable [Hono custom protocol example](../../examples/custom-protocol-hono.mjs)
includes dynamic pages, navigation links, pathname rendering, and application
shutdown handling.

## Request and response types

```ts
interface CustomProtocolResponse {
  body: Buffer;
  statusCode?: number; // default: 200
  mimeType?: string; // default: application/octet-stream
  headers?: HeaderData[];
}
```

## Security

Never resolve a request path without checking it remains inside the intended asset directory. Normalize and validate the path before passing it to the file system. The runnable [custom protocol example](../../examples/custom-protocol.mjs) includes this check.

## Multiple protocols

Register multiple schemes before `createWebview()`:

```js
win.registerProtocol('app', appHandler);
win.registerProtocol('api', async (request) => {
  const response = await fetch(`https://example.test${new URL(request.url).pathname}`);
  return response;
});
```

Protocol registrations are fixed when the webview is created. Registering a scheme after `createWebview()` does not affect an existing webview.

## CORS and cache headers

Use response headers when the page needs them:

```js
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  },
});
```
