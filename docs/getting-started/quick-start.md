# Quick Start

## Minimal example

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
app.onEvent((event) => {
  switch (event.event) {
    case WebviewApplicationEvent.WindowCloseRequested:
      console.log('A window was closed');
      break;

    case WebviewApplicationEvent.ApplicationCloseRequested:
      console.log('All windows closed — exiting');
      app.exit();
      break;

    case WebviewApplicationEvent.CustomMenuClick:
      console.log('Menu item clicked:', event.customMenuEvent?.id);
      break;
  }
});
```

## IPC — calling JS from Node

```js
const webview = win.createWebview({
  html: `
    <button onclick="window.ipc.postMessage('ping')">Ping</button>
  `,
  ipcHandler: (msg) => {
    console.log('IPC body:', msg.body.toString());
    // respond by evaluating JS in the page
    webview.evaluateScript('document.body.style.background = "lime"');
  },
});
```

## Using `Symbol.dispose` (auto-cleanup)

```js
{
  using app = new Application();
  // …
} // app.exit() is called automatically
```
