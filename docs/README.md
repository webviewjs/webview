# WebviewJS Documentation

WebviewJS is a Node.js binding for creating native desktop windows with an embedded browser view, powered by [wry](https://github.com/tauri-apps/wry) and [winit](https://github.com/rust-windowing/winit).

## Getting started

| | |
|---|---|
| [Installation](./getting-started/installation.md) | System requirements and setup |
| [Quick Start](./getting-started/quick-start.md) | Your first window in minutes |
| [Event Loop](./getting-started/event-loop.md) | How the non-blocking pump works |

## API reference

| | |
|---|---|
| [Application](./api/application.md) | Root object — event loop, windows, menus |
| [BrowserWindow](./api/browser-window.md) | OS window, size, position, cursor, decorations |
| [Webview](./api/webview.md) | Embedded browser — navigation, cookies, script, bounds |
| [Menu](./api/menu.md) | Native menu bar construction |
| [Types](./api/types.md) | Shared interfaces and enums |

## Guides

| | |
|---|---|
| [IPC Messaging](./guides/ipc-messaging.md) | Page ↔ Node communication |
| [Menus](./guides/menus.md) | Building menu bars with roles and accelerators |
| [Multiple Windows](./guides/multiple-windows.md) | Managing several windows |
| [Cookies & Storage](./guides/cookies-and-storage.md) | Reading, writing, and clearing cookies |
| [Custom Protocols](./guides/custom-protocols.md) | Serving local content to the webview |

## Platform notes

| | |
|---|---|
| [Windows](./platform/windows.md) | WebView2, taskbar, DPI |
| [macOS](./platform/macos.md) | WebKit, main-thread requirement, app menu |
| [Linux](./platform/linux.md) | WebKitGTK, Wayland/X11, menu limitations |
