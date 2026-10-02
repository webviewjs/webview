---
title: 'Quick start'
description: 'Install WebviewJS, create a native window, load a page, and start the event pump.'
---

Create a Node.js project with the starter template:

```sh
npm create webview@latest my-app
cd my-app
npm run dev
```

For an existing project, install the package with your runtime's package manager. See [Installation](./installation) for Node.js, Bun, and Deno imports.

The creator's scripts target Node.js. If you save the example below as `src/main.ts`, Node.js runs it with `node src/main.ts` and Bun runs it with `bun src/main.ts`; both use the bare package import. To run it with Deno, change the import to `npm:@webviewjs/webview`, configure the local N-API package setup in [Installation](./installation#running-with-deno), and run `deno run --allow-ffi --allow-read src/main.ts`. The creator does not generate Deno-specific source or scripts.

## Create a window

```js
import { Application } from '@webviewjs/webview';

const app = new Application();
const win = app.createBrowserWindow({
  title: 'My App',
  width: 900,
  height: 640,
});
const webview = win.createWebview({
  html: '<main><h1>Hello from WebviewJS</h1><p>The system webview is running.</p></main>',
});

app.run();
```

`Application` owns the native event loop. `BrowserWindow` creates the OS window, and `createWebview()` attaches the system browser surface. Keep references to objects whose methods or event listeners you will use. See [Concepts](./introduction) for the object model.

## Choose what to load

Choose one source when creating a webview. For a remote page:

```js
win.createWebview({ url: 'https://example.com' });
```

For a small page, pass an HTML string:

```js
win.createWebview({
  html: '<main><h1>Hello</h1><p>Rendered in a native window.</p></main>',
});
```

For a packaged application with multiple local files, register a custom protocol and serve the files from it. See [Loading application content](../guides/loading-content) and [Custom Protocols](../guides/custom-protocols).

## Handle page-to-host calls

For the `webview` created above, expose a named host function:

```js
webview.expose('native', { greet: (name) => `Hello, ${name}` });
```

The page can call `await window.native.greet('Ada')`. Raw `window.ipc.postMessage()` is also available for one-way messages. See [IPC Messaging](../guides/ipc-messaging) for both transports and their serialization rules.

## Clean up

`app.exit()` disposes resources created through the application. The `Application`, `BrowserWindow`, `Webview`, `WebContext`, and `TrayIcon` wrappers also support `dispose()` and `Symbol.dispose` for explicit cleanup. A user close request follows a separate lifecycle path; see [Application lifecycle](../guides/application-lifecycle).
