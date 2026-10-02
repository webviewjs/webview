---
title: 'Multiple windows'
description: 'Create, track, reuse, and dispose several native windows in one application.'
---

An `Application` can own several `BrowserWindow` instances. All of them share the same native event loop and JavaScript event pump.

```js
const windows = new Map();

function openWindow(id, url) {
  const existing = windows.get(id);
  if (existing && !existing.win.isDisposed()) {
    existing.win.show();
    return existing;
  }

  const win = app.createBrowserWindow({ title: id, width: 900, height: 600 });
  const webview = win.createWebview({ url });
  const handles = { win, webview };
  windows.set(id, handles);

  win.on('close', () => windows.delete(id));
  return handles;
}

openWindow('docs', 'https://webview.js.org');
openWindow('reference', 'https://nodejs.org');
app.run();
```

The map keeps JavaScript references to the wrappers while the application uses them. A normal allowed close disposes a window and its webviews, so remove that entry from the registry. If a window should be reusable after the close button is pressed, call `event.preventDefault()` synchronously and then `win.hide()`; see [Application lifecycle](./application-lifecycle).

## Child windows

`app.createChildBrowserWindow()` creates a child-marked native window. Check `win.isChild` to identify it. This is distinct from `WebviewOptions.child`, which positions a webview within its parent window.

```js
const dialog = app.createChildBrowserWindow({
  title: 'Settings',
  width: 420,
  height: 320,
});
const dialogView = dialog.createWebview({
  html: '<main><h1>Settings</h1></main>',
});
```

When `WebviewOptions.child` is true, `x`, `y`, `width`, and `height` define the webview rectangle in logical pixels relative to its containing window. With the default `child: false`, an unbounded webview fills the window.

## Track closure and exit

Listen on each window's `close` event for per-window state. `app`'s `window-close-requested` and `application-close-requested` events do not include a window wrapper. The application emits `application-close-requested` after the last native window is destroyed, including after direct `win.close()` or `win.dispose()`; explicit `app.exit()` suppresses it.

```js
app.on('application-close-requested', () => {
  // The final native window has been destroyed.
  // The application is already finalizing its native resources.
});
```

See [Application lifecycle](./application-lifecycle) for close prevention, `hide()`, `dispose()`, and `exit()` semantics. Runnable examples: [multiple windows](https://github.com/webviewjs/webview/blob/main/apps/examples/multiple.ts) and [multiple webviews](https://github.com/webviewjs/webview/blob/main/apps/examples/multi-webview.ts).
