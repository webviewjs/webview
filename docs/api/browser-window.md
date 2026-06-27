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

Attach a webview to the window. Returns a [`Webview`](./webview.md).

```ts
win.createWebview(options?: WebviewOptions): Webview
```

Pass `options.webContext` to share browser data with other webviews. Pass
`options.navigationHandler` to synchronously allow or reject navigation. See
the [Webview reference](./webview.md).

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

See [Menus guide](../guides/menus.md).

### Custom protocols

Register a URL-scheme handler before creating the webview. Must be called before `createWebview()`.

```ts
win.registerProtocol(
  name: string,
  handler: (request: CustomProtocolRequest) =>
    CustomProtocolResponse | Promise<CustomProtocolResponse>
): void
```

The handler may perform asynchronous file, database, or network work. See [Custom Protocols guide](../guides/custom-protocols.md).

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

When a window is created with `{ decorations: false, resizable: true }`, native
OS resize handles are absent. WebviewJS automatically handles this:

- **Cursor** — while the pointer is within 6 physical pixels of any edge or
  corner, the cursor updates to the appropriate directional resize icon.
- **Drag** — a left-button press in that same border strip immediately calls
  winit's `drag_resize_window()` so the OS takes over the resize gesture.
  No `mouse-down` event is fired for border-strip presses (the drag consumes them).

```ts
const win = app.createBrowserWindow({ decorations: false, resizable: true });
// Resize just works — no extra code needed.
```
