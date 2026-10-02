---
title: 'Application lifecycle'
description: 'Understand close requests, reusable hidden windows, disposal, and application shutdown.'
---

WebviewJS has a window-level close decision and application-level notifications. Use the `BrowserWindow` `close` event when code may cancel a user close request. Application close events report that a window or application is closing; they do not provide a cancellation hook.

## User requests to close a window

The native window system sends a close request. WebviewJS dispatches `close` on that `BrowserWindow` synchronously, then checks whether a listener prevented the request:

```js
win.on('close', (event) => {
  if (hasUnsavedChanges()) {
    event.preventDefault();
    showSavePrompt();
  }
});
```

Call `event.preventDefault()` during that synchronous dispatch. Calls after an `await`, timer, or later callback have no effect. If prevented, the native window and its webviews remain alive, and the application does not emit `window-close-requested` for that request.

If no listener prevents the request, WebviewJS emits `app`'s `window-close-requested` event and disposes that window and its webviews. `window-close-requested` is a notification; use the window's `close` event to cancel. The application payload contains the event name, not a `BrowserWindow` reference or ID, so attach per-window listeners when the specific window matters.

## Close events and methods

| API                                               | Effect                                                                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `win.on('close', listener)`                       | Runs synchronously for an OS close request. `event.preventDefault()` cancels that request only while the listeners are running.                                                                                       |
| `app.on('window-close-requested', listener)`      | Runs after a window close request was allowed. It cannot cancel the close.                                                                                                                                            |
| `app.on('application-close-requested', listener)` | Runs after the last native window is destroyed while an explicit `app.exit()` was not requested. This can follow an allowed OS close request or `win.close()` / `win.dispose()`. Explicit `app.exit()` suppresses it. |
| `win.hide()` / `win.setVisible(false)`            | Hides the window and keeps its native window and webview resources available.                                                                                                                                         |
| `win.show()` / `win.setVisible(true)`             | Shows a hidden window.                                                                                                                                                                                                |
| `win.close()` / `win.dispose()`                   | Immediately disposes the window and its webviews. This is not the cancelable OS close-request path.                                                                                                                   |
| `app.stop()`                                      | Stops the JavaScript timer that pumps GUI events. It does not dispose windows or other resources.                                                                                                                     |
| `app.exit()`                                      | Marks the application exited and disposes all resources created through it, including windows, webviews, contexts, and tray icons. New resources cannot be created afterward.                                         |

When the last window is destroyed without an explicit `app.exit()`, the application emits `application-close-requested` and finalizes its native resources. This event can follow a permitted OS close request or a direct `win.close()` / `win.dispose()` call. If you need a reusable window, cancel the OS close request and hide it explicitly:

```js
win.on('close', (event) => {
  event.preventDefault();
  win.hide();
});
```

`app.exit()` is the explicit shutdown path when the application must terminate while windows remain open. It releases native resources; it is not a request to hide the windows for later reuse.

## Confirm before closing

For an asynchronous confirmation, cancel the native request first and perform the prompt after the event dispatch:

```js
let closing = false;

win.on('close', (event) => {
  if (closing) return;
  event.preventDefault();
  void confirmClose().then((confirmed) => {
    if (confirmed) {
      closing = true;
      win.dispose();
    }
  });
});
```

Calling `dispose()` after confirmation performs the teardown directly. A repeated OS close request can still occur while the prompt is open, so applications with a modal prompt should also track that prompt state.

See [Multiple windows](./multiple-windows) for a window registry and the runnable [close example](https://github.com/webviewjs/webview/blob/main/apps/examples/close-example.ts) and [application events example](https://github.com/webviewjs/webview/blob/main/apps/examples/application-events.ts).
