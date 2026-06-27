# macOS

## WebKit

WebviewJS on macOS uses the built-in **WebKit** (WKWebView). No runtime installation is required. macOS 10.15 Catalina or later is supported.

## Main thread requirement

macOS enforces that all GUI operations happen on the main thread. WebviewJS handles this automatically — do **not** create `Application` or `BrowserWindow` from a `worker_threads` Worker or any async context that moves the call off the main thread.

## App-level menu bar

On macOS the menu bar spans the top of the entire screen and belongs to the application, not any individual window.

```js
app.setMenu({
  items: [
    /* … */
  ],
});
```

`init_for_nsapp()` is called automatically when `Application` is created.

## Standard macOS roles

All predefined roles work on macOS, including:

| Role              | Keyboard shortcut |
| ----------------- | ----------------- |
| `hide`            | ⌘H                |
| `hideothers`      | ⌥⌘H               |
| `showall`         | —                 |
| `bringalltofront` | —                 |
| `services`        | Services submenu  |
| `quit`            | ⌘Q                |
| `about`           | —                 |

## Fullscreen

```js
win.setFullscreen(FullscreenType.Borderless); // uses native macOS fullscreen
```

## Transparent window

```js
const win = app.createBrowserWindow({ transparent: true, decorations: false });
```

Combine with `webview.setBackgroundColor(0, 0, 0, 0)` for a fully transparent, frameless window.

## Platform extensions

`BrowserWindowOptions` exposes native titlebar, full-size content, shadow,
first-mouse, HiDPI, tabbing, Option-as-Alt, and borderless-game attributes.
Runtime methods support simple fullscreen, shadows, native window tabs,
document-edited state, Option-as-Alt behavior, and borderless-game mode.

See [BrowserWindow platform APIs](../api/browser-window.md#macos-creation-options).

## Known limitations

- **`setSkipTaskbar`** is a no-op on macOS (use `NSApplication.setActivationPolicy` for dock hiding, which requires an entitlement).
- **Click-through** (`setIgnoreCursorEvents`) is supported via `NSWindow.setIgnoresMouseEvents`.
- **Window icons** are not shown on the macOS dock — the app icon is set via the bundle's `Info.plist`.
