---
title: 'Types and low-level exports'
description: 'Shared option, event, and data types exported by @webviewjs/webview.'
---

This page covers shared types and the exported values that are not methods of a
single class. The [Application](./application), [BrowserWindow](./browser-window),
[Webview](./webview), [WebContext](./web-context), [TrayIcon](./tray), and
[Notification](./notification) references describe each class's methods and
events.

## Geometry and monitors

```ts
interface Dimensions {
  width: number;
  height: number;
}
interface Position {
  x: number;
  y: number;
}
interface WebviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

Window sizes and monitor geometry use physical pixels unless a method accepts a
`logical` argument. `WebviewBounds` uses logical pixels relative to the parent
window.

## Creation and configuration types

| Type                             | Used by                                       | Notes                                                                                                                                       |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApplicationOptions`             | `new Application(options)`                    | Legacy fields `controlFlow`, `waitTime`, and `exitCode` are accepted for compatibility and currently ignored.                               |
| `ApplicationRunOptions`          | `app.run(options)`                            | `interval` is the event-pump interval in milliseconds; `ref` controls whether the Node timer keeps the process alive.                       |
| `ApplicationWhenReadyOptions`    | `app.whenReady(options)`                      | By default, readiness waiting starts the pump. `{ autoRun: false }` leaves pumping to the caller.                                           |
| `BrowserWindowOptions`           | `app.createBrowserWindow(options)`            | Includes cross-platform window settings and platform-prefixed options; see [BrowserWindow](./browser-window#creation-options).              |
| `WebviewOptions`                 | `win.createWebview(options)`                  | Includes URL/HTML, child bounds, engine behavior, context, and synchronous navigation callbacks; see [Webview](./webview#creation-options). |
| `WebContextOptions`              | `app.createWebContext(options)`               | `dataDirectory` sets a native user-data directory; `allowsAutomation` is currently enforced only on Linux.                                  |
| `TrayIconOptions`                | `app.createTrayIcon(options)`                 | Icon, menu, tooltip, title, and click-menu settings; see [TrayIcon](./tray).                                                                |
| `FileDialogOptions`              | `win.openFileDialog(options)`                 | Optional title, default directory, filters, and multi-select mode.                                                                          |
| `MenuOptions`, `MenuItemOptions` | `app.setMenu()`, window and tray menu options | See [Menu](./menu) for roles and platform behavior.                                                                                         |
| `JsProgressBar`                  | `win.setProgressBar(options)`                 | Optional `ProgressBarState` and percentage from 0 through 100.                                                                              |

`FileFilter` has `name: string` and `extensions: string[]`. Its extensions
contain suffixes such as `['txt', 'md']`.

`TrayIconImage` has `data: Buffer`, with optional `width` and `height`. Pass
encoded image bytes without dimensions or raw RGBA bytes with dimensions. If
only `width` is supplied, the native decoder treats the image as square;
`height` without `width` is invalid.

## Protocol, cookie, and IPC data

```ts
interface HeaderData {
  key: string;
  value?: string;
}

interface WebviewCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

interface IpcMessage {
  body: Buffer;
  method: string;
  headers: HeaderData[];
  uri: string;
}
```

`onIpcMessage()` receives `IpcMessage` when page code calls
`window.ipc.postMessage(string)`. The body is a `Buffer`; the other fields
describe the native request. See [IPC messaging](../guides/ipc-messaging).

Custom protocol handlers registered by `BrowserWindow.registerProtocol()` use
the Fetch API `Request` and may return a Fetch API `Response`. The legacy native
response form is:

```ts
interface CustomProtocolResponse {
  body: Buffer;
  statusCode?: number; // default 200
  mimeType?: string; // default application/octet-stream
  headers?: HeaderData[];
}
```

`CustomProtocolRequest` is the older plain-object request shape retained in the
generated binding declarations; it is not the argument passed to the current
public protocol handler. `ProtocolRequest` and `ExposeCallData` describe lower-
level native bridge payloads and are not needed by normal application code.
`NativeNotificationAction`, `NativeNotificationOptions`, and
`NotificationEventPayload` are also native-wrapper types; use the higher-level
[`Notification`](./notification) and its `NotificationOptions` instead.

## Event payloads

The classes expose typed event maps:

- `ApplicationEventMap` covers `ready`, `window-close-requested`,
  `application-close-requested`, and `custom-menu-click`.
- `BrowserWindowEventMap` maps window, pointer, keyboard, file-drop, scale,
  theme, IME, touch, and close events to their payload interfaces. The `close`
  payload provides synchronous `preventDefault()`; see [Application
  lifecycle](../guides/application-lifecycle).
- `WebviewEventMap` maps load, title, download, `navigation`, and `new-window`
  events to their payload interfaces. Observation events cannot cancel a
  request; see [Webview](./webview#events).
- `TrayEventMap` maps `click`, `double-click`, `enter`, `move`, and `leave` to
  `TrayEventPayload`. Their availability depends on the platform.
- `NotificationEventMap` maps `show`, `click`, `close`, and `error` to
  `NotificationEvent`.

The exported payload types include `ApplicationEvent`, `CustomMenuEvent`,
`WindowEventPayload`, `WebviewEventPayload`, `WebviewNewWindowFeatures`,
`WebviewWindowSize`, `WebviewWindowPosition`, `TrayEventPayload`, `TrayRect`,
`AndroidContentRect`, and the event-specific types exported from the package
root. `CustomMenuEvent` contains `id` and `windowId`; the current native adapter
sets `windowId` to `0` for menu events.

```ts
interface ApplicationEvent {
  event: string;
  customMenuEvent?: CustomMenuEvent;
}
interface CustomMenuEvent {
  id: string;
  windowId: number;
}
interface TrayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface TrayEventPayload {
  event: string;
  id: string;
  x: number;
  y: number;
  rect: TrayRect;
  button?: string;
  buttonState?: string;
}
interface AndroidContentRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

`NotificationDirection`, `NotificationEventName`, and
`NotificationPermission` are the exported notification option/event types; see
the [Notification reference](./notification). `PublicNewWindowEvent` is a
lower-level new-window payload type with an optional `target`; normal
`webview.on('new-window')` listeners use `WebviewNewWindowEvent`.

`EventListener` is the listener function type used by typed emitters.
`TypedEventEmitter<EventMap>` is a Node.js `EventEmitter` parameterized with an
event map. `BrowserWindowCloseEvent`, `WindowBaseEvent`, `WindowFileEvent`,
`WindowImeEvent`, `WindowKeyEvent`, `WindowMouseEvent`, `WindowMoveEvent`,
`WindowResizeEvent`, `WindowScaleEvent`, `WindowScrollEvent`,
`WindowThemeEvent`, `WindowTouchEvent`, `WebviewPageLoadEvent`,
`WebviewTitleChangedEvent`, `WebviewDownloadEvent`,
`WebviewDownloadStartedEvent`, `WebviewNavigationEvent`, and
`WebviewNewWindowEvent` are the more specific exported event payload types.

## Enums

Import enum members instead of hard-coding their numeric runtime values.

| Enum                   | Members                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Use                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Theme`                | `Light`, `Dark`, `System`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Window or WebView2 theme selection.                                                                                                                                                                  |
| `FullscreenType`       | `Exclusive`, `Borderless`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Fullscreen mode. The initial `BrowserWindowOptions.fullscreen` path currently creates borderless fullscreen for either member; see [BrowserWindow](./browser-window#fullscreen-and-window-identity). |
| `ProgressBarState`     | `None`, `Normal`, `Indeterminate`, `Paused`, `Error`                                                                                                                                                                                                                                                                                                                                                                                                                                       | Windows taskbar progress state.                                                                                                                                                                      |
| `CursorType`           | `Default`, `Crosshair`, `Hand`, `Arrow`, `Move`, `Text`, `Wait`, `Help`, `Progress`, `NotAllowed`, `ContextMenu`, `Cell`, `VerticalText`, `Alias`, `Copy`, `NoDrop`, `Grab`, `Grabbing`, `ZoomIn`, `ZoomOut`, `ResizeEast`, `ResizeNorth`, `ResizeNorthEast`, `ResizeNorthWest`, `ResizeSouth`, `ResizeSouthEast`, `ResizeSouthWest`, `ResizeWest`, `ResizeEastWest`, `ResizeNorthSouth`, `ResizeNorthEastSouthWest`, `ResizeNorthWestSouthEast`, `ResizeColumn`, `ResizeRow`, `AllScroll` | `BrowserWindow.setCursor()`.                                                                                                                                                                         |
| `IosValidOrientations` | `LandscapeAndPortrait`, `Landscape`, `Portrait`                                                                                                                                                                                                                                                                                                                                                                                                                                            | iOS binding compatibility; no iOS N-API package is published.                                                                                                                                        |
| `ControlFlow`          | `Poll`, `Wait`, `WaitUntil`, `Exit`, `ExitWithCode`                                                                                                                                                                                                                                                                                                                                                                                                                                        | Backward compatibility only; not used by the current event pump.                                                                                                                                     |

`WebviewApplicationEvent` contains `WindowCloseRequested`,
`ApplicationCloseRequested`, `CustomMenuClick`, and `Ready` identifiers.
`WebviewEventType` contains `PageLoadStarted`, `PageLoadFinished`,
`TitleChanged`, `DownloadStarted`, `DownloadCompleted`, `NavigationStarted`,
and `NewWindowRequested`. `WindowEventType` contains `Moved`, `Resized`,
`CloseRequested`, `Focused`, `Blurred`, `MouseEnter`, `MouseLeave`,
`MouseMove`, `MouseDown`, `MouseUp`, `Scroll`, `KeyDown`, `KeyUp`, `FileDrop`,
`FileHover`, `FileHoverCancelled`, `ScaleFactorChanged`, `ThemeChanged`,
`Ime`, and `Touch`. These are native enum identifiers; JavaScript event
listeners use the string event names in the class references and should not
switch on enum ordinals. `WindowCommand` contains native `Close`, `Show`, and
`Hide` identifiers and is not needed by normal applications.

`ControlFlow` is a backward-compatibility enum. The current application uses a
non-blocking event pump; `ApplicationOptions.controlFlow` does not change it.

## Low-level compatibility exports

The normal protocol API automatically handles platform URL normalization. The
following exported URI workaround helpers exist for native/custom-protocol
compatibility code; application code usually does not need them:

```ts
applyUriWorkAround(uri: string, httpOrHttps: string, protocol: string): string
isWorkAroundUri(uri: string, httpOrHttps: string, protocol: string): boolean
originalUriPrefix(protocol: string): string
revertUriWorkAround(uri: string, httpOrHttps: string, protocol: string): string
workAroundUriPrefix(httpOrHttps: string, protocol: string): string
```

`getWebviewVersion(): string` returns the native webview engine version where
the platform backend provides one. `VERSION` is the installed
`@webviewjs/webview` package version.

`JsWebview`, `JsWebContext`, `JsTrayIcon`, and `JsNotification` are generated
binding aliases. `NativeNotification` is the native notification wrapper used
by the public `Notification` class. Prefer `Webview`, `WebContext`, `TrayIcon`,
and `Notification` in application code.

`JsonValue`, `ExposedTarget`, and `SerializationError` describe the
[`webview.expose()`](../guides/ipc-messaging#expose) bridge. Values must
follow the JSON serialization rules documented there.
