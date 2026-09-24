# Types Reference

Common types shared across the API.

## `Dimensions`

```ts
interface Dimensions {
  width: number;
  height: number;
}
```

## `Position`

```ts
interface Position {
  x: number;
  y: number;
}
```

## `WebviewBounds`

Logical-pixel rectangle used by child webview positioning.

```ts
interface WebviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## `WebviewCookie`

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

## `HeaderData`

```ts
interface HeaderData {
  key: string;
  value?: string;
}
```

## `CustomProtocolRequest`

This is the legacy native plain-object shape. The public
`BrowserWindow.registerProtocol()` callback receives a standard global
Fetch API `Request`.

```ts
interface CustomProtocolRequest {
  url: string; // full URL, e.g. "app://localhost/index.html"
  method: string; // "GET", "POST", etc.
  headers: HeaderData[];
  body?: Buffer; // present for POST / PUT
}
```

## `CustomProtocolResponse`

```ts
interface CustomProtocolResponse {
  body: Buffer; // response bytes (required)
  mimeType?: string; // default: "application/octet-stream"
  statusCode?: number; // default: 200
  headers?: HeaderData[]; // extra response headers
}
```

Public protocol handlers may return this legacy shape or a standard global
Fetch API `Response`.

## `WebContextOptions`

```ts
interface WebContextOptions {
  dataDirectory?: string;
  allowsAutomation?: boolean;
}
```

See the [WebContext reference](./web-context).

## Webview event payloads

The `event` field contains the stable string name of the event. It is the same
name used with `webview.on()`, so no Rust enum ordinal mapping is needed.

```ts
interface WebviewPageLoadEvent {
  event: string;
  url?: string;
}

interface WebviewTitleChangedEvent {
  event: string;
  title?: string;
}

interface WebviewDownloadEvent {
  event: string;
  url?: string;
  success?: boolean;
}

interface WebviewNavigationEvent {
  event: 'navigation';
  url?: string;
  target: 'current';
}

type WebviewNavigationTarget = 'current' | 'new-window';

interface WebviewNewWindowEvent {
  event: 'new-window';
  url?: string;
  target: 'new-window';
  windowFeatures?: WebviewNewWindowFeatures;
}

interface WebviewNewWindowFeatures {
  size?: { width: number; height: number };
  position?: { x: number; y: number };
}
```

## `WebviewOptions.ipcName`

`ipcName?: string` adds a page-global alias for wry's built-in `window.ipc`. For example, `{ ipcName: 'bindings' }` makes `window.bindings.postMessage(...)` available before page scripts run. `window.ipc` remains available.

## `SerializationError`

`webview.expose()` uses JSON serialization for static values, arguments, and returned values. Unsupported values reject with an error whose `name` is `SerializationError`.

## `IpcMessage`

Received by the `webview.onIpcMessage()` callback.

```ts
interface IpcMessage {
  body: Buffer;
  method: string;
  headers: HeaderData[];
  uri: string;
}
```

## `Monitor`

```ts
interface Monitor {
  name?: string;
  scaleFactor: number;
  size: Dimensions;
  position: Position;
  videoModes: VideoMode[];
}

interface VideoMode {
  size: Dimensions;
  bitDepth: number;
  refreshRate: number;
}
```

## `ApplicationEvent`

```ts
interface ApplicationEvent {
  event: string;
  customMenuEvent?: CustomMenuEvent;
}

interface CustomMenuEvent {
  id: string;
  windowId: number;
}
```

## Enums

### `WebviewApplicationEvent`

```ts
enum WebviewApplicationEvent {
  WindowCloseRequested = 0,
  ApplicationCloseRequested = 1,
  CustomMenuClick = 2,
  Ready = 3,
}
```

### `FullscreenType`

```ts
enum FullscreenType {
  Exclusive = 'Exclusive',
  Borderless = 'Borderless',
}
```

### `Theme`

```ts
enum Theme {
  Light = 'Light',
  Dark = 'Dark',
}
```

### `ProgressBarState`

```ts
enum ProgressBarState {
  None = 'None',
  Normal = 'Normal',
  Indeterminate = 'Indeterminate',
  Paused = 'Paused',
  Error = 'Error',
}
```

### `CursorType`

See [BrowserWindow cursor section](./browser-window#cursor) for the full list.

### `WindowEventType`

The `event` field in each `BrowserWindowEventMap` payload contains the stable
string event name. The exported enum remains available for native enum
compatibility, but event names do not depend on its declaration order.

| String name   | Payload fields                                |
| ------------- | --------------------------------------------- |
| `move`        | `x`, `y` (physical px, outer window position) |
| `resize`      | `width`, `height` (physical px, inner size)   |
| `close`       | —                                             |
| `focus`       | —                                             |
| `blur`        | —                                             |
| `mouse-enter` | `x`, `y` (physical px, last cursor position)  |
| `mouse-leave` | —                                             |
| `mouse-move`  | `x`, `y` (physical px)                        |
| `mouse-down`  | `x`, `y`, `button` (0=left 1=middle 2=right)  |
| `mouse-up`    | `x`, `y`, `button`                            |
| `scroll`      | `deltaX`, `deltaY` (physical px)              |

### `BrowserWindowEventMap`

```ts
interface BrowserWindowEventMap {
  move: { event: string; x: number; y: number };
  resize: { event: string; width: number; height: number };
  close: { event: 'close'; defaultPrevented: boolean; preventDefault(): void };
  focus: { event: string };
  blur: { event: string };
  'mouse-enter': { event: string; x: number; y: number };
  'mouse-leave': { event: string };
  'mouse-move': { event: string; x: number; y: number };
  'mouse-down': { event: string; x: number; y: number; button: number };
  'mouse-up': { event: string; x: number; y: number; button: number };
  scroll: { event: string; deltaX: number; deltaY: number };
}
```
