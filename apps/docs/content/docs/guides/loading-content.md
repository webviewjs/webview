---
title: 'Loading application content'
description: 'Choose between a remote URL, inline HTML, and local application assets.'
---

`WebviewOptions` accepts a URL or an HTML string. Choose the source based on how your app is built and where its assets live.

| Source          | Use it for                                                         | Example                                                    |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `url`           | A remote site or a registered custom-protocol URL                  | `win.createWebview({ url: 'https://example.com' })`        |
| `html`          | A small self-contained page or generated markup                    | `win.createWebview({ html: '<h1>Hello</h1>' })`            |
| Custom protocol | A local app with multiple files, a stable origin, or local routing | `win.createWebview({ url: 'app://localhost/index.html' })` |

Use one initial source per webview. You can navigate later with `loadUrl()` or replace the document with `loadHtml()`.

## Inline HTML

Inline HTML is useful for a small utility view or a generated page. It does not copy files into the executable; if the page depends on CSS, scripts, fonts, or images, include those resources separately or serve them through a custom protocol.

```js
const webview = win.createWebview({
  html: '<!doctype html><html><body><h1>Status</h1></body></html>',
});
```

The repository's [HTML example](https://github.com/webviewjs/webview/blob/main/apps/examples/html.ts) shows an inline page.

## Remote URL

Load a remote page directly:

```js
const webview = win.createWebview({ url: 'https://example.com' });
```

For security-sensitive applications, restrict navigation to expected origins with `navigationHandler`; see [Navigation and popups](./navigation-and-popups).

## Local application assets

For a page with multiple local files, register a custom protocol on the `BrowserWindow` before creating the webview. The handler can read files during development and serve the same assets in a packaged app:

```js
win.registerProtocol('app', async (request) => {
  const url = new URL(request.url);
  const asset = await readApplicationAsset(url.pathname);
  return new Response(asset, {
    headers: { 'Content-Type': mimeTypeFor(url.pathname) },
  });
});

const webview = win.createWebview({ url: 'app://localhost/index.html' });
```

Use a path resolver that rejects traversal and keeps the resolved file inside your asset directory. Do not join an untrusted URL path to a directory and read it without validation. The [custom protocol example](https://github.com/webviewjs/webview/blob/main/apps/examples/custom-protocol.ts) shows a guarded file resolver; the [Hono example](https://github.com/webviewjs/webview/blob/main/apps/examples/custom-protocol-hono.ts) serves routes without a local HTTP server.

Custom schemes on Windows are normalized by WebviewJS for WebView2. `autoNormalizeLoadUrl` and `useHttpsScheme` are Windows-specific options; see [Webview creation options](../api/webview#creation-options) and [Custom Protocols](./custom-protocols).

## Embed assets in a standalone executable

`webview build` can embed files with repeatable `--asset` flags. The exact retrieval path depends on the selected executable runtime. The generated Node.js starter uses `node:sea` to read `src/index.html` from the executable and `readFile()` during development. The CLI's [asset and runtime behavior](./building-executables) describes how Node SEA, Bun, and Deno accept assets.

```sh
webview build src/main.ts --asset src/index.html
```

Embedding a file does not automatically make it available at a URL. Your app must read the embedded bytes and return them from a custom-protocol handler, or load its content as inline HTML.
