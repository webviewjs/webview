# Webview

Controls the embedded browser view attached to a `BrowserWindow`. Created via `win.createWebview()`.

## Creation options

```ts
interface WebviewOptions {
  url?: string; // URL to load on start
  html?: string; // Inline HTML to render (mutually exclusive with url)
  x?: number; // Left offset in logical pixels (child webviews only)
  y?: number; // Top offset in logical pixels (child webviews only)
  width?: number; // Width in logical pixels (child webviews only)
  height?: number; // Height in logical pixels (child webviews only)
  child?: boolean; // If true, position is relative to parent window
  enableDevtools?: boolean; // Enable DevTools
  transparent?: boolean; // Transparent background
  incognito?: boolean; // Private mode (no persistent storage)
  userAgent?: string; // Custom user-agent string
  preload?: string; // JS injected before any page script runs
  ipcName?: string; // Alias for window.ipc, for example window.bindings
  webContext?: WebContext; // Shared browser data context
  navigationHandler?: (url: string) => boolean; // allow or cancel navigation
}
```

> **Note on bounds:** For top-level webviews (not child), omit `x`/`y`/`width`/`height` so the webview fills the window and resizes with it automatically. Setting explicit bounds fixes the size, which causes the black-border artifact when the window is maximised.

## Navigation

```ts
webview.loadUrl(url: string): void
webview.loadHtml(html: string): void
webview.loadUrlWithHeaders(url: string, headers: HeaderData[]): void
webview.reload(): void
webview.url(): string | null          // currently displayed URL
```

`navigationHandler` runs synchronously before each navigation. Return `false`
to cancel it. Keep the callback fast and do not return a Promise. A
`navigation` event is emitted whether the navigation is allowed or cancelled.

See the runnable [navigation handler example](../../examples/navigation-handler.mjs).

## Events

`Webview` implements standard Node.js `EventEmitter` methods, including `on`,
`once`, `off`, `addListener`, `removeListener`, and `removeAllListeners`.

```js
webview.on('page-load-started', ({ url }) => {});
webview.on('page-load-finished', ({ url }) => {});
webview.on('title-changed', ({ title }) => {});
webview.on('download-started', ({ url }) => {});
webview.on('download-completed', ({ url, success }) => {});
webview.on('navigation', ({ url }) => {});
webview.on('new-window', ({ url }) => {});
```

The `new-window` event observes attempts from `window.open`,
`target="_blank"`, and equivalent browser actions. The request is allowed
after dispatch. Download events are observational and do not cancel downloads.

See the runnable [webview events example](../../examples/webview-events.mjs).

`HeaderData`:

```ts
interface HeaderData {
  key: string;
  value?: string;
}
```

## Script execution

```ts
webview.evaluateScript(script: string): void
webview.evaluateScriptWithCallback(script: string, callback: (result: string) => void): void
```

## Cookies

```ts
webview.getCookies(url?: string): WebviewCookie[]
webview.setCookie(cookie: WebviewCookie): void
webview.deleteCookie(name: string, domain?: string, path?: string): void
webview.clearAllBrowsingData(): void
```

`WebviewCookie`:

```ts
interface WebviewCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}
```

## Appearance

```ts
webview.setBackgroundColor(r: number, g: number, b: number, a: number): void  // 0-255 each
```

## Bounds (child webviews)

For child webviews you can reposition or resize the view at runtime:

```ts
webview.getBounds(): WebviewBounds | null
webview.setBounds(bounds: WebviewBounds): void
webview.width: number | null
webview.height: number | null
webview.x: number | null
webview.y: number | null
```

```ts
interface WebviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## DevTools

```ts
webview.openDevtools(): void
webview.closeDevtools(): void
webview.isDevtoolsOpen(): boolean
```

## Focus

```ts
webview.focus(): void        // give keyboard focus to the webview
webview.focusParent(): void  // return focus to the parent window
```

## IPC

The page calls `window.ipc.postMessage(body)` to send a message to Node.

Node registers its handler with `webview.onIpcMessage(handler)`.

Set `ipcName: 'bindings'` to add `window.bindings` as an alias. `window.ipc` always remains available.

See [IPC guide](../guides/ipc-messaging.md) for a complete walkthrough.

## `expose(name, target)`

Expose JSON static values and Node functions under a page global. Page functions always return Promises, even when the Node implementation is synchronous.

```js
webview.expose('native', {
  isCool: true,
  readFile: async (path) => readFile(path, 'utf8'),
});
```

```js
// In the page
console.log(window.native.isCool);
const text = await window.native.readFile('/tmp/example.txt');
```

Only enumerable own data properties are exposed. Getters and setters are ignored. Arguments, static values, and function results must be JSON-serializable. Cyclic structures, `BigInt`, functions as values, and `undefined` results are rejected with `SerializationError`.

The namespace must be a valid JavaScript identifier and can be exposed only once for a webview. See the runnable [expose example](../../examples/expose.mjs).

## Custom protocols

Custom protocols are registered on the **`BrowserWindow`** before `createWebview()` is called:

```js
win.registerProtocol('app', async (request) => {
  // ...
  return { statusCode: 200, body: Buffer.from('…'), mimeType: 'text/html' };
});
const webview = win.createWebview({ url: 'app://localhost/index.html' });
```

See [Custom Protocols guide](../guides/custom-protocols.md) for full details.
