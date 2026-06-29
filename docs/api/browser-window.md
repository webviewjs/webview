# BrowserWindow

Represents an OS window. Created via `app.createBrowserWindow()`.

## Creation options

```ts
interface BrowserWindowOptions {
  title?: string; // default: "WebviewJS"
  width?: number; // default: 800 (physical px)
  height?: number; // default: 600 (physical px)
  x?: number; // initial left position (logical px)
  y?: number; // initial top position (logical px)
  resizable?: boolean; // default: true
  visible?: boolean; // default: true
  decorations?: boolean; // default: true (title bar + border)
  transparent?: boolean; // default: false
  maximized?: boolean; // default: false
  maximizable?: boolean; // default: true
  minimizable?: boolean; // default: true
  focused?: boolean; // default: true
  alwaysOnTop?: boolean; // default: false
  alwaysOnBottom?: boolean;
  contentProtection?: boolean;
  visibleOnAllWorkspaces?: boolean;
  fullscreen?: FullscreenType; // 'Exclusive' | 'Borderless'
  menu?: MenuOptions; // per-window menu (overrides global)
  showMenu?: boolean; // show the global menu on this window
}
```

## Methods

### `createWebview(options?)`

Attach a webview to the window. Returns a [`Webview`](./webview).

```ts
win.createWebview(options?: WebviewOptions): Webview
```

Keep the returned `Webview` in application state for as long as the view is
needed. Do not rely on a discarded temporary wrapper.

Pass `options.webContext` to share browser data with other webviews. Pass
`options.navigationHandler` to synchronously allow or reject navigation. See
the [Webview reference](./webview).

### Window state

```ts
win.setTitle(title: string): void
win.setVisible(visible: boolean): void
win.show(): void
win.hide(): void
win.minimize(): void
win.maximize(): void
win.unmaximize(): void
win.setFullscreen(type: FullscreenType | null): void
win.focus(): void
win.requestRedraw(): void
```

### Size & position

```ts
// Inner (content) size in logical pixels
win.getSize(): Dimensions                        // { width, height }
win.getOuterSize(): Dimensions                   // includes decorations
win.setSize(width: number, height: number): void
win.setMinSize(width: number | null, height: number | null): void
win.setMaxSize(width: number | null, height: number | null): void

// Position of the outer window in physical pixels
win.getPosition(): Position | null               // { x, y }
win.setPosition(x: number, y: number): void
win.center(): void                               // center on current monitor

win.scaleFactor(): number                        // device-pixel ratio
```

### Cursor

```ts
win.setCursor(cursor: CursorType): void
win.setCursorVisible(visible: boolean): void
win.setCursorPosition(x: number, y: number): void   // logical px, relative to window
win.setIgnoreCursorEvents(ignore: boolean): void    // click-through (Win/macOS)
```

**`CursorType` values:**

`Default`, `Crosshair`, `Hand`, `Arrow`, `Move`, `Text`, `Wait`, `Help`, `Progress`,
`NotAllowed`, `ContextMenu`, `Cell`, `VerticalText`, `Alias`, `Copy`, `NoDrop`,
`Grab`, `Grabbing`, `ZoomIn`, `ZoomOut`,
`ResizeEast`, `ResizeNorth`, `ResizeNorthEast`, `ResizeNorthWest`,
`ResizeSouth`, `ResizeSouthEast`, `ResizeSouthWest`, `ResizeWest`,
`ResizeEastWest`, `ResizeNorthSouth`, `ResizeNorthEastSouthWest`,
`ResizeNorthWestSouthEast`, `ResizeColumn`, `ResizeRow`, `AllScroll`

### Decorations & behaviour

```ts
win.setResizable(resizable: boolean): void
win.setMinimizable(minimizable: boolean): void
win.setMaximizable(maximizable: boolean): void
win.setClosable(closable: boolean): void
win.setAlwaysOnTop(always: boolean): void
win.setContentProtection(enabled: boolean): void
win.setVisibleOnAllWorkspaces(visible: boolean): void
win.setDecorations(decorated: boolean): void
win.setWindowLevel(level: WindowLevel): void
win.setSkipTaskbar(skip: boolean): void         // Windows only
```

### Icon & progress

```ts
win.setWindowIcon(rgba: Buffer, width: number, height: number): void
win.setProgressBar(progress: JsProgressBar): void
```

### Windows extensions

These methods call winit's `WindowExtWindows` API on Windows and are no-ops on
other platforms:

Creation options expose the matching native attributes:

