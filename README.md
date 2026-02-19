# `@webviewjs/webview`

![https://github.com/webviewjs/webview/actions](https://github.com/webviewjs/webview/workflows/CI/badge.svg)

Robust cross-platform webview library for Node.js written in Rust. It is a native binding to [tao](https://github.com/tauri-apps/tao) and [wry](https://github.com/tauri-apps/wry) allowing you to easily manage cross platform windowing and webview.

![preview](https://github.com/webviewjs/webview/raw/main/assets/preview.png)

> [!CAUTION]
> This library is still in development and not ready for production use. Feel free to experiment with it and report any issues you find.

# Installation

```bash
npm install @webviewjs/webview
```

# Supported platforms

| Platform                     | Supported |
| ---------------------------- | --------- |
| x86_64-pc-windows-msvc       | ✅        |
| i686-pc-windows-msvc         | ✅        |
| aarch64-pc-windows-msvc      | ✅        |
| x86_64-apple-darwin          | ✅        |
| aarch64-apple-darwin         | ✅        |
| x86_64-unknown-linux-gnu     | ✅        |
| i686-unknown-linux-gnu       | ✅        |
| aarch64-unknown-linux-gnu    | ✅        |
| armv7-unknown-linux-gnueabihf| ✅        |
| aarch64-linux-android        | ✅        |
| armv7-linux-androideabi      | ✅        |
| x86_64-unknown-freebsd       | ✅        |

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

## Menu System

WebviewJS provides a cross-platform menu system that works on macOS, Windows, and Linux.

### Basic Menu Setup

```js
import { Application, initMenuSystem } from '@webviewjs/webview';

// Initialize menu system (recommended, especially for macOS)
initMenuSystem();

const app = new Application();

// Set global application menu
app.setMenu({
  items: [
    {
      label: "File",
      submenu: {
        items: [
          { id: "new", label: "New", accelerator: "CmdOrCtrl+N" },
          { id: "open", label: "Open", accelerator: "CmdOrCtrl+O" },
          { role: "separator" },
          { id: "quit", label: "Quit", accelerator: "CmdOrCtrl+Q" }
        ]
      }
    },
    {
      label: "Edit",
      submenu: {
        items: [
          { role: "copy" },
          { role: "paste" },
          { role: "cut" },
          { role: "selectall" }
        ]
      }
    }
  ]
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
app.setMenu({ /* ... */ });
```

### Window-Specific Menus

```js
const app = new Application();

// Create window with custom menu
const window = app.createBrowserWindow({
  title: "Custom Window",
  menu: {
    items: [
      {
        id: "window-action",
        label: "Window Action",
        accelerator: "Ctrl+W"
      }
    ]
  }
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
    }`
});

if (!webview.isDevtoolsOpen()) webview.openDevtools();

webview.onIpcMessage((data) => {
    const reply = `You sent ${data.body.toString('utf-8')}`;
    window.evaluateScript(`onIpcMessage("${reply}")`)
})

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