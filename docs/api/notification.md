# Notification

Displays a native desktop notification through
[notify-rust](https://docs.rs/notify-rust/latest/notify_rust/).

```js
import { Notification } from '@webviewjs/webview';

const notification = new Notification('Build complete', {
  body: 'The release executable is ready.',
  icon: './assets/app.png',
  requireInteraction: true,
});

notification.on('show', () => console.log('shown'));
notification.on('click', () => console.log('clicked'));
notification.on('close', () => console.log('closed'));
notification.on('error', ({ error }) => console.error(error));
```

## Permissions

Native application notifications do not use the browser permission model:

```js
Notification.permission; // "granted"
await Notification.requestPermission(); // "granted"
```

`requestPermission()` is a JavaScript compatibility stub and never prompts.

## Constructor

```ts
new Notification(title: string, options?: NotificationOptions)
```

The API accepts familiar Web Notification options:

```ts
interface NotificationOptions {
  body?: string;
  icon?: string;
  image?: string | Buffer;
  badge?: string;
  tag?: string;
  data?: unknown;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  persistent?: boolean;
  actions?: NotificationAction[];
  silent?: boolean;
  timestamp?: number;
  vibrate?: number | number[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}
```

notify-rust receives `title`, `body`, `icon`, `image`, and
`requireInteraction`. Persistent notification actions map their `action` and
`title` fields to native action buttons. Action icons are retained as readonly
instance data, but notify-rust does not currently expose per-action icons.
The remaining values are retained as readonly instance properties for API
familiarity but are not currently mapped to native backend features.

`icon` can be a platform icon name or file path. `image` accepts either a local
file path or a `Buffer` containing an encoded image:

```js
import { readFile } from 'node:fs/promises';

const image = await readFile('./assets/notification.png');
const notification = new Notification('Image ready', { image });
```

PNG, JPEG, WebP, GIF, BMP, ICO, TIFF, and other formats enabled by the Rust
`image` crate are decoded from buffers. Invalid encoded data emits `error`
without emitting `show`.

Linux sends decoded pixels directly to the notification server. Windows and
macOS use a temporary PNG because their native notification backends require a
file path. WebviewJS retains and removes that file with the notification
lifecycle. Remote URL strings are not downloaded and must be fetched into a
Buffer by application code first. Exact presentation varies by operating
system and notification server.

## Persistent notifications and actions

Notifications are non-persistent by default. Their native callbacks do not
keep the Node.js process alive.

Set `persistent: true` when the notification must remain interactive after the
rest of the application has no active work:

```js
const notification = new Notification('Download complete', {
  body: 'The archive is ready.',
  persistent: true,
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
});

notification.on('click', ({ action }) => {
  if (action === 'open') {
    // Open the downloaded archive.
  }
});
```

Actions follow the familiar persistent Web Notification shape. A non-empty
`actions` array requires `persistent: true`; otherwise the constructor throws
a `TypeError`. A default notification click emits `action: ""`, while clicking
an action button emits its action identifier.

Because WebviewJS does not have a service worker to restart, a persistent
notification keeps the Node.js process alive until the native backend reports
an interaction or closure. On platforms where notify-rust cannot close a
notification programmatically, calling `close()` cannot release that wait.

## Events

Notification instances provide the same EventEmitter methods as other
WebviewJS event sources. They also support `onclick`, `onclose`, `onerror`, and
`onshow` properties.

| Event   | Behavior                                                         |
| ------- | ---------------------------------------------------------------- |
| `show`  | The native backend accepted the notification                     |
| `click` | The backend reported default activation or a notification action |
| `close` | The backend reported dismissal, expiry, or native closure        |
| `error` | Display or response handling failed                              |

Interaction event availability depends on the native backend and desktop
notification server. The event object contains `type`, `target`, optional
`action`, and optional `error`.

On Windows, WebviewJS checks the global toast setting before submission. If
notifications are disabled in Windows Settings, the instance emits `error`
instead of `show`. Other operating-system policies such as Do Not Disturb can
still suppress presentation after the native backend accepts a notification.

## Closing

```js
notification.close();
```

Programmatic close is supported where notify-rust exposes it. Currently this
is available through the Linux/XDG backend. The method is safe but performs no
native close operation on backends where notify-rust does not expose one.

## Mobile

Android and iOS expose the JavaScript API but do not display a notification or
emit native lifecycle events.

See the runnable [notification example](../../examples/notification.mjs).
