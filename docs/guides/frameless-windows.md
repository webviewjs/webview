# Frameless Windows and Window Dragging

A frameless window has no native title bar, so the page draws its own. Create the window with `decorations: false`, then make the title bar draggable. WebviewJS offers three ways to start a native window drag. They differ in who starts the drag:

| Mechanism                            | Started by                                                         | Use it for                                                |
| ------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `data-webview-drag-region` attribute | The built-in helper, on `mousedown`; double-click toggles maximize | Custom title bars with no drag code                       |
| `window.webviewjs.startDragging()`   | Page code, while the primary mouse button is down                  | Dragging from a custom element that isn't a marked region |
| `win.startDragging()`                | Node code, from an `onIpcMessage` handler during the same press    | Dragging decided by the application                       |

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
        <header data-webview-drag-region="deep">Custom titlebar <button>Close</button></header>
        <main>Page content</main>
      </body>
    </html>`,
});

app.run();
```

A primary-button `mousedown` in a drag region starts a native drag immediately. The nearest marked element on the event path determines whether the press can drag:

- A bare attribute, an empty value, or `"true"` makes only the marked element itself draggable. Its descendants are not included.
- `"deep"` makes the marked element and its descendants draggable.
- `"false"` opts out at that element, so a draggable ancestor does not take over. A more specific marker inside it is evaluated first.

Unmarked links, buttons, form controls, labels, summaries, elements with an interactive ARIA role or `tabindex`, and editable content block dragging. Add a drag-region attribute to an interactive element to make it a region itself.

Double-clicking an eligible region toggles maximize. This only changes the window when it is resizable and, when maximizing, maximizable. On Windows and Linux the toggle starts on `mousedown`. On macOS it waits for the matching `mouseup` and is cancelled if the pointer moved from the second press or left the drag region.

- **Unmarked interactive children keep their behavior.** Presses on links, buttons, form controls, labels, summaries, and `contenteditable` content inside a region don't drag.
- **Shadow DOM works.** Regions and controls inside open shadow roots are recognized.

## Page-side `window.webviewjs.startDragging()`

When your own page code decides when a drag starts, call `window.webviewjs.startDragging()` while the primary button is held. For example, wait for a small movement in a `mousemove` handler before asking the native window to move:

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

The page API posts the same internal drag message when the primary button is down. The example waits for movement so ordinary clicks don't request a drag. The built-in attribute helper starts on `mousedown` and handles double-clicks itself.

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

With the helpers disabled, `data-webview-drag-region` attributes and their double-click maximize behavior do nothing, and `window.webviewjs` is not defined. `win.startDragging()` stays available.

## Message isolation

The helper communicates with Node through two fixed internal IPC messages: `__webviewjs_start_dragging__` and `__webviewjs_toggle_maximize__`. When the helpers are enabled, the native IPC handler consumes both before any `onIpcMessage` handler runs, so drag and maximize requests never appear in application IPC. Avoid sending either string from your own page code.

## Platform notes

- **Windows:** the drag uses the system move loop, which runs until the button is released. Double-click maximize toggles on `mousedown`.
- **macOS:** double-click maximize waits for `mouseup`; moving the pointer from the second press cancels it. The drag uses the current mouse event.
- **Linux:** the drag is a GTK move request. Its behavior depends on the window manager, and some Wayland compositors may ignore it.
- **Android and iOS:** `win.startDragging()` throws. The helper and `window.webviewjs.startDragging()` are no-ops.
- `macosMovableByWindowBackground` is unchanged. The helper doesn't change window-level options.
