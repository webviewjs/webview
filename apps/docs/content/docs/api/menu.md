---
title: 'Menu'
description: 'Create application and per-window native menus with Muda.'
---

WebviewJS uses Muda for native menus. `Application.setMenu()` sets the application menu. A per-window menu is supplied through `BrowserWindowOptions.menu` when creating a window; `BrowserWindow` has no runtime `setMenu()` method.

## Application menu

```js
app.setMenu({
  items: [
    {
      label: 'File',
      submenu: {
        items: [
          { id: 'file-new', label: 'New', accelerator: 'CmdOrCtrl+N' },
          { id: 'file-open', label: 'Open', accelerator: 'CmdOrCtrl+O' },
          { role: 'separator' },
          { role: 'quit' },
        ],
      },
    },
    {
      label: 'Edit',
      submenu: {
        items: [
          { role: 'undo' },
          { role: 'redo' },
          { role: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' },
        ],
      },
    },
  ],
});
```

Calling `app.setMenu()` again replaces the application's menu definition. Pass `null` to clear it; on macOS this restores the default application menu. On Windows and GTK-based Linux/FreeBSD, set the global menu before creating windows that should display it. The binding does not reattach a replacement global menu to existing windows.

## Per-window menu

On Windows and GTK-based Linux/FreeBSD, pass `menu` when creating the window. It takes precedence over the global menu for that window:

```js
const win = app.createBrowserWindow({
  title: 'Editor',
  menu: {
    items: [{ label: 'Editor', submenu: { items: [{ id: 'editor-preferences', label: 'Preferences' }] } }],
  },
});
```

`showMenu` controls whether a Windows or GTK-based window displays the global menu; it defaults to `true`. macOS menus are attached to the application, so `showMenu` does not hide the app menu there. A macOS `BrowserWindowOptions.menu` value is not attached by the current native window path. `win.hasMenu()` reports whether the wrapper owns a per-window menu object, not whether that menu is visible; it returns `false` for a window using the global menu and on Android.

## Menu events

Listen on the application:

```js
app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log('menu item:', customMenuEvent.id);
});
```

Use an explicit `id` for any item your code handles. `CustomMenuEvent` has `id` and `windowId`; the current native adapter reports `windowId: 0` for menu events.

## Options

```ts
interface MenuOptions {
  items: MenuItemOptions[];
}

interface MenuItemOptions {
  id?: string;
  label?: string;
  enabled?: boolean; // defaults to true for custom items
  accelerator?: string;
  submenu?: MenuOptions;
  role?: string;
}
```

For custom items, use `id` as the stable event key and `label` as the displayed text. Nested submenus are supported.

## Predefined roles

| Role                                                                                                    | Action                    |
| ------------------------------------------------------------------------------------------------------- | ------------------------- |
| `copy`, `paste`, `cut`, `undo`, `redo`                                                                  | Standard editing action   |
| `selectall`, `select-all`                                                                               | Select all                |
| `separator`, `-`                                                                                        | Separator                 |
| `minimize`, `maximize`, `fullscreen`, `close`, `closewindow`, `close-window`                            | Window action             |
| `quit`, `about`, `hide`                                                                                 | Application action        |
| `hideothers`, `hide-others`, `showall`, `show-all`, `services`, `bringalltofront`, `bring-all-to-front` | macOS application actions |

Unknown roles cause menu creation to fail. The `services` and bring-to-front roles are macOS-specific.

## Platform behavior

| Platform | Menu attachment                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Windows  | Per-window menu bar in the native window.                                                                                                        |
| macOS    | Application-level menu bar. A default menu is installed when the application is created. Per-window `menu` is not attached; use `app.setMenu()`. |
| Linux    | Per-window GTK menu attached to Tao's GTK window and default container; menu-click events are delivered by the event pump.                       |
| FreeBSD  | GTK menu support uses the same Muda/GTK attachment path.                                                                                         |
| Android  | Menu creation and `Application.setMenu()` are unsupported.                                                                                       |

See the [Menus guide](../guides/menus) for setup examples and the [Linux platform notes](../platform/linux).
