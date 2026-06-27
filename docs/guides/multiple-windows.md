# Multiple Windows

## Opening several windows

```js
const app = new Application();

function createWindow(url) {
  const win = app.createBrowserWindow({ title: url, width: 900, height: 600 });
  win.createWebview({ url });
  return win;
}

const win1 = createWindow('https://example.com');
const win2 = createWindow('https://nodejs.org');

app.run();
```

Both windows share the same event loop driven by the single `setInterval` pump.

## Tracking windows yourself

```js
const windows = new Map(); // id → BrowserWindow

function openWindow(id, url) {
  if (windows.has(id)) {
    windows.get(id).show();
    return;
  }
  const win = app.createBrowserWindow({ title: id });
  win.createWebview({ url });
  windows.set(id, win);
}

app.onEvent((ev) => {
  if (ev.event === WebviewApplicationEvent.WindowCloseRequested) {
    // The window has been hidden by the runtime.
    // Remove it from your map if you track open state.
  }

  if (ev.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    // All windows closed — shut down.
    app.exit();
  }
});
```

## Child (popup) windows

Child windows are positioned relative to a parent window and are useful for dialogs, palettes, and tool panels.

```js
const child = app.createChildBrowserWindow({
  title: 'Settings',
  width: 400,
  height: 300,
});
child.createWebview({
  url: 'app://settings',
  // x/y/width/height position the webview within the child window
});
```

## Showing / hiding instead of closing

The runtime hides a window (rather than destroying it) when the user clicks the OS close button. You can reuse it:

```js
function toggleWindow(win) {
  win.setVisible(!win.isVisible()); // or win.show() / win.hide()
}
```

## Window lifecycle events

```js
app.onEvent((ev) => {
  switch (ev.event) {
    case WebviewApplicationEvent.WindowCloseRequested:
      // One window was hidden. If you want to exit when the last one closes,
      // track the count yourself or rely on ApplicationCloseRequested.
      break;

    case WebviewApplicationEvent.ApplicationCloseRequested:
      // All tracked windows are now hidden.
      app.exit();
      break;
  }
});
```
