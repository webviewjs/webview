---
title: 'Notification'
description: 'Displays a native desktop notification through the platform notification backend.'
---

`Notification` creates a native desktop notification. It is a WebviewJS class exported from `@webviewjs/webview`:

```js
import { Notification } from '@webviewjs/webview';

const notification = new Notification('Build complete', {
  body: 'The release executable is ready.',
  icon: './assets/app.png',
});

notification.on('show', () => console.log('shown'));
notification.on('click', ({ action }) => console.log('clicked', action));
```

## Constructor and options

```ts
new Notification(title: string, options?: NotificationOptions)

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

The native backend receives `title`, `body`, `icon`, `image`, `requireInteraction`, and each action's `action` and `title`. The `icon` may be a platform icon name or a local file path. `image` is a local file path or encoded image `Buffer`; remote URLs are not downloaded. For a Buffer image, WebviewJS decodes the image. Windows and macOS use a temporary PNG file; Unix backends pass decoded pixels.

`actions` must be an array and requires `persistent: true`; otherwise construction throws `TypeError`. The `persistent` flag currently gates action configuration, but the native implementation does not use it to guarantee that an OS notification remains visible or that the JavaScript process stays alive. `requireInteraction` requests an indefinite native timeout where supported.

`badge`, `tag`, `data`, `dir`, `lang`, `renotify`, `silent`, `timestamp`, `vibrate`, and action `icon` are retained on the instance but are not applied by the current native backend. Invalid image bytes emit `error` without `show`.

## Properties and permission methods

```ts
Notification.permission: 'granted'
Notification.requestPermission(): Promise<'granted'>

notification.title: string
notification.body: string
notification.icon: string
notification.image: string | Buffer
notification.badge: string
notification.tag: string
notification.data: unknown
notification.dir: 'auto' | 'ltr' | 'rtl'
notification.lang: string
notification.renotify: boolean
notification.requireInteraction: boolean
notification.persistent: boolean
notification.actions: NotificationAction[]
notification.silent: boolean
notification.timestamp: number
notification.vibrate: number | number[]
```

The properties reflect the options supplied to the constructor, with defaults such as an empty `body`, `icon`, and `tag`. They are read-only. `requestPermission()` resolves to `'granted'` and does not prompt the user.

## Events

`Notification` extends Node's `EventEmitter` and also supports `onclick`, `onclose`, `onerror`, and `onshow` callback properties. Assign `null` to clear a property listener.

```ts
interface NotificationEvent {
  type: 'click' | 'close' | 'error' | 'show';
  target: Notification;
  action?: string;
  error?: Error;
}
```

| Event   | Meaning                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `show`  | The native backend accepted the notification.                                                                          |
| `click` | The backend reported activation or an action. A default click has `action: ''`; an action click carries its action id. |
| `close` | The backend reported dismissal, expiry, or native closure.                                                             |
| `error` | The backend could not display the notification or process its response.                                                |

Native response events depend on the platform and notification server. On Windows, WebviewJS checks the system toast setting before display; if it is disabled, the instance emits `error` instead of `show`.

## Close and platform behavior

```ts
notification.close(): void
```

Programmatic native close is implemented on Unix notification backends such as Linux and FreeBSD. It is a no-op on Windows and macOS, where the backend does not expose an equivalent close operation. Android and iOS construct the JavaScript object but do not display notifications or emit native lifecycle events.

See the runnable [notification example](https://github.com/webviewjs/webview/blob/main/apps/examples/notification.ts).
