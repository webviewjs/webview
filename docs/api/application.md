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

### `onEvent(handler)` / `bind(handler)`

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

### `createBrowserWindow(options?)`

Create and return a new [`BrowserWindow`](./browser-window.md).

```ts
app.createBrowserWindow(options?: BrowserWindowOptions): BrowserWindow
```

### `createChildBrowserWindow(options?)`

Create a child/popup window. The webview fills a precise region inside the parent rather than the whole window.

```ts
app.createChildBrowserWindow(options?: BrowserWindowOptions): BrowserWindow
```

### `setMenu(options?)`

Set the global application menu. Pass `null` to remove it.

```ts
app.setMenu(options?: MenuOptions): void
```

See [Menus guide](../guides/menus.md) for the full options shape.

### `Symbol.dispose`

`Application` implements the TC39 Explicit Resource Management protocol. Use `using` to guarantee cleanup:

```js
{
  using app = new Application();
  // …
} // app.exit() called automatically
```
