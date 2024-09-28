# `@webviewjs/webview`

![https://github.com/webviewjs/webview/actions](https://github.com/webviewjs/webview/workflows/CI/badge.svg)

Robust cross-platform webview library for Node.js written in Rust.

![preview](https://github.com/twlite/webview/raw/main/assets/preview.png)

# Installation

```bash
npm install @webviewjs/webview
```

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
