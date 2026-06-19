# Webview

Controls the embedded browser view attached to a `BrowserWindow`. Created via `win.createWebview()`.

## Creation options

```ts
interface WebviewOptions {
  url?: string;               // URL to load on start
  html?: string;              // Inline HTML to render (mutually exclusive with url)
  x?: number;                 // Left offset in logical pixels (child webviews only)
  y?: number;                 // Top offset in logical pixels (child webviews only)
  width?: number;             // Width in logical pixels (child webviews only)
  height?: number;            // Height in logical pixels (child webviews only)
  child?: boolean;            // If true, position is relative to parent window
  devtools?: boolean;         // Enable DevTools
  transparent?: boolean;      // Transparent background
  incognito?: boolean;        // Private mode (no persistent storage)
  userAgent?: string;         // Custom user-agent string
  ipcHandler?: (msg: IpcMessage) => void;  // Receive IPC messages from the page
  initializationScript?: string;           // JS injected before any page script runs
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

`HeaderData`:
```ts
interface HeaderData { key: string; value?: string }
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
```

```ts
interface WebviewBounds { x: number; y: number; width: number; height: number }
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

Node receives it via the `ipcHandler` option or can register a handler later.

See [IPC guide](../guides/ipc-messaging.md) for a complete walkthrough.

## Custom protocols

Custom protocols are registered on the **`BrowserWindow`** before `createWebview()` is called:

```js
win.registerProtocol('app', (request) => {
  // ...
  return { statusCode: 200, body: Buffer.from('…'), mimeType: 'text/html' };
});
const webview = win.createWebview({ url: 'app://localhost/index.html' });
```

See [Custom Protocols guide](../guides/custom-protocols.md) for full details.
