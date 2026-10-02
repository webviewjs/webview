---
title: 'Windows'
description: 'WebView2 runtime requirements and Windows-specific window behavior.'
---

## WebView2

The Windows webview uses the installed Microsoft Edge WebView2 Runtime. A matching runtime must be present on the target computer. If it is missing, install the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/); do not assume that a build bundles it.

```js
import { getWebviewVersion } from '@webviewjs/webview';

console.log(getWebviewVersion());
```

`getWebviewVersion()` reports the backend engine version when available. It is separate from the `VERSION` package version.

## Native package targets

The published N-API packages include Windows x64, ia32, and arm64 targets. The package loader selects an addon for the current process architecture. The desktop runtime still needs WebView2 and the Windows GUI environment.

## Menus

Windows menus appear in the native window. Set an application menu before creating windows that use it, or pass a per-window menu in BrowserWindowOptions. See [Menu](../api/menu).

## DPI and window geometry

`BrowserWindow` sizes and positions use physical pixels by default. Pass `logical: true` to the size and position methods to use logical pixels. `win.scaleFactor()` returns the current display scale factor. See [window geometry](../api/browser-window#size-position-and-monitors).

## Taskbar and window options

`setSkipTaskbar()`, `setProgressBar()`, and the Windows-specific taskbar icon methods are available for Windows. `setEnable()` enables or disables the native window. `windowsOwnerWindow`, `windowsClassName`, `windowsNoRedirectionBitmap`, `windowsDragAndDrop`, and `windowsUndecoratedShadow` are Windows-only creation options. See [BrowserWindow](../api/browser-window#windows-creation-options).

Transparency must be requested when creating the window with `transparent: true`; the option cannot be toggled later. `setContentProtection()` asks Windows to exclude the window from supported capture paths; verify its behavior for your capture APIs and deployment environment.

## Click-through and focus

`setIgnoreCursorEvents()` is supported on Windows. Tao does not expose a window blur/unfocus method; `webview.focus()` focuses page content. See [window controls](../guides/window-appearance) and [Webview controls](../guides/webview-controls).
