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
  event: WebviewApplicationEvent;
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
  WindowCloseRequested = 'WindowCloseRequested',
  ApplicationCloseRequested = 'ApplicationCloseRequested',
  CustomMenuClick = 'CustomMenuClick',
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

See [BrowserWindow cursor section](./browser-window.md#cursor) for the full list.

### `WindowEventType`

Numeric discriminant of the `event` field in each `BrowserWindowEventMap`
payload. Values correspond to the order declared in the Rust `WindowEventType`
enum and are mapped to string event names by the JS layer — normal user code
should key on the string name, not the integer.

| Value | String name   | Payload fields                                |
| ----- | ------------- | --------------------------------------------- |
| 0     | `move`        | `x`, `y` (physical px, outer window position) |
| 1     | `resize`      | `width`, `height` (physical px, inner size)   |
| 2     | `close`       | —                                             |
| 3     | `focus`       | —                                             |
| 4     | `blur`        | —                                             |
| 5     | `mouse-enter` | `x`, `y` (physical px, last cursor position)  |
| 6     | `mouse-leave` | —                                             |
| 7     | `mouse-move`  | `x`, `y` (physical px)                        |
| 8     | `mouse-down`  | `x`, `y`, `button` (0=left 1=middle 2=right)  |
| 9     | `mouse-up`    | `x`, `y`, `button`                            |
| 10    | `scroll`      | `deltaX`, `deltaY` (physical px)              |

### `BrowserWindowEventMap`

```ts
interface BrowserWindowEventMap {
  move: { event: number; x: number; y: number };
  resize: { event: number; width: number; height: number };
  close: { event: number };
  focus: { event: number };
  blur: { event: number };
  'mouse-enter': { event: number; x: number; y: number };
  'mouse-leave': { event: number };
  'mouse-move': { event: number; x: number; y: number };
  'mouse-down': { event: number; x: number; y: number; button: number };
  'mouse-up': { event: number; x: number; y: number; button: number };
  scroll: { event: number; deltaX: number; deltaY: number };
}
```
