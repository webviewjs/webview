# Multiple Windows

## Opening several windows

```js
const app = new Application();

function createWindow(url) {
  const win = app.createBrowserWindow({ title: url, width: 900, height: 600 });
  const webview = win.createWebview({ url });
  return { win, webview };
}

const win1 = createWindow('https://example.com');
const win2 = createWindow('https://nodejs.org');

app.run();
```

Both windows share the same event loop driven by the single `setInterval` pump.

## Tracking windows yourself

```js
const windows = new Map(); // id → { win, webview }

function openWindow(id, url) {
  if (windows.has(id)) {
    windows.get(id).win.show();
    return;
  }
  const win = app.createBrowserWindow({ title: id });
  const webview = win.createWebview({ url });
  windows.set(id, { win, webview });
}

app.on('window-close-requested', () => {
  // The window has been hidden by the runtime.
});

app.on('application-close-requested', () => {
  app.exit();
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
const childWebview = child.createWebview({
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
app.on('window-close-requested', () => {
  // One window was hidden.
});

app.on('application-close-requested', () => {
  // All tracked windows are now hidden.
  app.exit();
});
```
