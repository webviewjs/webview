# `@webviewjs/webview`

[![CI](https://github.com/webviewjs/webview/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/webviewjs/webview/actions/workflows/CI.yml)
[![npm](https://img.shields.io/npm/v/%40webviewjs%2Fwebview?logo=npm)](https://www.npmjs.com/package/@webviewjs/webview)
[![License](https://img.shields.io/github/license/webviewjs/webview)](https://github.com/webviewjs/webview/blob/main/LICENSE)

Build lightweight native desktop applications with JavaScript and the webview
engine already provided by the operating system. WebviewJS is a typed N-API
binding to [tao](https://github.com/tauri-apps/tao) and
[wry](https://github.com/tauri-apps/wry), with a small JavaScript surface and
first-class support for Node.js, Bun, and Deno.

It is a good fit for utilities, internal tools, desktop companions, and
existing web applications that need a native window without bundling a second
browser engine.

[Get started](https://webview.js.org/getting-started/quick-start) ·
[API reference](https://webview.js.org/api/application) ·
[Examples](https://github.com/webviewjs/webview/tree/main/apps/examples) ·
[Platform notes](https://webview.js.org/platform/linux)

![WebviewJS preview](https://github.com/webviewjs/webview/raw/main/assets/preview.png)

## Highlights

- Native windows backed by WebView2, WebKit, or WebKitGTK instead of a bundled browser runtime.
- Non-blocking event pumping that keeps ordinary JavaScript timers and I/O responsive.
- Typed APIs for windows, webviews, menus, dialogs, cookies, DevTools, and window controls.
- Shared browser contexts for profiles, cookies, cache, storage, and automation.
- System tray icons, native notifications, and platform-specific window extensions.
- IPC through `window.ipc.postMessage()` plus Promise-based `webview.expose()` namespaces.
- Fetch-compatible asynchronous custom protocols, including Hono routing without an HTTP server.
- A CLI for compiling Node.js, Deno, or Bun applications into standalone executables.

> [!NOTE]
> WebviewJS provides the native window and webview layer. It is intentionally
> smaller than an application framework such as Electron or Tauri, so you can
> choose your own frontend, routing, state management, and build tools.

## Documentation

The complete documentation is available at [webview.js.org](https://webview.js.org). Documentation tools and assistants can use [`llms.txt`](https://webview.js.org/llms.txt), the full [`llms-full.txt`](https://webview.js.org/llms-full.txt), or per-page Markdown such as [`/api/application.md`](https://webview.js.org/api/application.md).

### Getting started

|                                                                     |                                 |
| ------------------------------------------------------------------- | ------------------------------- |
| [Installation](https://webview.js.org/getting-started/installation) | System requirements and setup   |
| [Quick Start](https://webview.js.org/getting-started/quick-start)   | Your first window in minutes    |
| [Event Loop](https://webview.js.org/getting-started/event-loop)     | How the non-blocking pump works |

### API reference

|                                                            |                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [Application](https://webview.js.org/api/application)      | Root object, event loop, windows, menus               |
| [BrowserWindow](https://webview.js.org/api/browser-window) | OS window, size, position, cursor, decorations        |
| [Webview](https://webview.js.org/api/webview)              | Embedded browser, navigation, cookies, script, bounds |
| [WebContext](https://webview.js.org/api/web-context)       | Shared browser data, profiles, and automation         |
| [System Tray](https://webview.js.org/api/tray)             | Tray icons, menus, updates, and pointer events        |
| [Notification](https://webview.js.org/api/notification)    | Native desktop notifications and lifecycle events     |
| [Menu](https://webview.js.org/api/menu)                    | Native menu bar construction                          |
| [Types](https://webview.js.org/api/types)                  | Shared interfaces and enums                           |

### Guides

|                                                                            |                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [Building Executables](https://webview.js.org/guides/building-executables) | Compile to `.exe` / binary with node, deno, bun |
| [IPC Messaging](https://webview.js.org/guides/ipc-messaging)               | Page ↔ Node communication                       |
| [Menus](https://webview.js.org/guides/menus)                               | Building menu bars with roles and accelerators  |
| [Multiple Windows](https://webview.js.org/guides/multiple-windows)         | Managing several windows                        |
| [Cookies & Storage](https://webview.js.org/guides/cookies-and-storage)     | Reading, writing, and clearing cookies          |
| [Custom Protocols](https://webview.js.org/guides/custom-protocols)         | Serving local content to the webview            |

### Platform notes

|                                                    |                                           |
| -------------------------------------------------- | ----------------------------------------- |
| [Windows](https://webview.js.org/platform/windows) | WebView2, taskbar, DPI                    |
| [macOS](https://webview.js.org/platform/macos)     | WebKit, main-thread requirement, app menu |
| [Linux](https://webview.js.org/platform/linux)     | WebKitGTK, Wayland/X11, menu limitations  |
| [iOS](https://webview.js.org/platform/ios)         | Orientation, status bar, and gestures     |
| [Android](https://webview.js.org/platform/android) | Content rectangle and configuration       |

## Installation

Install the package with your preferred JavaScript package manager. The native
platform package is resolved automatically through optional dependencies.

```bash
npm install @webviewjs/webview
# or
bun add @webviewjs/webview
# or
pnpm add @webviewjs/webview
```

Keep optional dependencies enabled when installing. They contain the native
addon selected for the current operating system and architecture.

### System requirements

| Platform        | Requirements                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Windows         | WebView2. It ships with Windows 11 and current Edge installations; Windows 10 can install it automatically. |
| macOS           | macOS 10.15 Catalina or later. WebKit is built in.                                                          |
| Linux           | WebKitGTK 4.1 and `libxdo`. See the [Linux platform guide](https://webview.js.org/platform/linux).          |
| Android and iOS | Native project setup and platform SDKs. See the [hosted documentation](https://webview.js.org).             |

For distribution and platform-specific behavior, review the complete
[installation guide](https://webview.js.org/getting-started/installation) before shipping.

## Supported platforms

| Target                          | Platform | Architecture | Status       | Notes                                          |
| ------------------------------- | -------- | ------------ | ------------ | ---------------------------------------------- |
| `x86_64-pc-windows-msvc`        | Windows  | x64          | Supported    | WebView2                                       |
| `i686-pc-windows-msvc`          | Windows  | x86          | Supported    | WebView2                                       |
| `aarch64-pc-windows-msvc`       | Windows  | arm64        | Supported    | WebView2                                       |
| `x86_64-apple-darwin`           | macOS    | x64          | Supported    | WebKit                                         |
| `aarch64-apple-darwin`          | macOS    | arm64        | Supported    | WebKit                                         |
| `x86_64-unknown-linux-gnu`      | Linux    | x64          | Supported    | WebKitGTK 4.1, X11, and Wayland                |
| `i686-unknown-linux-gnu`        | Linux    | x86          | Supported    | WebKitGTK 4.1, X11, and Wayland                |
| `aarch64-unknown-linux-gnu`     | Linux    | arm64        | Supported    | WebKitGTK 4.1, X11, and Wayland                |
| `armv7-unknown-linux-gnueabihf` | Linux    | armv7        | Supported    | WebKitGTK 4.1, X11, and Wayland                |
| `aarch64-linux-android`         | Android  | arm64        | Experimental | Platform APIs are still evolving               |
| `armv7-linux-androideabi`       | Android  | armv7        | Experimental | Platform APIs are still evolving               |
| `x86_64-unknown-freebsd`        | FreeBSD  | x64          | Stub         | Package resolution only; no GUI implementation |

## Examples

### Quick start

```js
import { Application } from '@webviewjs/webview';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'WebviewJS',
  width: 1024,
  height: 768,
});

window.createWebview({ url: 'https://example.com' });
app.run();
```

For CommonJS projects, use the same API through `require()`:

```js
const { Application } = require('@webviewjs/webview');

const app = new Application();
const window = app.createBrowserWindow({ title: 'WebviewJS' });
window.createWebview({ html: '<h1>Hello from WebviewJS</h1>' });
app.run();
```

The application owns native resources created through it. Call `app.exit()`
when your application needs to shut down explicitly:

```js
process.on('SIGINT', () => {
  app.exit();
});
```

### Event pumping

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

### System tray

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

See the [system tray reference](https://webview.js.org/api/tray) and
[runnable tray example](https://github.com/webviewjs/webview/blob/main/apps/examples/tray.mjs).

### Notifications

```js
import { Notification } from '@webviewjs/webview';

const notification = new Notification('Build complete', {
  body: 'The release executable is ready.',
});

notification.on('click', () => console.log('notification clicked'));
notification.on('error', ({ error }) => console.error(error));
```

Notification permission is always `"granted"` for native applications. See the
[notification reference](https://webview.js.org/api/notification) and
[runnable notification example](https://github.com/webviewjs/webview/blob/main/apps/examples/notification.mjs).

### IPC and exposed functions

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

### Asynchronous custom protocols

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

See [Custom Protocols](https://webview.js.org/guides/custom-protocols), [IPC](https://webview.js.org/guides/ipc-messaging), and the runnable [custom protocol](https://github.com/webviewjs/webview/blob/main/apps/examples/custom-protocol.mjs) and [expose](https://github.com/webviewjs/webview/blob/main/apps/examples/expose.mjs) examples.

### Menu system

WebviewJS provides a cross-platform menu system that works on macOS, Windows, and Linux.

#### Basic menu setup

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

#### Menu event handling

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
app.setMenu({/* ... */});
```

#### Window-specific menus

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

#### Menu item options

- **`id`**: Unique identifier for the menu item (used in events)
- **`label`**: Display text for the menu item
- **`enabled`**: Whether the item is clickable (default: true)
- **`accelerator`**: Keyboard shortcut (e.g., "CmdOrCtrl+N", "Alt+F4")
- **`submenu`**: Nested menu items
- **`role`**: Predefined menu items with built-in behavior

#### Predefined menu roles

- **`"copy"`**: Standard copy action
- **`"paste"`**: Standard paste action
- **`"cut"`**: Standard cut action
- **`"selectall"`**: Select all text action
- **`"separator"`**: Visual separator line

### IPC

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

### Closing the application

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

For more details on application lifecycle and disposal, see the
[Application API reference](https://webview.js.org/api/application) and the
[closing example](https://github.com/webviewjs/webview/blob/main/apps/examples/close-example.mjs).

### Keep strong references

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

Check out [examples](https://github.com/webviewjs/webview/tree/main/apps/examples) directory for more examples:

- **[menu-system.mjs](https://github.com/webviewjs/webview/blob/main/apps/examples/menu-system.mjs)** - Comprehensive menu system demonstration with all features
- **[window-menus.mjs](https://github.com/webviewjs/webview/blob/main/apps/examples/window-menus.mjs)** - Window-specific vs global menu examples
- **[http/](https://github.com/webviewjs/webview/tree/main/apps/examples)** - Serving content from a web server to webview
- **[transparent.mjs](https://github.com/webviewjs/webview/blob/main/apps/examples/transparent.mjs)** - Transparent window example
- **[close-example.mjs](https://github.com/webviewjs/webview/blob/main/apps/examples/close-example.mjs)** - Graceful application closing

Run an example after building the package with: `node apps/examples/menu-system.mjs`.

## Building executables

Build a standalone executable with Node.js by default, or choose Bun or Deno:

```bash
npm install @webviewjs/webview
npx webview build src/main.ts
npx webview build src/main.ts --runtime bun
npx webview build src/main.ts --runtime deno
```

The output goes to `./dist` by default. Set `--name`, `--out-dir`, `--target`,
and repeat `--asset` as needed. Use `--resources` for the legacy Node SEA JSON
asset map. Node SEA embeds WebviewJS's native addon; Bun and Deno builds also
require the matching target-specific native package.
Node SEA is host-only. Bun and Deno accept cross-target identifiers, but only
the current host builds have integration smoke coverage in this repository.
The CLI does not create installers or perform Windows certificate signing.

For runtime-specific details, asset embedding, code signing, and release
guidance, see [Building Executables](https://webview.js.org/guides/building-executables).

The old `webview --build --input <entry>` form remains temporarily available
and prints a deprecation warning.

## Agent skill

This repository includes a reusable WebviewJS skill for coding agents. Install
it with:

```bash
npx skills add webviewjs/webview
```

It covers application structure, native prerequisites, platform constraints,
API patterns, and executable builds.

## Development

The published library is in `packages/webview`, runnable examples are in
`apps/examples`, and the documentation website is in `apps/docs`.

### Prerequisites

- [Bun](https://bun.sh/) 1.3.14
- [Rust](https://www.rust-lang.org/) stable toolchain
- [Node.js](https://nodejs.org/) >= 24 (for testing)

### Setup

```bash
bun install
```

### Build and run an example

```bash
bun --filter @webviewjs/webview build
node apps/examples/simple.mjs
```

The native build requires the platform's Rust and GUI development dependencies.
To build only the TypeScript layer, run `bun --filter @webviewjs/webview build:lib`.

### Repository commands

```bash
bun run dev          # Start the documentation app
bun run build        # Build the native package and static docs
bun run test         # Run Node's built-in test runner
bun run lint         # Run Oxlint across the repository
bun run lint:fix
bun run format       # Format JS/TS/MD and Rust source
bun run format:check
bun run check        # Cargo check and docs type check
bun run clippy
```

The docs workspace can also be run on its own with `bun --filter @webviewjs/docs dev` or built with `bun --filter @webviewjs/docs build`.

```

```
