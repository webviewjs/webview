---
title: 'Quick Start'
---

## Create a project

Create a starter application with the official scaffolder:

```sh
npm create webview@latest
```

You can pass the project directory directly with `npm create webview@latest
my-app`. The alternate command `npm create webview-app@latest` invokes the same
scaffolder; `create-webview` is the canonical package name.

## Minimal example

If you prefer to start from an existing project, install WebviewJS directly:

```sh
npm install @webviewjs/webview
```

```js
import { Application, BrowserWindow } from '@webviewjs/webview';

const app = new Application();

const win = app.createBrowserWindow({
  title: 'My App',
  width: 1024,
  height: 768,
});

const webview = win.createWebview({ url: 'https://example.com' });

app.run();
```

## Loading local HTML

```js
const webview = win.createWebview({
  html: '<h1>Hello from WebviewJS</h1>',
});
```

## Reacting to window events

```js
app.on('window-close-requested', () => {
  console.log('A window was closed');
});

app.on('application-close-requested', () => {
  console.log('All windows closed; exiting');
  app.exit();
});

app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log('Menu item clicked:', customMenuEvent.id);
});
```

## Retaining native handles

Keep strong references to windows, webviews, contexts, and tray icons while
you need their wrapper methods or event listeners. Store handles in
application state instead of discarding creation results.

The root `Application` owns their native resources. Calling `app.exit()`
disposes all root-created resources. Retained wrappers subsequently return
`true` from `isDisposed()` and reject further method calls.

## IPC

```js
const webview = win.createWebview({
  html: `
    <button onclick="window.ipc.postMessage('ping')">Ping</button>
  `,
});

webview.onIpcMessage((msg) => {
  console.log('IPC body:', msg.body.toString());
  webview.evaluateScript('document.body.style.background = "lime"');
});
```

For asynchronous page-to-Node calls, use `webview.expose()`:

```js
webview.expose('native', {
  getGreeting: async (name) => `Hello, ${name}`,
});
```

The page calls `await window.native.getGreeting('Ada')`.

## Using `Symbol.dispose` (auto-cleanup)

```js
{
  using app = new Application();
  // …
} // app.exit() is called automatically
```

Each `BrowserWindow`, `Webview`, `WebContext`, and `TrayIcon` also supports
`dispose()` and `Symbol.dispose` for early cleanup.
