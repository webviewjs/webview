---
title: 'Installation'
description: 'Install WebviewJS with Node.js, Bun, or Deno and check the platform webview dependencies.'
---

WebviewJS ships a platform-specific N-API addon as an optional dependency. Install the package with the manager for your runtime; a Rust toolchain is not needed when a matching prebuilt addon is available.

## Install the package

**Node.js** (Node.js 24 or newer):

```sh
npm install @webviewjs/webview
```

**Bun:**

```sh
bun add @webviewjs/webview
```

**Deno 2:**

```sh
deno add npm:@webviewjs/webview
```

Node.js and Bun use a bare package import:

```js
import { Application } from '@webviewjs/webview';
```

Deno uses an npm specifier:

```ts
import { Application } from 'npm:@webviewjs/webview';
```

The package declares Node.js `>=24`. Bun and Deno load the same platform addon through their Node/N-API compatibility layers; their package installation and command-line behavior differ.

### Running with Deno

Deno needs a local `node_modules` directory to load this N-API package and `--allow-ffi` permission for the native addon. Configure `deno.json` before installing:

```json
{
  "nodeModulesDir": "auto"
}
```

Then install and run your app. Add the filesystem or other permissions required by your own application:

```sh
deno add npm:@webviewjs/webview
deno run --allow-ffi --allow-read src/main.ts
```

See [Deno's Node-API guidance](https://docs.deno.com/runtime/fundamentals/node/#use-packages-with-native-addons) for its native-addon requirements. See [platform notes](../platform/windows) for native targets. Deno executable builds require Deno 2; see [Building standalone executables](../guides/building-executables).

## System requirements

The embedded browser engine is supplied by the operating system. The app does not include a browser runtime.

| Platform | Runtime dependency                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | Microsoft Edge WebView2 Runtime. Install it separately if the target computer does not have it; see [Windows](../platform/windows). |
| macOS    | System WebKit.                                                                                                                      |
| Linux    | WebKitGTK 4.1, GTK 3, libsoup 3, and `libxdo`.                                                                                      |
| FreeBSD  | GTK 3, WebKitGTK 4.1, libsoup 3, and `xdotool`/`libxdo`; see [FreeBSD](../platform/freebsd).                                        |
| Android  | Android native webview support; Android addons are published for arm64 and armv7, with more limited feature coverage.               |
| iOS      | There is no published iOS N-API package. Experimental app-embedding builds are available on macOS; see [iOS](../platform/ios).      |

On Debian and Ubuntu, install the packages used by the repository's Linux build:

```sh
sudo apt install pkg-config libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libglib2.0-dev libcairo2-dev libpango1.0-dev libatk1.0-dev \
  libgdk-pixbuf-2.0-dev libgtk-3-dev libxdo-dev
```

Other Linux distributions need equivalent WebKitGTK 4.1, libsoup 3, GTK 3, and XDoTool development packages.

The available native package targets are listed in the [platform guide](../platform/windows). A package target indicates that an addon can be installed or built; it does not guarantee desktop feature parity.

## Create a project

For a Node.js starter, use the project creator:

```sh
npm create webview@latest my-app
cd my-app
npm run dev
```

See [Create a project](./create-project) for templates and flags. To start in an existing project, install the package with the runtime-specific command above, then follow the [quick start](./quick-start).

## Building from source

Building the monorepo requires Bun 1.4.2 and the stable Rust toolchain. From the repository root:

```sh
bun install
bun --filter @webviewjs/webview build
```

This builds the platform-specific addon, regenerates N-API bindings, and compiles the TypeScript API layer. The generated bindings are repository build outputs; applications consuming the published package do not need to generate them.
