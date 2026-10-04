---
title: 'BrowserWindow'
description: 'Represents a native operating-system window created by an Application.'
---

`BrowserWindow` is the native OS window. Create one through `Application`, then attach a [`Webview`](./webview).

```js
const win = app.createBrowserWindow({ title: 'My App', width: 900, height: 640 });
const webview = win.createWebview({ url: 'https://example.com' });
```

## Creation options

```ts
interface BrowserWindowOptions {
  title?: string; // default "WebviewJS"
  width?: number; // default 800
  height?: number; // default 600
  x?: number; // default 0
  y?: number; // default 0
  logical?: boolean; // default false; interpret size and position as logical pixels
  resizable?: boolean; // default true
  visible?: boolean; // default true
  decorations?: boolean; // default true
  transparent?: boolean; // default false; Windows may also need windowsNoRedirectionBitmap: true
  maximized?: boolean; // default false
  maximizable?: boolean; // default true
  minimizable?: boolean; // default true
  focused?: boolean; // default true
  alwaysOnTop?: boolean; // default false
  alwaysOnBottom?: boolean; // default false
  contentProtection?: boolean; // default false
  fullscreen?: FullscreenType;
  menu?: MenuOptions;
  showMenu?: boolean; // default true

  // Windows-only options
  windowsOwnerWindow?: bigint;
  windowsTaskbarIcon?: TrayIconImage;
  windowsNoRedirectionBitmap?: boolean;
  windowsDragAndDrop?: boolean;
  windowsSkipTaskbar?: boolean;
  windowsClassName?: string;
  windowsUndecoratedShadow?: boolean;

  // macOS-only options
  macosMovableByWindowBackground?: boolean;
  macosTitlebarTransparent?: boolean;
  macosTitleHidden?: boolean;
  macosTitlebarHidden?: boolean;
  macosTitlebarButtonsHidden?: boolean;
  macosFullsizeContentView?: boolean;
  macosDisallowHidpi?: boolean;
  macosHasShadow?: boolean;
  macosTabbingIdentifier?: string;
  visibleOnAllWorkspaces?: boolean;

  // iOS options
  iosScaleFactor?: number;
  iosValidOrientations?: IosValidOrientations;
  iosPrefersHomeIndicatorHidden?: boolean;
  iosDeferredSystemGestureEdges?: number;
  iosPrefersStatusBarHidden?: boolean;
}
```

Specify `width` and `height` together, and `x` and `y` together. Values are physical pixels unless `logical: true` is set. The initial `fullscreen` option currently creates borderless fullscreen for either enum value; `setFullscreen(FullscreenType.Exclusive)` has a separate runtime path.

