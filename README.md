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

| Platform                | Supported |
| ----------------------- | --------- |
| x86_64-apple-darwin     | ✅        |
| x86_64-pc-windows-msvc  | ✅        |
| i686-pc-windows-msvc    | ✅        |
| aarch64-apple-darwin    | ✅        |
| aarch64-linux-android   | ✅        |
| armv7-linux-androideabi | ✅        |
| aarch64-pc-windows-msvc | ✅        |

# Important Notes

## GTK Singleton Limitation on Linux

On Linux, GTK is implemented as a singleton, which means you can only create **one `Application` instance**. If you try to create multiple `Application` instances, the second one will fail with an error like:

```
Failed to initialize gtk backend!: Ya existe un objeto exportado para la interfaz org.gtk.Application
```

**Correct approach for multiple windows:**

```js
// ✅ Correct: Single Application with multiple BrowserWindows
const app = new Application();
const window1 = app.createBrowserWindow();
const window2 = app.createBrowserWindow();
app.run();
```

**Incorrect approach:**

```js
// ❌ Incorrect: Multiple Application instances (will fail on Linux)
const app1 = new Application();
const app2 = new Application(); // This will crash!
```

This limitation is specific to Linux. On Windows and macOS, you can create multiple Application instances, though it's still recommended to use a single Application instance for consistency.

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

Check out [examples](./examples) directory for more examples, such as serving contents from a web server to webview, etc.

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
- [Node.js](https://nodejs.org/) >= 18 (for testing)

## Setup

```bash
bun install
```

## Build

```bash
bun run build
```