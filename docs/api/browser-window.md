# BrowserWindow

Represents an OS window. Created via `app.createBrowserWindow()`.

## Creation options

```ts
interface BrowserWindowOptions {
  title?: string;          // default: "WebviewJS"
  width?: number;          // default: 800 (physical px)
  height?: number;         // default: 600 (physical px)
  x?: number;              // initial left position (logical px)
  y?: number;              // initial top position (logical px)
  resizable?: boolean;     // default: true
  visible?: boolean;       // default: true
  decorations?: boolean;   // default: true (title bar + border)
  transparent?: boolean;   // default: false
  maximized?: boolean;     // default: false
  maximizable?: boolean;   // default: true
  minimizable?: boolean;   // default: true
  focused?: boolean;       // default: true
  alwaysOnTop?: boolean;   // default: false
  alwaysOnBottom?: boolean;
  contentProtection?: boolean;
  visibleOnAllWorkspaces?: boolean;
  fullscreen?: FullscreenType;  // 'Exclusive' | 'Borderless'
  menu?: MenuOptions;      // per-window menu (overrides global)
  showMenu?: boolean;      // show the global menu on this window
}
```

## Methods

### `createWebview(options?)`

Attach a webview to the window. Returns a [`Webview`](./webview.md).

```ts
win.createWebview(options?: WebviewOptions): Webview
```

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
  state?: ProgressBarState;   // 'None' | 'Normal' | 'Indeterminate' | 'Paused' | 'Error'
  progress?: number;          // 0-100
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
```
