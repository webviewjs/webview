---
title: 'Application'
description: 'Owns the native event loop and the windows, contexts, and tray icons created through it.'
---

`Application` owns the native event loop and root resources. Create one before creating windows, web contexts, or tray icons.

```js
import { Application } from '@webviewjs/webview';

const app = new Application();
const win = app.createBrowserWindow({ title: 'My App' });
const webview = win.createWebview({ html: '<h1>Hello</h1>' });
app.run();
```

## Constructor

```ts
new Application(options?: ApplicationOptions | null)
```

`ApplicationOptions` is retained for compatibility and currently ignored. Its fields are `controlFlow`, `waitTime`, and `exitCode`; they do not configure the current non-blocking pump.

## Event loop and readiness

```ts
app.run(options?: ApplicationRunOptions | null): void
app.runSync(): void
app.stop(): void
app.pumpEvents(): boolean
app.whenReady(options?: ApplicationWhenReadyOptions): Promise<void>
app.isReady(): boolean
```

| Method                   | Behavior                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run({ interval, ref })` | Starts a JavaScript timer that calls `pumpEvents()` every 16 ms by default. Returns immediately. A second call while the timer is active does not replace it. |
| `runSync()`              | Emits `ready` if needed, then enters the native event loop and blocks JavaScript until the application exits.                                                 |
| `stop()`                 | Clears the JavaScript pump timer. Native windows remain open and resources remain allocated.                                                                  |
| `pumpEvents()`           | Processes one non-blocking batch and returns `true` while active, `false` after exit.                                                                         |
| `whenReady()`            | Resolves after the first pump emits `ready`; starts `run()` by default.                                                                                       |
| `isReady()`              | Reports whether readiness has been reached by a pump or `runSync()`.                                                                                          |

`ApplicationRunOptions`:

```ts
interface ApplicationRunOptions {
  interval?: number; // milliseconds; default 16
  ref?: boolean; // whether the timer keeps the runtime alive; default true
}
```

When `ref` is `false`, WebviewJS calls `unref()` on the timer handle. Deno 2.8 and newer provide Node-style timer handles; on earlier Deno 2 releases, keep the default `ref: true`.

`whenReady()` accepts `{ autoRun?: true, interval?: number, ref?: boolean }` or `{ autoRun: false }`. When `autoRun` is false, the caller must pump events; passing `interval` or `ref` then throws.

```js
await app.whenReady();
const win = app.createBrowserWindow();
```

Use `run()` for the normal Node.js/Bun flow where JavaScript async work must continue. See [Event loop](../getting-started/event-loop).

## Create and configure resources

```ts
app.createBrowserWindow(options?: BrowserWindowOptions | null): BrowserWindow
app.createChildBrowserWindow(options?: BrowserWindowOptions | null): BrowserWindow
app.createWebContext(options?: WebContextOptions | null): WebContext
app.createTrayIcon(options: TrayIconOptions): TrayIcon
app.setMenu(options?: MenuOptions | null): void
```

- `createBrowserWindow()` creates a top-level native window.
- `createChildBrowserWindow()` creates a child-marked native window.
- `createWebContext()` creates a browser data context. `new WebContext()` is not supported.
- `createTrayIcon()` creates a native tray icon. Android returns an unsupported-platform error.
- `setMenu()` replaces the application menu definition; pass `null` to clear it. On macOS, clearing restores the default application menu. See [Menu](./menu).

Create the application menu before creating windows that should display it on Windows or GTK-based Linux/FreeBSD. macOS attaches it at the application level. See [BrowserWindow](./browser-window) for window options.

## Application events

`Application` implements Node's `EventEmitter` API and emits these typed events:

| Event                         | When it fires                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`                       | The first `pumpEvents()` call runs, or `runSync()` enters the native event loop.                                                                                                                            |
| `window-close-requested`      | A native close request was allowed by the window's synchronous `close` handlers.                                                                                                                            |
| `application-close-requested` | The last native window was destroyed while an explicit `app.exit()` was not requested. This can follow an allowed OS close request or `win.close()` / `win.dispose()`. Explicit `app.exit()` suppresses it. |
| `custom-menu-click`           | A native menu event arrives through the event pump. Payload includes `customMenuEvent`.                                                                                                                     |

Use `BrowserWindow`'s `close` event to prevent a user close. Application events are notifications and do not provide `preventDefault()`. See [Application lifecycle](../guides/application-lifecycle).

```js
app.on('application-close-requested', () => {
  // The last native window has closed. Application resources are finalizing.
});

app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log(customMenuEvent.id);
});
```

The standard `on`, `once`, `off`, `addListener`, `removeListener`, `removeAllListeners`, `listenerCount`, `listeners`, `rawListeners`, `emit`, and `eventNames` methods are available. Listener registration/removal methods are chainable.

`onEvent(handler)` and `bind(handler)` are legacy aliases for one application-event callback. They may be called with a function or `null`; events are also emitted through the `EventEmitter` API.

## Exit and disposal

```ts
app.exit(): void
app[Symbol.dispose](): void
```

`exit()` marks the application exited and releases its windows, webviews, tray icons, web contexts, menus, and native callbacks. It is terminal: later resource creation fails. It does not hide windows for reuse. Call `stop()` only when stopping the pump while keeping native resources alive.

The application tracks native resources independently of whether JavaScript still holds the wrapper. Retained windows, webviews, contexts, and trays report `isDisposed() === true` after the application disposes them. Individual resources can also be disposed early. `Symbol.dispose` calls `exit()` and supports explicit resource management:

```js
{
  using app = new Application();
  // Create and use resources here.
} // app.exit() runs here
```

See the runnable [application events example](https://github.com/webviewjs/webview/blob/main/apps/examples/application-events.ts).
