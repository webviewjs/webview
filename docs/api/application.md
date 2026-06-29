# Application

The root object that owns the event loop and all windows.

```js
import { Application } from '@webviewjs/webview';
const app = new Application();
```

## Constructor

```ts
new Application(options?: ApplicationOptions)
```

`ApplicationOptions` is accepted but currently unused; pass `null` or omit it.

## Methods

### `run(options?)`

Start the event pump. Calls `pumpEvents()` on a `setInterval` and returns immediately.

```ts
app.run(options?: { interval?: number; ref?: boolean }): void
```

| Option     | Default | Description                                     |
| ---------- | ------- | ----------------------------------------------- |
| `interval` | `16`    | Pump interval in ms                             |
| `ref`      | `true`  | If `false` the timer won't prevent process exit |

### `stop()`

Clear the pump interval. The app object and windows remain valid.

```ts
app.stop(): void
```

### `exit()`

Stop the pump, hide all tracked windows, and mark the application as exited. Subsequent `pumpEvents()` calls return `false`.

```ts
app.exit(): void
```

### `pumpEvents()`

Process one batch of OS events without blocking. Returns `true` while alive, `false` when the app should exit. Normally called automatically by `run()`.

```ts
app.pumpEvents(): boolean
```

### `whenReady(options?)`

Resolve when wry emits its first native `resumed()` lifecycle callback.
`whenReady()` starts the event pump by default:

```js
app.whenReady().then(() => {
  const window = app.createBrowserWindow();
  window.createWebview({ url: 'https://example.com' });
});
```

```ts
type ApplicationWhenReadyOptions =
  | { autoRun?: true; interval?: number; ref?: boolean }
  | { autoRun: false; interval?: never; ref?: never };

app.whenReady(options?: ApplicationWhenReadyOptions): Promise<void>
app.isReady(): boolean
```

`autoRun` defaults to `true`; `interval` and `ref` are forwarded to `run()`.
Use `{ autoRun: false }` when manually calling `run()` or `pumpEvents()`.
Manual mode rejects `interval` and `ref` because no implicit timer is created.
Calls made after readiness still resolve asynchronously.

## Application events

`Application` implements the standard Node.js `EventEmitter` API. Prefer this
interface for new Node.js code:

```js
app.on('window-close-requested', (event) => {
  console.log('window close requested', event);
});

app.on('application-close-requested', () => {
  app.exit();
});

app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log(customMenuEvent.id, customMenuEvent.windowId);
});
```

| Event                         | Fired when                              |
| ----------------------------- | --------------------------------------- |
| `window-close-requested`      | A user requests that a window be closed |
| `application-close-requested` | The last window has been closed         |
| `custom-menu-click`           | A custom menu item is selected          |
| `ready`                       | The native event loop is ready          |

The usual `on`, `once`, `off`, `addListener`, `removeListener`,
`removeAllListeners`, `listenerCount`, `listeners`, `rawListeners`, `emit`, and
`eventNames` methods are available. Listener-registration and removal methods
are chainable.

See the runnable [application events example](../../examples/application-events.mjs).

### Legacy `onEvent(handler)` / `bind(handler)`

Register a callback for application-level events. Both names are equivalent aliases.

```ts
app.onEvent(handler: (event: ApplicationEvent) => void): void
```

`ApplicationEvent`:

```ts
interface ApplicationEvent {
  event: WebviewApplicationEvent; // enum value
  customMenuEvent?: { id: string; windowId: number };
}
```

`WebviewApplicationEvent` values:

| Value                       | Fired when                                               |
| --------------------------- | -------------------------------------------------------- |
| `WindowCloseRequested`      | User clicks the OS close button on a window              |
| `ApplicationCloseRequested` | The last window was closed                               |
| `CustomMenuClick`           | A custom menu item was clicked; see `customMenuEvent.id` |
| `Ready`                     | The native event loop emitted its first resume event     |

### `createBrowserWindow(options?)`

Create and return a new [`BrowserWindow`](./browser-window).

```ts
app.createBrowserWindow(options?: BrowserWindowOptions): BrowserWindow
```

### `createChildBrowserWindow(options?)`

Create a child/popup window. The webview fills a precise region inside the parent rather than the whole window.

```ts
app.createChildBrowserWindow(options?: BrowserWindowOptions): BrowserWindow
```

### `createWebContext(options?)`

Create an isolated browser-data context that can be shared by multiple webviews.

```ts
app.createWebContext(options?: WebContextOptions): WebContext
```

Create contexts through the application rather than with `new WebContext()`.
See the [WebContext reference](./web-context).

### `setMenu(options?)`

Set the global application menu. Pass `null` to remove it.

```ts
app.setMenu(options?: MenuOptions): void
```

See [Menus guide](../guides/menus) for the full options shape.

This API remains supported. Compare its numeric event value with the exported
enum:

```js
app.onEvent((event) => {
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    app.exit();
  }
});
```

### `Symbol.dispose`

`Application` implements the TC39 Explicit Resource Management protocol. Use `using` to guarantee cleanup:

```js
{
  using app = new Application();
  // …
} // app.exit() called automatically
```

### Root-owned disposal

Resources created through an application are owned by that application.
`app.exit()`, `Symbol.dispose`, and application finalization dispose tray
icons, webviews, windows, web contexts, menus, and callbacks. Cleanup is
idempotent. Retained resource wrappers report `isDisposed() === true` and
reject subsequent method calls. Creating new resources after exit also fails.
