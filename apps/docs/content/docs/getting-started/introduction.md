---
title: 'Concepts'
description: 'The Application, BrowserWindow, Webview, WebContext, and native resources in a WebviewJS application.'
---

WebviewJS exposes native desktop windows and system webviews to JavaScript. Its main objects fit together like this:

```text
Application
  ├─ BrowserWindow
  │    └─ Webview
  ├─ WebContext
  └─ TrayIcon
```

- **`Application`** owns the native event loop and resources created through it, including windows, tray icons, and browser contexts.
- **`BrowserWindow`** is a native operating-system window.
- **`Webview`** is the embedded browser surface attached to a window. It renders with the engine supplied by the platform.
- **`WebContext`** controls browser data shared by webviews, such as cookies and storage.
- **`TrayIcon`** represents an operating-system tray or status-bar icon.

## System webviews

WebviewJS does not bundle Chromium. It uses WebView2 on Windows, WebKit on macOS, and WebKitGTK on Linux and FreeBSD. Android builds use Android's native webview integration. This keeps the application package smaller, but means rendering features and installed engine versions depend on the target system. See [platform notes](../platform/windows) before choosing deployment targets.

## JavaScript runtimes and the native addon

Node.js, Bun, and Deno run the JavaScript layer. N-API loads a platform-specific native addon that connects the runtime to Tao windowing and Wry webviews. The JavaScript API is largely shared, but package resolution and execution differ: Node uses a bare package import, Bun uses its npm-compatible package support, and Deno uses an `npm:` specifier. The scaffolded project targets Node.js; see [installation](./installation) for direct setup and [Create a project](./create-project) for its limits.

## Native resources and JavaScript references

A JavaScript wrapper gives you access to a native object and its listeners. Keep a strong reference to a window, webview, context, or tray icon while your code needs to use it. The `Application` also tracks resources created through it and disposes them during `app.exit()`.

`BrowserWindow`, `Webview`, `WebContext`, `TrayIcon`, and `Application` support `dispose()` and `Symbol.dispose`. Disposal releases the native resource; retaining the JavaScript wrapper does not keep that native resource usable. `isDisposed()` reports the state where the class provides it. See [application lifecycle](../guides/application-lifecycle).

## The event pump

`app.run()` uses a JavaScript timer to call the native event pump about every 16 ms. Each call processes pending GUI events without waiting, so Node.js timers, I/O, and promise callbacks can continue running. `app.runSync()` instead enters the blocking native loop and stops JavaScript execution until it returns. See [Event Loop](./event-loop).

Continue with the [quick start](./quick-start).