```ts
windowsOwnerWindow?: bigint
windowsTaskbarIcon?: TrayIconImage
windowsNoRedirectionBitmap?: boolean
windowsDragAndDrop?: boolean
windowsSkipTaskbar?: boolean
windowsClassName?: string
windowsUndecoratedShadow?: boolean
windowsSystemBackdrop?: WindowsSystemBackdrop
windowsClipChildren?: boolean
windowsBorderColor?: number // 0xRRGGBB
windowsTitleBackgroundColor?: number // 0xRRGGBB
windowsTitleTextColor?: number // 0xRRGGBB
windowsCornerPreference?: WindowsCornerPreference
```

Use the existing `menu` option instead of a raw Win32 `HMENU`.

```ts
win.setEnable(enabled: boolean): void
win.setTaskbarIcon(data: Buffer, width?: number, height?: number): void
win.removeTaskbarIcon(): void
win.setUndecoratedShadow(shadow: boolean): void
win.setSystemBackdrop(backdrop: WindowsSystemBackdrop): void
win.setBorderColor(r?: number, g?: number, b?: number): void
win.setTitleBackgroundColor(r?: number, g?: number, b?: number): void
win.setTitleTextColor(r: number, g: number, b: number): void
win.setCornerPreference(preference: WindowsCornerPreference): void
win.getNativeHandleAnyThread(): bigint
```

Taskbar icon input follows `setWindowIcon`. Omit all color components to
restore system border or title-background behavior.

### macOS creation options

```ts
macosMovableByWindowBackground?: boolean
macosTitlebarTransparent?: boolean
macosTitleHidden?: boolean
macosTitlebarHidden?: boolean
macosTitlebarButtonsHidden?: boolean
macosFullsizeContentView?: boolean
macosDisallowHidpi?: boolean
macosHasShadow?: boolean
macosAcceptsFirstMouse?: boolean
macosTabbingIdentifier?: string
macosOptionAsAlt?: MacosOptionAsAlt
macosBorderlessGame?: boolean
```

### macOS runtime extensions

```ts
win.simpleFullscreen(): boolean
win.setSimpleFullscreen(fullscreen: boolean): boolean
win.hasShadow(): boolean
win.setHasShadow(value: boolean): void
win.setTabbingIdentifier(identifier: string): void
win.tabbingIdentifier(): string
win.selectNextTab(): void
win.selectPreviousTab(): void
win.selectTabAtIndex(index: number): void
win.numTabs(): number
win.isDocumentEdited(): boolean
win.setDocumentEdited(edited: boolean): void
win.setOptionAsAlt(value: MacosOptionAsAlt): void
win.optionAsAlt(): MacosOptionAsAlt
win.setBorderlessGame(value: boolean): void
win.isBorderlessGame(): boolean
```

### Linux creation options

X11 options:

```ts
x11VisualId?: number
x11Screen?: number
x11GeneralName?: string
x11InstanceName?: string
x11OverrideRedirect?: boolean
x11WindowTypes?: X11WindowType[]
x11BaseWidth?: number
x11BaseHeight?: number
x11EmbedParentWindow?: number
```

Wayland options:

```ts
waylandAppId?: string
waylandInstance?: string
```

`win.getWaylandXdgToplevel()` returns the native pointer as a bigint, or `0n`
when the window is not using Wayland.

### iOS options and runtime extensions

Creation options use the `ios` prefix: `iosScaleFactor`,
`iosValidOrientations`, `iosPrefersHomeIndicatorHidden`,
`iosDeferredSystemGestureEdges`, `iosPrefersStatusBarHidden`, and
`iosStatusBarStyle`.

Runtime methods expose scale factor, valid orientations, home-indicator and
status-bar preferences, deferred system-gesture edges, and pinch, pan,
double-tap, and rotation gesture recognition.

Screen edges use a bitmask: top `1`, left `2`, bottom `4`, right `8`.

### Android runtime extensions

```ts
win.androidContentRect(): AndroidContentRect
win.androidConfig(): string
```

`androidConfig()` provides the current native configuration as a diagnostic
string. Runtime methods on unsupported platforms return neutral values or do
nothing.

`JsProgressBar`:

```ts
interface JsProgressBar {
  state?: ProgressBarState; // 'None' | 'Normal' | 'Indeterminate' | 'Paused' | 'Error'
  progress?: number; // 0-100
}
```

### Theme

```ts
win.setTheme(theme: Theme | null): void   // 'Light' | 'Dark' | null (system)
```

