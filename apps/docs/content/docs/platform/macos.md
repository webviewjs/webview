---
title: 'macOS'
description: 'System WebKit, application menus, and macOS-specific window attributes.'
---

## WebKit and native package targets

WebviewJS uses the system WebKit framework through WKWebView. It does not bundle a browser engine. The published N-API packages include macOS x64 and arm64 targets.

## App menu

The native menu bar belongs to the application and appears at the top of the screen. `app.setMenu()` configures it; menu roles such as `about`, `hide`, `hideothers`, `showall`, `services`, `bringalltofront`, and `quit` map to native actions. See [Menu](../api/menu#predefined-roles).

Create the application and call GUI APIs on the runtime's main JavaScript thread. Do not create or use WebviewJS windows from a Node.js `worker_threads` worker.

## Window behavior

macOS-specific creation options include:

- macosMovableByWindowBackground for dragging the window by its background.
- macosTitlebarTransparent, macosTitleHidden, macosTitlebarHidden, and macosTitlebarButtonsHidden for titlebar presentation.
- macosFullsizeContentView to extend content into the titlebar area.
- macosDisallowHidpi to disable high-DPI behavior.
- macosHasShadow and macosTabbingIdentifier for window shadow and tab grouping.
- visibleOnAllWorkspaces for workspace visibility.

Runtime methods expose simple fullscreen, shadow, tabbing identifier, and document-edited state. These options and methods are described in [BrowserWindow](../api/browser-window#platform-extensions).

`setSkipTaskbar()` is a no-op on macOS. `setIgnoreCursorEvents()` maps to the native
click-through behavior. A window icon does not change the application Dock icon.
Use `app.setDockIcon()` to change it at runtime, and
`app.removeDockIcon()` to restore the original icon. See the
[Dock icon example](https://github.com/webviewjs/webview/blob/main/apps/examples/macos-dock-icon.ts).

Drag helpers use the current mouse event to move the window. Keep the drag request
inside the active press. A double-click in an eligible drag region toggles
maximize only if the pointer has not moved before mouse-up. See
[frameless windows](../guides/frameless-windows).

## Transparency

Request a transparent native window at creation and set the webview background alpha to zero:

```js
const win = app.createBrowserWindow({
  transparent: true,
  decorations: false,
});
const webview = win.createWebview({ html: '<div>Overlay</div>', transparent: true });
webview.setBackgroundColor(0, 0, 0, 0);
```

See the [window appearance guide](../guides/window-appearance) and [transparent window example](https://github.com/webviewjs/webview/blob/main/apps/examples/transparent.ts).
