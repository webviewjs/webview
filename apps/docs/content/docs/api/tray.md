---
title: 'System Tray'
description: 'Create and manage native system tray icons through Application.'
---

Create tray icons through `Application`; direct construction is unsupported.
The application retains the native icon until `tray.dispose()` or `app.exit()`.

```js
const tray = app.createTrayIcon({
  id: 'main',
  icon: { data: rgba, width: 16, height: 16 },
  tooltip: 'My application',
  menu: { items: [{ id: 'quit', label: 'Quit' }] },
});
```

`TrayIconOptions` also accepts `title`, `iconIsTemplate`, `menuOnLeftClick`,
and `menuOnRightClick`. Image data may be encoded bytes without dimensions or
raw RGBA bytes with dimensions. See the runnable [tray example](https://github.com/webviewjs/webview/blob/main/apps/examples/tray.ts).

## Properties and methods

```ts
tray.id: string
tray.setIcon(data: Uint8Array | number[], width?: number, height?: number): void
tray.removeIcon(): void
tray.setMenu(menu?: MenuOptions | null): void
tray.setTooltip(tooltip?: string | null): void
tray.setTitle(title?: string | null): void
tray.setVisible(visible: boolean): void
tray.setIconAsTemplate(value: boolean): void
tray.setShowMenuOnLeftClick(value: boolean): void
tray.setShowMenuOnRightClick(value: boolean): void
tray.showMenu(): void
tray.rect(): TrayRect | null
tray.dispose(): void
tray.isDisposed(): boolean
tray[Symbol.dispose](): void
```

Methods that call a native operation throw if that operation fails or the tray
has already been disposed. `removeIcon()` removes only the image; it does not
dispose the tray. `setVisible(false)` hides the icon while keeping the tray
resource. `rect()` returns the icon's screen rectangle where the native backend
reports one, or `null` when it does not.

## Events

`TrayIcon` implements Node's `EventEmitter` methods: `on`, `once`, `off`,
`addListener`, `removeListener`, `removeAllListeners`, `listenerCount`,
`listeners`, `rawListeners`, `emit`, and `eventNames`.

| Event                    | Additional payload                                                       |
| ------------------------ | ------------------------------------------------------------------------ |
| `click`                  | `button?: 'left' \| 'right' \| 'middle'`, `buttonState?: 'up' \| 'down'` |
| `double-click`           | `button?: 'left' \| 'right' \| 'middle'` (Windows only)                  |
| `enter`, `move`, `leave` | Pointer position and tray rectangle                                      |

Every event payload includes `event`, `id`, `x`, `y`, and `rect`. Pointer
coordinates and the tray rectangle are native screen coordinates. Linux does
not emit tray pointer events. GTK tray backends also return `null` from
`rect()`.

Tray menu items emit the application's `custom-menu-click` event. On Linux the
GTK tray backend supports a context menu on right click, but
`menuOnLeftClick`, `menuOnRightClick`, `setShowMenuOnLeftClick()`, and
`setShowMenuOnRightClick()` have no effect there. `showMenu()` is unsupported
by GTK and has no effect on Linux or FreeBSD. GTK also cannot remove a tray
menu after it has been installed, so `setMenu(null)` does not remove it there.
See [Menu](./menu).

## Platform behavior

| Feature          | Behavior                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `title`          | Unsupported on Windows. On Linux it may require an icon and display depends on the panel. |
| `tooltip`        | Unsupported by the GTK Linux tray backend.                                                |
| `iconIsTemplate` | Used on macOS; no effect on other platforms.                                              |
| `double-click`   | Emitted on Windows; other backends do not promise it.                                     |
| Android          | `app.createTrayIcon()` throws an unsupported-platform error.                              |

FreeBSD uses the GTK tray backend. Its tray UI is not covered by the current
FreeBSD runtime smoke test; see [FreeBSD status](../platform/freebsd).

## Lifetime and disposal

Keep a strong reference while code needs the wrapper methods or event
listeners. Disposing a tray is idempotent. `app.exit()` disposes all tray
resources created by that application even if JavaScript still holds the
wrapper; `isDisposed()` then returns `true`.
