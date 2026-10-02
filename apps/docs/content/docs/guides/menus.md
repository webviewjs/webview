---
title: 'Menus'
description: 'Attach application or per-window native menus and handle their events.'
---

Set the application menu before creating windows on Windows and GTK-based Linux/FreeBSD so those windows can attach it. On macOS, the menu is application-level.

```js
app.setMenu({
  items: [
    {
      label: 'File',
      submenu: {
        items: [
          { id: 'new', label: 'New', accelerator: 'CmdOrCtrl+N' },
          { id: 'open', label: 'Open', accelerator: 'CmdOrCtrl+O' },
          { role: 'separator' },
          { role: 'quit' },
        ],
      },
    },
  ],
});

const win = app.createBrowserWindow({ title: 'Editor' });
```

Handle a custom item's id through the application event:

```js
app.on('custom-menu-click', ({ customMenuEvent }) => {
  if (customMenuEvent.id === 'open') openDocument();
});
```

The event pump delivers menu events, so call `app.run()` or pump events manually. Linux uses Muda's GTK integration; menu items and `custom-menu-click` work there.

## Per-window menu

Supply a menu in `BrowserWindowOptions` on Windows and GTK-based Linux/FreeBSD. There is no `win.setMenu()` method:

```js
const settings = app.createBrowserWindow({
  title: 'Settings',
  menu: {
    items: [{ id: 'reset', label: 'Reset settings' }],
  },
});
```

A per-window menu overrides the global menu on Windows and GTK-based Linux/FreeBSD. `showMenu: false` prevents those windows from attaching the global menu. macOS menus belong to the application: `BrowserWindowOptions.menu` is not attached there, and `showMenu` does not hide the application menu. `win.hasMenu()` checks whether the wrapper owns a per-window menu object, not whether it is visible.

Calling `app.setMenu()` again replaces the application menu definition, but the native binding does not reattach that replacement to existing Windows or GTK-based Linux/FreeBSD windows. Set it before creating windows that should use it. Pass `null` to clear the global menu; on macOS that restores its default application menu.

## Items, roles, and accelerators

Custom items accept `id`, `label`, `enabled`, and `accelerator`. A nested `submenu` creates a submenu. Use a stable id for items your code handles. Predefined roles such as `copy`, `paste`, `undo`, `quit`, and `separator` map to native platform actions. See the complete [Menu API reference](../api/menu#predefined-roles) for role names and platform behavior.

The repository examples show [application menus](https://github.com/webviewjs/webview/blob/main/apps/examples/menu-system.ts) and [window menus](https://github.com/webviewjs/webview/blob/main/apps/examples/window-menus.ts).
