---
name: webviewjs
description: Build and troubleshoot native desktop applications with @webviewjs/webview across Node.js, Bun, and Deno. Use when creating windows, webviews, menus, tray icons, notifications, IPC, custom protocols, or standalone executables with WebviewJS.
---

# WebviewJS

WebviewJS is a typed N-API binding for [tao](https://github.com/tauri-apps/tao)
and [wry](https://github.com/tauri-apps/wry). It creates native desktop
windows with the webview engine supplied by the operating system.

Use the hosted documentation as the API authority:

- [Documentation](https://webview.js.org)
- [Quickstart](https://webview.js.org/quickstart.md)
- [Installation](https://webview.js.org/installation.md)
- [API index](https://webview.js.org/llms.txt)

## Install and prepare the host

Install the package with the package manager used by the application:

```bash
npm install @webviewjs/webview
bun add @webviewjs/webview
pnpm add @webviewjs/webview
```

Use only the command appropriate for the project. Keep optional dependencies
enabled because the platform-specific native addon is delivered through an
optional package.

Native prerequisites vary by host:

- Windows requires WebView2. It is included with Windows 11 and current Edge
  installations; Windows 10 can install it separately.
- macOS requires macOS 10.15 Catalina or later. WebKit is built in.
- Linux requires WebKitGTK 4.1 and `libxdo`. Debian and Ubuntu development
  packages are `libwebkit2gtk-4.1-dev` and `libxdo-dev`.

For the complete prerequisite list, use the [installation
guide](https://webview.js.org/installation.md).

## Create an application

Prefer an explicit `Application` and keep references to the native wrappers
that the application will use:

```js
import { Application } from '@webviewjs/webview';

const app = new Application();
const browserWindow = app.createBrowserWindow({
  title: 'WebviewJS',
  width: 1024,
  height: 768,
});

const webview = browserWindow.createWebview({
  url: 'https://example.com',
});

app.run();
```

Use `html` instead of `url` for inline content. Treat them as mutually
exclusive. The application owns native resources created through it, and
`app.exit()` provides an explicit shutdown path:

```js
process.on('SIGINT', () => app.exit());
```

Read the [Application API](https://webview.js.org/api/application.md),
[BrowserWindow API](https://webview.js.org/api/browser-window.md), and
[Webview API](https://webview.js.org/api/webview.md) before relying on
platform-specific behavior.

## Use common features

- IPC from a page to Node uses `window.ipc.postMessage()` and
  `webview.onIpcMessage(...)`.
- Promise-based page-to-Node calls use `webview.expose(name, target)` and
  return JSON-serializable values.
- Custom URL schemes are registered on the `BrowserWindow` before creating the
  webview, then loaded with URLs such as `app://localhost/index.html`.
- Menus, tray icons, and notifications are native APIs. Use their event
  handlers for application actions and dispose explicitly when ownership is
  no longer needed.

Use the [IPC guide](https://webview.js.org/guides/ipc-messaging.md), [custom
protocol guide](https://webview.js.org/guides/custom-protocols.md), [menus
guide](https://webview.js.org/guides/menus.md), and [system tray
guide](https://webview.js.org/guides/tray.md) for complete examples.

## Respect native platform boundaries

The `.node` addon is compiled for one operating system and architecture. The
package manager selects the matching optional package for the current host,
but it cannot make a native addon portable.

- Build and run on the target operating system and architecture.
- An ia32 Linux application needs i386 WebKitGTK, GTK 3, libsoup 3, GLib,
  Cairo, Pango, ATK, GDK Pixbuf, and libxdo libraries at runtime.
- Do not mix an amd64 native library with an ia32 addon, or vice versa.
- Guard platform-specific APIs and verify behavior on each platform that the
  application supports.

## Build a standalone executable

The `webview --build` CLI delegates to the selected JavaScript runtime:

- Node.js uses Node's Single Executable Application (SEA) workflow.
- Deno uses `deno compile`.
- Bun uses `bun build --compile`.

This CLI is not a desktop installer builder, package manager, or general
application bundler. It does not perform cross-compilation. Build on the
target operating system and architecture so the matching WebviewJS `.node`
addon is available, or prepare that addon and its runtime toolchain manually
before packaging. Use platform distribution tools for installers, signing,
notarization, and release metadata.

See the [standalone executable guide](https://webview.js.org/guides/building-executables.md)
for runtime-specific options and asset handling.

## Troubleshoot systematically

1. Confirm the runtime version and package manager installation. WebviewJS
   currently requires Node.js 24 or newer when running under Node.
2. Confirm optional dependencies were not disabled during installation.
3. On Linux, verify the native dependency is visible through `pkg-config`, for
   example `pkg-config --modversion webkit2gtk-4.1` and
   `pkg-config --modversion gtk+-3.0`.
4. Confirm the process architecture matches the native addon and installed
   libraries.
5. Reduce the app to one `Application`, one `BrowserWindow`, and one webview
   before investigating feature-specific behavior.

When reporting an issue, include the operating system, architecture, runtime,
WebviewJS version, package manager, and the exact native dependency or loader
error.