On Windows, a window created with `transparent: true` may also need `windowsNoRedirectionBitmap: true` to avoid rendering issues such as the window intermittently becoming opaque. See [issue #59](https://github.com/webviewjs/webview/issues/59).

On Windows and GTK-based Linux/FreeBSD, `menu` installs a per-window menu and overrides the global menu. `showMenu` controls whether that window attaches the global menu. On macOS, menus belong to the application: a `menu` option is not attached to the window, and `showMenu` does not hide the application menu. See [Menu](./menu).
`win.hasMenu(): boolean` reports whether a per-window menu object was assigned; it does not report whether a menu is visible. It is `false` when the window uses the global menu. Android always returns `false`.

### Windows creation options

```ts
windowsOwnerWindow?: bigint;
windowsTaskbarIcon?: TrayIconImage;
windowsNoRedirectionBitmap?: boolean;
windowsDragAndDrop?: boolean;
windowsSkipTaskbar?: boolean;
windowsClassName?: string;
windowsUndecoratedShadow?: boolean;
```

These options map to Tao's Windows window attributes. `windowsOwnerWindow` accepts a non-negative native handle.

### macOS creation options

```ts
macosMovableByWindowBackground?: boolean;
macosTitlebarTransparent?: boolean;
macosTitleHidden?: boolean;
macosTitlebarHidden?: boolean;
macosTitlebarButtonsHidden?: boolean;
macosFullsizeContentView?: boolean;
macosDisallowHidpi?: boolean;
macosHasShadow?: boolean;
macosTabbingIdentifier?: string;
visibleOnAllWorkspaces?: boolean;
```

### iOS creation options

```ts
iosScaleFactor?: number;
iosValidOrientations?: IosValidOrientations;
iosPrefersHomeIndicatorHidden?: boolean;
iosDeferredSystemGestureEdges?: number;
iosPrefersStatusBarHidden?: boolean;
```

The Rust binding contains iOS-specific code, but the package does not publish an iOS N-API target. These fields do not make iOS available through the npm package; see [iOS platform status](../platform/ios).

## Create and dispose a webview

```ts
win.createWebview(options?: WebviewOptions | null): Webview
win.registerProtocol(name: string, handler: BrowserWindowProtocolHandler): void
win.dispose(): void
win.isDisposed(): boolean
win[Symbol.dispose](): void
```

`createWebview()` attaches a native webview and returns the JavaScript-augmented native class. The window owns the native webview resource. Disposing the window disposes its webviews. See [Webview](./webview).

`registerProtocol()` registers a handler for a scheme such as `app://`. Register schemes before creating webviews that use them. The callback receives a Fetch API `Request` and may return a `Response` or `CustomProtocolResponse`; see [Custom Protocols](../guides/custom-protocols).

## Window state and visibility

```ts
win.title: string
win.setTitle(title: string): void
win.theme: Theme
win.setTheme(theme: Theme): void

win.isFocused(): boolean
win.isVisible(): boolean
win.isDecorated(): boolean
win.isClosable(): boolean
win.isMaximizable(): boolean
win.isMinimizable(): boolean
win.isMaximized(): boolean
win.isMinimized(): boolean
win.isResizable(): boolean

win.setVisible(visible: boolean): void
win.show(): void
win.hide(): void
win.focus(): void
win.setClosable(closable: boolean): void
win.setMaximizable(maximizable: boolean): void
win.setMinimizable(minimizable: boolean): void
win.setResizable(resizable: boolean): void
win.setMaximized(maximized: boolean): void
win.setMinimized(minimized: boolean): void
win.setDecorations(decorated: boolean): void
win.setAlwaysOnTop(enabled: boolean): void
win.setAlwaysOnBottom(enabled: boolean): void
win.setContentProtection(enabled: boolean): void
win.requestRedraw(): void
```

`win.close()` is an alias for immediate disposal. Use `hide()` if the same native window should remain available for `show()`. A user clicking the OS close button follows the cancelable `close` event path described in [Application lifecycle](../guides/application-lifecycle).

`setContentProtection()` requests that the window be excluded from supported screen-capture paths; enforcement depends on the platform and compositor.

## Size, position, and monitors

```ts
win.setSize(width: number, height: number, logical?: boolean): Dimensions | null
win.getInnerSize(logical?: boolean): Dimensions
win.getOuterSize(logical?: boolean): Dimensions
win.setMinSize(width: number, height: number, logical?: boolean): void
win.setMaxSize(width: number, height: number, logical?: boolean): void

win.setPosition(x: number, y: number, logical?: boolean): void
win.getPosition(logical?: boolean): Position
win.center(): void
win.scaleFactor(): number

win.width: number
win.height: number
win.x: number
win.y: number

win.getAvailableMonitors(): Monitor[]
win.getCurrentMonitor(): Monitor | null
win.getPrimaryMonitor(): Monitor | null
win.getMonitorFromPoint(x: number, y: number): Monitor | null
```

Size and position methods use physical pixels by default; pass `true` for logical pixels where the method accepts that argument. `getMonitorFromPoint(x, y)` takes a physical screen point. The `width`, `height`, `x`, and `y` properties report physical window geometry. `scaleFactor()` returns the current display scale factor.

`setSize()` currently returns `null`; the native Tao setter does not return the resulting size. `getCurrentMonitor()`, `getPrimaryMonitor()`, and `getMonitorFromPoint()` return `null` when no monitor is available for the query. `getAvailableMonitors()` returns an empty array when none are reported.

Each `Monitor` contains an optional name, scale factor, physical size and position, and supported video modes. See [shared types](./types#geometry-and-monitors).

## Cursor and input behavior

```ts
win.setCursor(cursor: CursorType): void
win.setCursorVisible(visible: boolean): void
win.setCursorPosition(x: number, y: number): void
win.setIgnoreCursorEvents(ignore: boolean): void
win.setSkipTaskbar(skip: boolean): void
```

`setCursorPosition()` accepts logical coordinates relative to the window. Click-through behavior from `setIgnoreCursorEvents()` is supported by Windows and macOS; other backends may reject it. `setSkipTaskbar()` is implemented on Windows and GTK-based Linux/FreeBSD; it is a no-op on other targets.

`CursorType` includes `Default`, `Crosshair`, `Hand`, `Arrow`, `Move`, `Text`, `Wait`, `Help`, `Progress`, `NotAllowed`, `ContextMenu`, `Cell`, `VerticalText`, `Alias`, `Copy`, `NoDrop`, `Grab`, `Grabbing`, `ZoomIn`, `ZoomOut`, and resize cursors. Import the enum instead of passing its numeric values.

## Fullscreen and window identity

```ts
win.fullscreen: FullscreenType | null
win.setFullscreen(type?: FullscreenType | null): void
win.id(): number
win.isChild: boolean
win.getNativeHandle(): bigint
```

Pass `null` or omit the argument to leave fullscreen. At creation time, either `FullscreenType` option currently selects borderless fullscreen. At runtime, `setFullscreen(FullscreenType.Exclusive)` selects the first reported video mode of the current monitor; if no current mode is available, it clears fullscreen. `id()` is the numeric id assigned to the window. `isChild` identifies windows created with `createChildBrowserWindow()`.

`getNativeHandle()` returns a borrowed platform handle: HWND on Windows, NSView on macOS, an X11 window id or Wayland surface on GTK Unix targets, and `0n` when no supported native handle is available. Do not destroy or free it.

## Icons, taskbar, and progress

```ts
win.setWindowIcon(icon: Uint8Array | number[], width?: number, height?: number): void
win.removeWindowIcon(): void
win.setProgressBar(state: JsProgressBar): void
```

Pass encoded image bytes without dimensions, or raw RGBA bytes with dimensions. If only `width` is supplied, the image is treated as square; `height` without `width` is invalid. For a non-square raw image, provide both dimensions.

Windows-only methods set the taskbar icon, enable state, or undecorated shadow:

```ts
win.setEnable(enabled: boolean): void
win.setTaskbarIcon(icon: Uint8Array | number[], width?: number, height?: number): void
win.removeTaskbarIcon(): void
win.setUndecoratedShadow(enabled: boolean): void
win.getNativeHandleAnyThread(): bigint
```

These methods are no-ops off Windows; `getNativeHandleAnyThread()` returns `0n` there. `JsProgressBar` accepts an optional `ProgressBarState` and a progress percentage from `0` to `100`.

## Platform extensions

### macOS

```ts
win.simpleFullscreen(): boolean
win.setSimpleFullscreen(fullscreen: boolean): boolean
win.hasShadow(): boolean
win.setHasShadow(value: boolean): void
win.setTabbingIdentifier(identifier: string): void
win.tabbingIdentifier(): string
win.isDocumentEdited(): boolean
win.setDocumentEdited(edited: boolean): void
```

These use Tao's macOS window extensions. On other platforms, setters do nothing and getters return neutral values.

### Linux / Wayland

```ts
win.getWaylandSurface(): bigint
```

Returns the Wayland surface pointer when running on Wayland, or `0n` on X11 and non-Linux targets.

### Android

```ts
win.androidContentRect(): AndroidContentRect
win.androidConfig(): string
```

These expose Android's content inset rectangle and a native configuration diagnostic string. Other platforms return neutral values.

### iOS

```ts
win.setIosScaleFactor(value: number): void
win.setValidOrientations(value: IosValidOrientations): void
win.setPrefersHomeIndicatorHidden(value: boolean): void
win.setPreferredScreenEdgesDeferringSystemGestures(edges: number): void
win.setPrefersStatusBarHidden(value: boolean): void
```

Screen-edge bits are top `1`, left `2`, bottom `4`, and right `8`. These Rust binding methods are not available through a published iOS N-API package.

## File dialogs

```ts
win.openFileDialog(options?: FileDialogOptions | null): string[]

interface FileDialogOptions {
  multiple?: boolean;
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}
```

The method is synchronous and returns selected paths. It returns `[]` if the user cancels; Android currently returns `[]` without opening a dialog.

## Window events

`BrowserWindow` implements Node's `EventEmitter` methods: `on`, `once`, `off`, `addListener`, `removeListener`, `removeAllListeners`, `listenerCount`, `listeners`, `rawListeners`, `emit`, and `eventNames`.

| Event                                                  | Payload fields                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `move`                                                 | `x`, `y`                                                                  |
| `resize`                                               | `width`, `height`                                                         |
| `close`                                                | `event`, `defaultPrevented`, `preventDefault()`                           |
| `focus`, `blur`, `mouse-leave`, `file-hover-cancelled` | `event`                                                                   |
| `mouse-enter`, `mouse-move`, `mouse-down`, `mouse-up`  | `x`, `y`; button events also include `button` and may include `modifiers` |
| `scroll`                                               | `deltaX`, `deltaY`                                                        |
| `key-down`, `key-up`                                   | Optional `key`, `code`, `modifiers`, `isRepeat`                           |
| `file-drop`, `file-hover`                              | Optional `files: string[]`                                                |
| `scale-factor-changed`                                 | `scaleFactor`                                                             |
| `theme-changed`                                        | `text: 'light' \| 'dark'`                                                 |
| `ime`                                                  | `phase` and optional `text`                                               |
| `touch`                                                | `x`, `y`, `touchId`, `phase`                                              |

Event names and payload fields are stable strings/objects; availability depends on the native window system. Position and size payloads are in physical pixels. Keyboard modifier bits are Shift `1`, Ctrl `2`, Alt `4`, and Meta/Super/Command `8`. See [Application lifecycle](../guides/application-lifecycle) for the synchronous close-prevention constraint.

## File dialogs and platform examples

See [window appearance](../guides/window-appearance), the [window menus example](https://github.com/webviewjs/webview/blob/main/apps/examples/window-menus.ts), and the [application events example](https://github.com/webviewjs/webview/blob/main/apps/examples/application-events.ts).
