# Windows

## WebView2 runtime

WebviewJS on Windows uses the **WebView2** engine (Chromium-based).

- **Windows 11**: WebView2 runtime ships pre-installed.
- **Windows 10**: The runtime is auto-downloaded and installed the first time it is needed. You can also pre-install it via the [Evergreen bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

Check the installed version at runtime:

```js
import { getWebviewVersion } from '@webviewjs/webview';
console.log(getWebviewVersion()); // e.g. "128.0.2739.42"
```

## Menu bar

The menu bar is attached to each window's title bar (standard Win32 behaviour). Each window can have its own menu or share the global one set via `app.setMenu()`.

## DPI / HiDPI

Tao reports the monitor's scale factor and scales the window accordingly. Use
`win.scaleFactor()` to get the current DPI ratio, and logical pixels when
positioning child elements.

## Taskbar integration

```js
// Hide from taskbar (e.g. for system-tray apps)
win.setSkipTaskbar(true);

// Progress ring in the taskbar icon
win.setProgressBar({ state: ProgressBarState.Normal, progress: 42 });
```

WebviewJS exposes Tao's Windows window extensions for taskbar icons,
skip-taskbar state, undecorated shadows, enabled state, and native handles. See
[Windows extensions](../api/browser-window#windows-extensions).

## Content protection

Prevents the window contents from appearing in screenshots or screen-recording APIs:

```js
win.setContentProtection(true);
```

## Known limitations

- In wry 0.53, a `file:` page that calls `window.ipc.postMessage()` can abort because WebView2 reports the page source as a `file:` URI and wry attempts to convert it to an HTTP request URI. Use an `app://` custom protocol for pages that use IPC or `webview.expose()`.
- `setIgnoreCursorEvents(true)` (click-through) is supported on Windows via the `WS_EX_TRANSPARENT` extended window style.
- Window transparency requires `transparent: true` at creation time; it cannot be toggled at runtime.
- Tao does not expose a window blur or unfocus API. Keyboard focus can be given
  to the webview via `webview.focus()`.
