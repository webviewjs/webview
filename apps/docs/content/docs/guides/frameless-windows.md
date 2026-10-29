---
title: 'Frameless windows'
description: 'Build a custom title bar, start native window drags from the page or Node, and choose the right drag mechanism.'
---

A frameless window has no native title bar, so the page draws its own. Create the window with `decorations: false`, then make the title bar draggable. WebviewJS offers three ways to start a native window drag. They differ in who starts the drag:

| Mechanism                          | Started by                                                      | Use it for                                          |
| ---------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `data-webview-drag-region`         | The built-in helper, on a primary-button press in the page      | Custom title bars with no drag code                 |
| `window.webviewjs.startDragging()` | Page code, from a `mousemove` while the button is held          | Dragging from an element that isn't a marked region |
| `win.startDragging()`              | Node code, from an `onIpcMessage` handler during the same press | Dragging decided by the application                 |

Use the attribute for title bars. Use the page API when your page code decides when a drag begins. Use `win.startDragging()` when the decision belongs in Node. Runnable versions are in the [drag region example](https://github.com/webviewjs/webview/blob/main/apps/examples/drag-region.ts) and the [start dragging example](https://github.com/webviewjs/webview/blob/main/apps/examples/start-dragging.ts).

## Automatic drag regions

```ts
import { Application } from '@webviewjs/webview';

const app = new Application();
const window = app.createBrowserWindow({ title: 'Frameless', width: 480, height: 320, decorations: false });

window.createWebview({
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

A primary-button press in an eligible region starts a native drag immediately. A bare
`data-webview-drag-region` attribute or `"true"` applies only to the marked element.
Use `"deep"` to include descendants. A nested `"false"` region opts out of any
matching ancestor. The helper uses the event's composed path, including elements
inside open shadow roots, and covers elements added after page load.

- **Interactive elements keep their behavior.** Unmarked links, buttons, form
  controls, labels, summaries, editable elements, focusable elements, and
  elements with common interactive ARIA roles block dragging.
- **Marked controls can drag.** Add the drag attribute to an interactive element
  when it should start a drag.
- **Double-click toggles maximize.** It only changes state when the window is
  resizable and can be maximized. macOS completes the toggle on mouse-up if the
  pointer has not moved.

## Page-side `window.webviewjs.startDragging()`

When your page code decides when a drag starts, call `window.webviewjs.startDragging()` from a `mousemove` handler while the primary button is held:

```ts
let press: { x: number; y: number } | null = null;

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

Call the page API from a `mousemove` in an active gesture while the primary
button is held. The helper sends the native request through IPC and ignores the
call unless it has observed a trusted primary-button press.

The call does nothing unless the page sees the primary button down. `window.webviewjs` is defined once, before page scripts run, and it is frozen. If a preload script already defines `window.webviewjs`, the helper leaves that global alone and the page API is not installed.

## Dragging from Node

`win.startDragging()` moves the window with the primary button, like a native title bar. Call it synchronously from an `onIpcMessage` handler that runs during the press, as the page sends the gesture:

```ts
webview.onIpcMessage((message) => {
  if (message.body.toString('utf8') === 'drag') win.startDragging();
});
```

Calls from timers, promises, or other deferred code can run after the button has
been released. Exposed IPC methods are invoked synchronously inside the native
IPC callback, so an exposed method can call `win.startDragging()` during the
originating gesture. The method throws if the window has been disposed, or if
the platform can't drag windows.

## Disabling the helpers

The automatic drag regions and `window.webviewjs` are both injected when `enableDragRegionHelpers` is `true`, which is the default. To turn both off, pass `false`:

```ts
const webview = win.createWebview({ html, enableDragRegionHelpers: false });
```

With the helpers disabled, `data-webview-drag-region` attributes have no effect
and WebviewJS does not inject `window.webviewjs`. A global defined by your own
preload script is left in place. `win.startDragging()` stays available.

## Message isolation

The helper communicates with Node through fixed internal IPC messages for
dragging and maximize toggles. When the helpers are enabled, the native IPC
handler consumes those messages before any `onIpcMessage` handler runs, so
helper requests never appear in application IPC.

## Platform notes

- **Windows:** the drag uses the system move loop, which runs until the button is released.
- **macOS:** the drag uses the current mouse event. Start it during the press;
  double-click maximize completes only if the pointer stays at its original
  position until mouse-up.
- **Linux:** the drag is a GTK move request. Its behavior depends on the window manager, and some Wayland compositors may ignore it.
- **Android and iOS:** `win.startDragging()` throws. The helper and `window.webviewjs.startDragging()` do nothing.
- `macosMovableByWindowBackground` is unchanged. The helper doesn't change window-level options.
