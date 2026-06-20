# `@webviewjs/webview`

![https://github.com/webviewjs/webview/actions](https://github.com/webviewjs/webview/workflows/CI/badge.svg)

Robust cross-platform webview library for Node.js written in Rust. It is a native binding to [winit](https://github.com/rust-windowing/winit) and [wry](https://github.com/tauri-apps/wry) allowing you to easily manage cross platform windowing and webview.

## Highlights

- Non-blocking application pumping. `app.run()` uses a Node timer, so ordinary Node timers and I/O continue running.
- Browser windows, menus, dialogs, cookies, DevTools, and window controls.
- IPC through `window.ipc.postMessage()`, with an optional alias such as `window.bindings`.
- Asynchronous custom protocols, including `app://` asset loading without a local server.
- Promise-based `webview.expose()` namespaces for page-to-Node calls.

![preview](https://github.com/webviewjs/webview/raw/main/assets/preview.png)

> [!CAUTION]
> This library is still in development and not ready for production use. Feel free to experiment with it and report any issues you find.

# Installation

```bash
npm install @webviewjs/webview
```

# Supported platforms

| Platform                      | OS      | Arch  | Supported         |
| ----------------------------- | ------- | ----- | ----------------- |
| x86_64-pc-windows-msvc        | Windows | x64   | ✅                |
| i686-pc-windows-msvc          | Windows | x86   | ✅                |
| aarch64-pc-windows-msvc       | Windows | arm64 | ✅                |
| x86_64-apple-darwin           | macOS   | x64   | ✅                |
| aarch64-apple-darwin          | macOS   | arm64 | ✅                |
| x86_64-unknown-linux-gnu      | Linux   | x64   | ✅                |
| aarch64-unknown-linux-gnu     | Linux   | arm64 | ✅                |
| armv7-unknown-linux-gnueabihf | Linux   | armv7 | ✅                |
| i686-unknown-linux-gnu        | Linux   | x86   | ⚠️ (no CI)        |
| aarch64-linux-android         | Android | arm64 | ⚠️ (experimental) |
| armv7-linux-androideabi       | Android | armv7 | ⚠️ (experimental) |
| x86_64-unknown-freebsd        | FreeBSD | x64   | ⚠️ (no CI)        |

# Examples

## Load external url

```js
import { Application } from '@webviewjs/webview';
// or
const { Application } = require('@webviewjs/webview');

const app = new Application();
const window = app.createBrowserWindow();
const webview = window.createWebview();

webview.loadUrl('https://nodejs.org');

app.run();
```

## Event pumping

`app.run()` does not block the Node.js thread. It pumps pending native events on a timer:

```js
app.run({ interval: 16, ref: true });
```

`interval` defaults to `16` milliseconds and `ref` defaults to `true`. Use `app.pumpEvents()` for manual pumping.

## IPC and exposed functions

The webview page can send messages to Node through `window.ipc.postMessage()`:

```js
const webview = window.createWebview({ ipcName: 'bindings' });
webview.onIpcMessage((message) => console.log(message.body.toString()));
```

`ipcName` adds an alias, so the page can use `window.bindings.postMessage(...)`; `window.ipc` remains available.

For typed request/response style calls, expose a namespace:

```js
webview.expose('native', {
  version: '0.1.4',
  readConfig: async () => JSON.parse(await readFile('./config.json', 'utf8')),
});
```

In the page:

```js
console.log(window.native.version);
const config = await window.native.readConfig();
```

Every exposed function returns a Promise in the page. Values, arguments, and results must be JSON-serializable. Violations use `SerializationError`.

## Asynchronous custom protocols

Register a protocol before creating its webview:

```js
window.registerProtocol('app', async (request) => {
  const filePath = join(process.cwd(), 'dist', new URL(request.url).pathname);
  try {
    return { body: await readFile(filePath), mimeType: 'text/html; charset=utf-8' };
  } catch {
    return { statusCode: 404, body: Buffer.from('Not found'), mimeType: 'text/plain' };
  }
});

window.createWebview({ url: 'app://localhost/index.html' });
```

See [Custom Protocols](docs/guides/custom-protocols.md), [IPC](docs/guides/ipc-messaging.md), and the runnable [custom protocol](examples/custom-protocol.mjs) and [expose](examples/expose.mjs) examples.

## Menu System

WebviewJS provides a cross-platform menu system that works on macOS, Windows, and Linux.

### Basic Menu Setup

```js
import { Application } from '@webviewjs/webview';

const app = new Application();

// Set global application menu
app.setMenu({
  items: [
    {
      label: 'File',
      submenu: {
        items: [
          { id: 'new', label: 'New', accelerator: 'CmdOrCtrl+N' },
          { id: 'open', label: 'Open', accelerator: 'CmdOrCtrl+O' },
          { role: 'separator' },
          { id: 'quit', label: 'Quit', accelerator: 'CmdOrCtrl+Q' },
        ],
      },
    },
    {
      label: 'Edit',
      submenu: {
        items: [{ role: 'copy' }, { role: 'paste' }, { role: 'cut' }, { role: 'selectall' }],
      },
    },
  ],
});

const window = app.createBrowserWindow();
const webview = window.createWebview({ url: 'https://nodejs.org' });

app.run();
```

### Menu Event Handling

```js
import { Application, WebviewApplicationEvent } from '@webviewjs/webview';

const app = new Application();

// Handle menu events
app.bind((event) => {
  if (event.event === WebviewApplicationEvent.CustomMenuClick) {
    const menuEvent = event.customMenuEvent;
    console.log(`Menu item clicked: ${menuEvent.id}`);
    console.log(`From window: ${menuEvent.windowId}`);

    // Handle specific menu items
    switch (menuEvent.id) {
      case 'new':
        console.log('Creating new document...');
        break;
      case 'open':
        console.log('Opening file...');
        break;
      case 'quit':
        app.exit();
        break;
    }
  }
});

// Set up menu...
app.setMenu({
  /* ... */
});
```

### Window-Specific Menus

```js
const app = new Application();

// Create window with custom menu
const window = app.createBrowserWindow({
  title: 'Custom Window',
  menu: {
    items: [
      {
        id: 'window-action',
        label: 'Window Action',
        accelerator: 'Ctrl+W',
      },
    ],
  },
});

// Or check if window has a menu
if (window.hasMenu()) {
  console.log('This window has a menu');
}
```

### Menu Item Options

- **`id`**: Unique identifier for the menu item (used in events)
- **`label`**: Display text for the menu item
- **`enabled`**: Whether the item is clickable (default: true)
- **`accelerator`**: Keyboard shortcut (e.g., "CmdOrCtrl+N", "Alt+F4")
- **`submenu`**: Nested menu items
- **`role`**: Predefined menu items with built-in behavior

### Predefined Menu Roles

- **`"copy"`**: Standard copy action
- **`"paste"`**: Standard paste action
- **`"cut"`**: Standard cut action
- **`"selectall"`**: Select all text action
- **`"separator"`**: Visual separator line

## IPC

```js
const app = new Application();
const window = app.createBrowserWindow();

const webview = window.createWebview({
  html: `<!DOCTYPE html>
    <html>
        <head>
            <title>Webview</title>
        </head>
        <body>
            <h1 id="output">Hello world!</h1>
            <button id="btn">Click me!</button>
            <script>
                btn.onclick = function send() {
                    window.ipc.postMessage('Hello from webview');
                }
            </script>
        </body>
    </html>
    `,
  preload: `window.onIpcMessage = function(data) {
        const output = document.getElementById('output');
        output.innerText = \`Server Sent A Message: \${data}\`;
    }`,
});

if (!webview.isDevtoolsOpen()) webview.openDevtools();

webview.onIpcMessage((data) => {
  const reply = `You sent ${data.body.toString('utf-8')}`;
  window.evaluateScript(`onIpcMessage("${reply}")`);
});

app.run();
```

## Closing the Application

You can close the application, windows, and webviews gracefully to ensure all resources (including temporary folders) are cleaned up properly.

```js
const app = new Application();
const window = app.createBrowserWindow();
const webview = window.createWebview({ url: 'https://nodejs.org' });

// Set up event handler for close events
// You can use either onEvent() or bind() - they are equivalent
app.bind((event) => {
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('Application is closing, cleaning up resources...');
    // Perform cleanup here: save data, close connections, etc.
  }

  if (event.event === WebviewApplicationEvent.WindowCloseRequested) {
    console.log('Window close requested');
    // Perform window-specific cleanup
  }
});

// Close the application gracefully (cleans up temp folders)
app.exit();

// Or hide/show the window
window.hide(); // Hide the window
window.show(); // Show the window again

// Or reload the webview
webview.reload();
```

For more details on closing applications and cleaning up resources, see the [Closing Guide](./docs/CLOSING_GUIDE.md).

Check out [examples](./examples) directory for more examples:

- **[menu-system.mjs](./examples/menu-system.mjs)** - Comprehensive menu system demonstration with all features
- **[window-menus.mjs](./examples/window-menus.mjs)** - Window-specific vs global menu examples
- **[http/](./examples/http/)** - Serving content from a web server to webview
- **[transparent.mjs](./examples/transparent.mjs)** - Transparent window example
- **[close-example.mjs](./examples/close-example.mjs)** - Graceful application closing

Run any example with: `node examples/menu-system.mjs` (after building the project)

# Building executables

> [!WARNING]
> The CLI feature is very experimental and may not work as expected. Please report any issues you find.

You can use [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) feature of Node.js to build an executable file. WebviewJS comes with a helper cli script to make this process easier.

```bash
webview --build --input ./path/to/your/script.js --output ./path/to/output-directory --name my-app
```

You can pass `--resources ./my-resource.json` to include additional resources in the executable. This resource can be imported using `getAsset()` or `getRawAsset()` functions from `node:sea` module.

# Development

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.0
- [Rust](https://www.rust-lang.org/) stable toolchain
- [Node.js](https://nodejs.org/) >= 24 (for testing)

## Setup

```bash
bun install
```

## Build

```bash
bun run build
```
