# `@webviewjs/webview`

![https://github.com/webviewjs/webview/actions](https://github.com/webviewjs/webview/workflows/CI/badge.svg)

Robust cross-platform webview library for Node.js written in Rust.

![preview](https://github.com/twlite/webview/raw/main/assets/preview.png)

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

# Usage

In this example, we will create a simple webview application that loads the Node.js website.

```javascript
import { Application } from '@webviewjs/webview';
// or
const { Application } = require('@webviewjs/webview');

const app = new Application();
const window = app.createBrowserWindow();

window.loadUrl('https://nodejs.org');

app.run();
```

# Examples

Check out [examples](./examples) directory for more examples.

# Building executables

You can use [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) feature of Node.js to build an executable file.
