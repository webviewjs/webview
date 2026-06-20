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
    return {
      statusCode: 200,
      body: await readFile(path),
      mimeType: MIME[extname(path)] ?? 'application/octet-stream',
    };
  } catch {
    return {
      statusCode: 404,
      body: Buffer.from(`Not found: ${url.pathname}`),
      mimeType: 'text/plain; charset=utf-8',
    };
  }
});

win.createWebview({ url: 'app://localhost/index.html' });
app.run();
```

The handler may return either a response object or a Promise of one. Rejected handlers and thrown errors become a `500 text/plain` response.

## Request and response types

```ts
interface CustomProtocolRequest {
  url: string;
  method: string;
  headers: HeaderData[];
  body?: Buffer;
}

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
  return {
    statusCode: response.status,
    body: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
});
```

Protocol registrations are fixed when the webview is created. Registering a scheme after `createWebview()` does not affect an existing webview.

## CORS and cache headers

Use response headers when the page needs them:

```js
return {
  body,
  mimeType: 'application/json',
  headers: [
    { key: 'Access-Control-Allow-Origin', value: '*' },
    { key: 'Cache-Control', value: 'no-store' },
  ],
};
```
