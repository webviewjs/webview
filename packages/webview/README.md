# `@webviewjs/webview`

[![CI](https://github.com/webviewjs/webview/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/webviewjs/webview/actions/workflows/CI.yml)
[![npm](https://img.shields.io/npm/v/%40webviewjs%2Fwebview?logo=npm)](https://www.npmjs.com/package/@webviewjs/webview)
[![License](https://img.shields.io/github/license/webviewjs/webview)](https://github.com/webviewjs/webview/blob/main/LICENSE)

Build desktop applications with JavaScript and the webview already provided by the operating system.

WebviewJS is a typed N-API binding built on [`tao`](https://github.com/tauri-apps/tao) and [`wry`](https://github.com/tauri-apps/wry). It works with Node.js, Bun, and Deno without bundling a browser engine.

[Documentation](https://webview.js.org) · [Quick start](https://webview.js.org/getting-started/quick-start) · [API](https://webview.js.org/api/application) · [Examples](https://github.com/webviewjs/webview/tree/main/apps/examples)

![WebviewJS preview](https://github.com/webviewjs/webview/raw/main/assets/preview.webp)

## Get started

Create a new application:

```bash
npm create webview@latest
```

Or install WebviewJS directly:

```bash
npm install @webviewjs/webview
```

## Example

```js
import { Application } from '@webviewjs/webview';

const app = new Application();

const window = app.createBrowserWindow({
  title: 'My App',
  width: 900,
  height: 600,
});

const webview = window.createWebview({
  html: `
    <h1>Hello from WebviewJS</h1>
    <button onclick="native.ping().then(console.log)">
      Ping native
    </button>
  `,
});

webview.expose('native', {
  ping: () => 'pong',
});

app.run();
```

`Application` owns the native event loop and windows. `BrowserWindow` creates native OS windows, while `Webview` embeds the system webview and can communicate with JavaScript running inside it.

See the [documentation](https://webview.js.org) for IPC, menus, system tray, notifications, custom protocols, browser contexts, cookies, multiple windows, and platform-specific APIs.

## Platforms

WebviewJS uses the webview provided by each platform:

- Windows: WebView2
- macOS: WebKit
- Linux: WebKitGTK

Android, iOS, and FreeBSD targets are experimental.

See the [platform documentation](https://webview.js.org) for requirements and platform-specific behavior.

## Build executables

The included CLI can package WebviewJS applications with Node.js, Bun, or Deno:

```bash
npx webview build src/main.ts
```

See [Building Executables](https://webview.js.org/guides/building-executables) for runtime options, assets, targets, and distribution.

## License

MIT