### Menu

```ts
win.setMenu(options: MenuOptions | null): void
```

See [Menus guide](../guides/menus).

### Custom protocols

Register a URL-scheme handler before creating the webview. Must be called before `createWebview()`.

```ts
win.registerProtocol(
  name: string,
  handler: (request: CustomProtocolRequest) =>
    CustomProtocolResponse | Promise<CustomProtocolResponse>
): void
```

The handler may perform asynchronous file, database, or network work. See [Custom Protocols guide](../guides/custom-protocols).

### File dialogs

```ts
win.openFileDialog(options?: FileDialogOptions): Promise<string[]>
```

```ts
interface FileDialogOptions {
  multiple?: boolean;
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}
```

### Monitor info

```ts
win.currentMonitor(): Monitor | null
win.primaryMonitor(): Monitor | null
win.availableMonitors(): Monitor[]
```

```ts
interface Monitor {
  name?: string;
  scaleFactor: number;
  size: Dimensions;
  position: Position;
  videoModes: VideoMode[];
}
```

### Identity

```ts
win.id(): number          // stable numeric id within this process
win.isChildWindow(): boolean
win.getNativeHandle(): bigint
```

`getNativeHandle()` returns the platform-native handle as a bigint pointer
value: HWND on Windows, NSView on macOS, XID on X11, or `wl_surface` on
Wayland. It returns `0` when no supported handle is available. Treat this as a
borrowed value and do not destroy it.

### State and geometry properties

```ts
win.width: number   // inner width in physical pixels
win.height: number  // inner height in physical pixels
win.x: number       // outer x position in physical pixels
win.y: number       // outer y position in physical pixels
win.getTitle: string

win.isFocused(): boolean
win.isVisible(): boolean
win.isDecorated(): boolean
win.isClosable(): boolean
win.isMaximizable(): boolean
win.isMinimizable(): boolean
win.isMaximized(): boolean
win.isMinimized(): boolean
win.isResizable(): boolean
```

## Window events (EventEmitter)

`BrowserWindow` extends Node's `EventEmitter`. Use the standard `.on()`,
`.once()`, `.off()` / `.removeListener()`, `.removeAllListeners()` API.

```ts
win.on('resize',      ({ width, height }) => { … })
win.on('move',        ({ x, y })          => { … })
win.on('close',       ()                  => { … })
win.on('focus',       ()                  => { … })
win.on('blur',        ()                  => { … })
win.on('mouse-enter', ({ x, y })          => { … })
win.on('mouse-leave', ()                  => { … })
win.on('mouse-move',  ({ x, y })          => { … })
win.on('mouse-down',  ({ x, y, button })  => { … })  // button: 0=left 1=middle 2=right
win.on('mouse-up',    ({ x, y, button })  => { … })
win.on('scroll',      ({ deltaX, deltaY })=> { … })
win.on('key-down',    ({ key, code, modifiers, isRepeat }) => { … })
win.on('key-up',      ({ key, code, modifiers, isRepeat }) => { … })
win.on('file-drop',   ({ files }) => { … })
win.on('file-hover',  ({ files }) => { … })
win.on('file-hover-cancelled', () => { … })
win.on('scale-factor-changed', ({ scaleFactor }) => { … })
win.on('theme-changed', ({ text }) => { … })
win.on('ime',         ({ text, phase }) => { … })
win.on('touch',       ({ x, y, touchId, phase }) => { … })
```

All positional values (`x`, `y`, `width`, `height`, `deltaX`, `deltaY`) are in
**physical pixels** at the current DPI. Divide by `win.scaleFactor()` to
convert to logical (CSS) pixels.

Scroll deltas from a pixel-precise input device (trackpad) are passed through
as-is; line-scroll deltas (mouse wheel) are multiplied by 20 to produce an
equivalent pixel distance.

IME phases are `enabled`, `preedit`, `commit`, or `disabled`. Touch phases are
`started`, `moved`, `ended`, or `cancelled`.

See the runnable [application events example](../../examples/application-events.mjs).

### Undecorated-window resize

Windows created with `{ decorations: false, resizable: true }` use Tao's native
platform behavior for resizing.

```ts
const win = app.createBrowserWindow({ decorations: false, resizable: true });
// Resize works without extra code.
```

## Disposal

Call `win.dispose()` for early cleanup, or use `Symbol.dispose`. Disposal is
idempotent. `win.isDisposed()` reports its state. Disposing a window also
disposes its webviews. `app.exit()` disposes every window owned by the
application.
