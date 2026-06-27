# `@webviewjs/webview`

![https://github.com/webviewjs/webview/actions](https://github.com/webviewjs/webview/workflows/CI/badge.svg)

Robust cross-platform webview library for Node.js written in Rust. It is a native binding to [winit](https://github.com/rust-windowing/winit) and [wry](https://github.com/tauri-apps/wry) allowing you to easily manage cross platform windowing and webview.

## Highlights

- Promise-based application readiness with optional automatic event pumping.
- Non-blocking application pumping, so ordinary Node timers and I/O continue running.
- Browser windows, menus, dialogs, cookies, DevTools, and window controls.
- Typed EventEmitter APIs for applications, windows, webviews, and system tray icons.
- Shared browser contexts for profile, cookie, cache, and storage isolation.
- Cross-platform system tray icons with menus and runtime updates.
- Native Windows, macOS, X11, Wayland, iOS, and Android window extensions.
- IPC through `window.ipc.postMessage()`, with an optional alias such as `window.bindings`.
- Fetch-compatible asynchronous custom protocols, including Hono routing without an HTTP server.
- Promise-based `webview.expose()` namespaces for page-to-Node calls.

![preview](https://github.com/webviewjs/webview/raw/main/assets/preview.png)

> [!CAUTION]
> This library is still in development and not ready for production use. Feel free to experiment with it and report any issues you find.

See the [full documentation](./) for API references, guides, platform
notes, and runnable examples.

# Documentation

## Getting started

|                                                        |                                 |
| ------------------------------------------------------ | ------------------------------- |
| [Installation](./getting-started/installation) | System requirements and setup   |
| [Quick Start](./getting-started/quick-start)   | Your first window in minutes    |
| [Event Loop](./getting-started/event-loop)     | How the non-blocking pump works |

## API reference

|                                               |                                                        |
| --------------------------------------------- | ------------------------------------------------------ |
| [Application](./api/application)      | Root object — event loop, windows, menus               |
| [BrowserWindow](./api/browser-window) | OS window, size, position, cursor, decorations         |
| [Webview](./api/webview)              | Embedded browser — navigation, cookies, script, bounds |
| [WebContext](./api/web-context)       | Shared browser data, profiles, and automation          |
| [System Tray](./api/tray)             | Tray icons, menus, updates, and pointer events         |
| [Menu](./api/menu)                    | Native menu bar construction                           |
| [Types](./api/types)                  | Shared interfaces and enums                            |

## Guides

|                                                               |                                                 |
| ------------------------------------------------------------- | ----------------------------------------------- |
| [Building Executables](./guides/building-executables) | Compile to `.exe` / binary with node, deno, bun |
| [IPC Messaging](./guides/ipc-messaging)               | Page ↔ Node communication                       |
| [Menus](./guides/menus)                               | Building menu bars with roles and accelerators  |
| [Multiple Windows](./guides/multiple-windows)         | Managing several windows                        |
| [Cookies & Storage](./guides/cookies-and-storage)     | Reading, writing, and clearing cookies          |
| [Custom Protocols](./guides/custom-protocols)         | Serving local content to the webview            |

## Platform notes

|                                       |                                           |
| ------------------------------------- | ----------------------------------------- |
| [Windows](./platform/windows) | WebView2, taskbar, DPI                    |
| [macOS](./platform/macos)     | WebKit, main-thread requirement, app menu |
| [Linux](./platform/linux)     | WebKitGTK, Wayland/X11, menu limitations  |
| [iOS](./platform/ios)         | Orientation, status bar, and gestures     |
| [Android](./platform/android) | Content rectangle and configuration       |


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
let mainWindow = null;
let mainWebview = null;

app.whenReady().then(() => {
  mainWindow = app.createBrowserWindow();
  mainWebview = mainWindow.createWebview({ url: 'https://nodejs.org' });
});
```

## Event pumping

`app.whenReady()` starts the non-blocking event pump by default:

```js
await app.whenReady({ interval: 16, ref: true });
```

For manual startup, disable auto-run:

```js
const ready = app.whenReady({ autoRun: false });
app.run({ interval: 16, ref: true });
await ready;
```

`interval` defaults to `16` milliseconds and `ref` defaults to `true`. Use `app.pumpEvents()` for manual pumping.

## System tray

Keep a strong JavaScript reference when you need to call tray methods or keep
its listeners reachable:

```js
let tray = null;

app.whenReady().then(() => {
  tray = app.createTrayIcon({
    id: 'main',
    icon: { data: rgba, width: 16, height: 16 },
    tooltip: 'My application',
    menu: { items: [{ id: 'quit', label: 'Quit' }] },
  });

  tray.on('click', (event) => console.log(event));
});
```

See the [system tray reference](./api/tray) and
[runnable tray example](./examples/tray.mjs).

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
    return new Response(await readFile(filePath), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});

window.createWebview({ url: 'app://localhost/index.html' });
```

See [Custom Protocols](docs/guides/custom-protocols), [IPC](docs/guides/ipc-messaging), and the runnable [custom protocol](examples/custom-protocol.mjs) and [expose](examples/expose.mjs) examples.

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
import { Application } from '@webviewjs/webview';

const app = new Application();

// Handle menu events
app.on('custom-menu-click', ({ customMenuEvent: menuEvent }) => {
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
  webview.evaluateScript(`onIpcMessage("${reply}")`);
});

app.run();
```

## Closing the Application

You can close the application, windows, and webviews gracefully to ensure all resources (including temporary folders) are cleaned up properly.

```js
const app = new Application();
const window = app.createBrowserWindow();
const webview = window.createWebview({ url: 'https://nodejs.org' });

app.on('application-close-requested', () => {
  console.log('Application is closing, cleaning up resources...');
});

app.on('window-close-requested', () => {
  console.log('Window close requested');
});

// Close the application gracefully (cleans up temp folders)
app.exit();

// Or hide/show the window
window.hide(); // Hide the window
window.show(); // Show the window again

// Or reload the webview
webview.reload();
```

For more details on closing applications and cleaning up resources, see the [Closing Guide](./CLOSING_GUIDE).

## Keep strong references

Retain `BrowserWindow`, `Webview`, `WebContext`, and `TrayIcon` wrappers for as
long as you need to call their methods or retain their JavaScript listeners.
Avoid discarded temporary handles:

```js
const windows = [];

app.whenReady().then(() => {
  const window = app.createBrowserWindow();
  const webview = window.createWebview({ url: 'https://example.com' });
  windows.push({ window, webview });
});
```

The root `Application` owns native resources created through it. `app.exit()`,
`app[Symbol.dispose]()`, and application garbage collection dispose those
resources in shutdown order. Retained wrappers then report `isDisposed() ===
true`, and method calls fail with a disposed error. Individual windows,
webviews, contexts, and tray icons also support `dispose()` and
`Symbol.dispose`.

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

The `webview` CLI compiles your app into a single self-contained executable. The runtime is auto-detected (`Bun` → bun, `Deno` → deno, otherwise Node.js), or you can override it:

```bash
# Auto-detected runtime
webview --build --input ./path/to/your/script.js --output ./dist --name my-app

# Explicit runtime
webview --build --runtime node --input ./src/index.js --name my-app
webview --build --runtime deno --input ./src/index.ts --name my-app
webview --build --runtime bun  --input ./src/index.ts --name my-app
```

| Flag                 | Default       | Description                |
| -------------------- | ------------- | -------------------------- |
| `--runtime` / `-R`   | auto-detected | `node`, `deno`, or `bun`   |
| `--input` / `-i`     | `./index.js`  | Entry file                 |
| `--output` / `-o`    | `./dist`      | Output directory           |
| `--name` / `-n`      | `webviewjs`   | Executable name            |
| `--resources` / `-r` | —             | JSON asset map (node only) |

For the full compilation guide including cross-compilation and code signing, see [Building Executables](./guides/building-executables).

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
