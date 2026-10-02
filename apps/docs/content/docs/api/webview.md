---
title: 'Webview'
description: 'Controls the embedded system browser attached to a BrowserWindow.'
---

`Webview` controls the embedded system browser attached to a `BrowserWindow`. Create it with `win.createWebview()`; `new Webview()` is not supported. Keep a strong reference while your code needs its methods or listeners.

## Creation options

```ts
interface WebviewOptions {
  url?: string;
  html?: string;
  child?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  enableDevtools?: boolean;
  incognito?: boolean;
  userAgent?: string;
  preload?: string;
  transparent?: boolean;
  theme?: Theme; // Windows
  hotkeysZoom?: boolean;
  clipboard?: boolean;
  autoplay?: boolean;
  backForwardNavigationGestures?: boolean;
  ipcName?: string;
  autoNormalizeLoadUrl?: boolean; // Windows
  useHttpsScheme?: boolean; // Windows custom-protocol URL workaround
  webContext?: WebContext | null;
  navigationHandler?: (url: string) => boolean;
  newWindowHandler?: (event: WebviewNewWindowEvent) => boolean;
}
```

Choose one initial `url` or `html` source. For a top-level webview, omit its bounds so it fills the window. When `child: true`, `x`, `y`, `width`, and `height` describe a rectangle relative to the parent window in logical pixels. See [Loading application content](../guides/loading-content).

`preload` is an initialization script run before page scripts. `webContext` shares browser data with other webviews. `incognito` requests a private webview context. See [WebContext](./web-context) and [Cookies and storage](../guides/cookies-and-storage).

On Windows, `theme` selects the WebView2 appearance. `autoNormalizeLoadUrl` controls custom-scheme normalization for later `loadUrl()` and `loadUrlWithHeaders()` calls; it defaults to `true`. `useHttpsScheme` defaults to `false` and selects whether the WebView2 custom-protocol workaround uses an HTTP or HTTPS origin. These two options do not apply to other platforms.

## Loading and navigation

```ts
webview.loadUrl(url: string): void
webview.loadHtml(html: string): void
webview.loadUrlWithHeaders(url: string, headers: HeaderData[]): void
webview.reload(): void
webview.url(): string | null
```

The load methods return `void`; native failures throw through the N-API call. `url()` returns the currently displayed URL or `null` when the native webview has none.

`HeaderData` is `{ key: string; value?: string }`. Use custom protocols to serve packaged local assets; see [Custom Protocols](../guides/custom-protocols).

### Synchronous guards and observation events

`navigationHandler(url)` runs synchronously and must return a boolean. It can cancel normal navigation and is also checked for new-window URLs. `newWindowHandler(event)` synchronously decides whether a new-window request is allowed. If both handlers are set, both must allow the request. Do not return a promise.

The `navigation` and `new-window` events observe requests; they are delivered asynchronously to JavaScript and cannot cancel them. Use the synchronous handlers to deny requests. See [Navigation and popups](../guides/navigation-and-popups).

## Scripts

```ts
webview.evaluateScript(script: string): void
webview.evaluateScriptWithCallback(script: string, callback: (result: string) => void): void
```

`evaluateScript()` runs page JavaScript without a result callback. `evaluateScriptWithCallback()` invokes a one-argument callback with the result converted to a string; it is not an error-first callback.

## IPC and `expose()`

```ts
webview.onIpcMessage(handler?: ((message: IpcMessage) => void) | null): void
webview.expose(name: string, target: ExposedTarget): void
```

`onIpcMessage()` receives raw `window.ipc.postMessage()` calls. `expose()` creates a page namespace with asynchronous methods. Both share one native transport. See [IPC messaging](../guides/ipc-messaging) for the message shape, serialization contract, and examples.

## Events

`Webview` implements Node's `EventEmitter` methods: `on`, `once`, `off`, `addListener`, `removeListener`, `removeAllListeners`, `listenerCount`, `listeners`, `rawListeners`, `emit`, and `eventNames`.

| Event                | Payload                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `page-load-started`  | `event`, `url?`                                                          |
| `page-load-finished` | `event`, `url?`                                                          |
| `title-changed`      | `event`, `title?`                                                        |
| `download-started`   | `event`, `url?`                                                          |
| `download-completed` | `event`, `url?`, `success?`                                              |
| `navigation`         | `event: 'navigation'`, `url?`, `target: 'current'`                       |
| `new-window`         | `event: 'new-window'`, `url?`, `target: 'new-window'`, `windowFeatures?` |

Download events are observational; they do not cancel or redirect downloads. `windowFeatures` may contain a requested size and position. The native engine may omit these hints.

```js
webview.on('title-changed', ({ title }) => console.log(title));
webview.on('download-completed', ({ url, success }) => console.log(url, success));
```

See the runnable [webview events example](https://github.com/webviewjs/webview/blob/main/apps/examples/webview-events.ts).

## DevTools

```ts
webview.openDevtools(): void
webview.closeDevtools(): void
webview.isDevtoolsOpen(): boolean
```

DevTools must be enabled in creation options with `enableDevtools: true` before opening them.

## Cookies and storage

```ts
webview.getCookies(url?: string | null): WebviewCookie[]
webview.setCookie(cookie: WebviewCookie): void
webview.deleteCookie(name: string, domain?: string | null, path?: string | null): void
webview.clearAllBrowsingData(): void
```

`getCookies()` returns cookies for the URL, or all cookies when no URL is supplied. `deleteCookie()` narrows deletion by optional domain and path. `clearAllBrowsingData()` clears cookies, cache, local storage, and IndexedDB. Browser engines may differ in cookie validation and persistence. See [Cookies and storage](../guides/cookies-and-storage).

## Visibility, focus, zoom, and printing

```ts
webview.setWebviewVisibility(visible: boolean): void
webview.focus(): void
webview.focusParent(): void
webview.zoom(scaleFactor: number): void
webview.print(): void
```

`zoom(1.25)` sets 125% page zoom. `setWebviewVisibility()` hides or shows the browser surface without hiding its native window. `focus()` gives keyboard focus to page content; `focusParent()` returns it to the host window. `print()` asks the native webview to print the current page and has no return value.

See [Webview controls](../guides/webview-controls).

## Bounds and appearance

```ts
webview.getBounds(): WebviewBounds | null
webview.setBounds(bounds: WebviewBounds): void
webview.width: number | null
webview.height: number | null
webview.x: number | null
webview.y: number | null
webview.setBackgroundColor(r: number, g: number, b: number, a: number): void
```

Bounds and offsets are logical pixels relative to the parent window. The geometry properties return `null` when the native webview does not report a value. `setBackgroundColor()` takes red, green, blue, and alpha channels from `0` to `255`.

## Disposal

```ts
webview.dispose(): void
webview.isDisposed(): boolean
webview[Symbol.dispose](): void
```

Disposal is idempotent. Disposing the owning `BrowserWindow` or calling `app.exit()` also disposes the native webview. Later method calls on a disposed instance throw. `Symbol.dispose` delegates to `dispose()`.
