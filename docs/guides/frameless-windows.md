# Frameless Windows and Window Dragging

A frameless window has no native title bar, so the page draws its own. Create the window with `decorations: false`, then make the title bar draggable. WebviewJS offers three ways to start a native window drag. They differ in who starts the drag:

| Mechanism                            | Started by                                                      | Use it for                                                |
| ------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| `data-webview-drag-region` attribute | The built-in helper, on a primary-button press in the page      | Custom title bars with no drag code                       |
| `window.webviewjs.startDragging()`   | Page code, from a `mousemove` while the button is held          | Dragging from a custom element that isn't a marked region |
| `win.startDragging()`                | Node code, from an `onIpcMessage` handler during the same press | Dragging decided by the application                       |

Use the attribute for title bars. Use the page API when your own page code decides when a drag begins. Use `win.startDragging()` when the decision belongs in Node. See the runnable [drag region example](../../examples/drag-region.mjs) and [start dragging example](../../examples/start-dragging.mjs).

## Automatic drag regions

```js
import { Application } from '@webviewjs/webview';

const app = new Application();
const win = app.createBrowserWindow({ title: 'Frameless', width: 480, height: 320, decorations: false });

win.createWebview({
  html: `<!DOCTYPE html>
    <html>
      <body>
        <header data-webview-drag-region>Custom titlebar <button>Close</button></header>
        <main>Page content</main>
      </body>
    </html>`,
});

app.run();
```

A primary-button press inside an element marked `data-webview-drag-region` starts a native drag, once the pointer has moved a few pixels with the button still held. Clicks never move the window. The helper listens on `window`, so elements added later are covered without setup.

- **Interactive children keep their behavior.** Presses on links, buttons, form controls, labels, summaries, and `contenteditable` content inside a region don't drag.
- **Page code can opt out.** If a handler calls `event.preventDefault()` on the `mousedown`, the helper ignores that press.
- **Shadow DOM works.** Regions and controls inside open shadow roots are recognized.

## Page-side `window.webviewjs.startDragging()`

When your own page code decides when a drag starts, call `window.webviewjs.startDragging()` from a `mousemove` handler, after a small movement, while the primary button is held:

```js
let press = null;
titlebar.addEventListener('mousedown', (event) => {
  press = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
});
window.addEventListener('mousemove', (event) => {
  if (press === null || (event.buttons & 1) === 0) return;
  if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 4) return;
  press = null;
  window.webviewjs.startDragging();
});
window.addEventListener('mouseup', () => {
  press = null;
});
```

Start the drag from a `mousemove` in an active gesture, not from `mousedown`. The request crosses IPC, so a fast click can release the button before it arrives. The operating system then starts a drag that waits for a release it has already missed, and the window follows the pointer. The threshold keeps a click with a slight jitter from starting a drag.

The call does nothing unless the primary button is down, as tracked by the page. It's a page global defined once, before page scripts run, and it's frozen. If a preload script already defines `window.webviewjs`, the helper leaves that global alone and the page API is not installed.

## Dragging from Node

`win.startDragging()` moves the window with the primary button, like a native title bar. Call it synchronously from an `onIpcMessage` handler that runs during the press, as the page sends the gesture:

```js
webview.onIpcMessage((message) => {
  if (message.body.toString('utf8') === 'drag') win.startDragging();
});
```

Calls from timers, promises, or other deferred code can run after the button has been released. The method throws if the window has been disposed, or if the platform can't drag windows.

## Disabling the helpers

Automatic drag regions and `window.webviewjs` are both injected when `enableDragRegionHelpers` is `true`, which is the default. To turn both off, pass `false`:

```js
const webview = win.createWebview({ html, enableDragRegionHelpers: false });
```

With the helpers disabled, `data-webview-drag-region` attributes do nothing and `window.webviewjs` is not defined. `win.startDragging()` stays available.

## Message isolation

The helper communicates with Node through a fixed internal IPC message, `__webviewjs_start_dragging__`. When the helpers are enabled, the native IPC handler consumes that message before any `onIpcMessage` handler runs, so drag requests never appear in application IPC. Avoid sending that exact string from your own page code.

## Platform notes

- **Windows:** the drag uses the system move loop, which runs until the button is released.
- **macOS:** the drag uses the current mouse event. A drag started outside a press, or after the button is released, can leave the window following the pointer. The gesture rule above avoids this.
- **Linux:** the drag is a GTK move request. Its behavior depends on the window manager, and some Wayland compositors may ignore it.
- **Android and iOS:** `win.startDragging()` throws. The helper and `window.webviewjs.startDragging()` are no-ops.
- Double-click to maximize is not provided.
- `macosMovableByWindowBackground` is unchanged. The helper doesn't change window-level options.
