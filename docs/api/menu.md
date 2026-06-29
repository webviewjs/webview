# Menu

WebviewJS uses [muda](https://github.com/tauri-apps/muda) for native menu bars.

## Setting a global menu

```js
app.setMenu({
  items: [
    {
      label: 'File',
      submenu: {
        items: [
          { label: 'New', id: 'file-new', accelerator: 'CmdOrCtrl+N' },
          { label: 'Open', id: 'file-open', accelerator: 'CmdOrCtrl+O' },
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

`setMenu()` is additive — call it again to replace the menu. Pass `null` to remove it.

## Per-window menu

```js
win.setMenu({
  items: [
    /* … */
  ],
});
```

A per-window menu overrides the global menu for that window only.

## Handling menu clicks

```js
app.on('custom-menu-click', ({ customMenuEvent }) => {
  console.log('clicked:', customMenuEvent.id);
});
```

## `MenuItemOptions` shape

```ts
interface MenuItemOptions {
  id?: string; // unique ID emitted in CustomMenuClick events
  label?: string; // display text
  enabled?: boolean; // default: true
  accelerator?: string; // e.g. "CmdOrCtrl+S", "Alt+F4"
  role?: string; // predefined system action (see below)
  submenu?: MenuOptions;
}
```

## Predefined roles

Roles map to native platform actions and are localised automatically.

| Role                                     | Action                             |
| ---------------------------------------- | ---------------------------------- |
| `copy`                                   | Copy selection                     |
| `paste`                                  | Paste                              |
| `cut`                                    | Cut                                |
| `undo`                                   | Undo                               |
| `redo`                                   | Redo                               |
| `selectall` / `select-all`               | Select all                         |
| `separator` / `-`                        | Horizontal separator line          |
| `minimize`                               | Minimise window                    |
| `maximize`                               | Maximise window                    |
| `fullscreen`                             | Toggle fullscreen                  |
| `close` / `closewindow` / `close-window` | Close window                       |
| `quit`                                   | Quit application                   |
| `about`                                  | Show about dialog                  |
| `hide`                                   | Hide application (macOS)           |
| `hideothers` / `hide-others`             | Hide other apps (macOS)            |
| `showall` / `show-all`                   | Show all apps (macOS)              |
| `services`                               | Services submenu (macOS)           |
| `bringalltofront` / `bring-all-to-front` | Bring all windows to front (macOS) |

## Accelerator syntax

```
CmdOrCtrl+S          → Cmd+S on macOS, Ctrl+S elsewhere
Alt+F4
Shift+CmdOrCtrl+Z
F5
```

## Platform notes

| Platform    | Behaviour                                                                       |
| ----------- | ------------------------------------------------------------------------------- |
| **Windows** | Menu bar attached to each window's title bar                                    |
| **macOS**   | Single app-level menu bar at the top of the screen                              |
| **Linux**   | Per-window GTK menu bar attached through Tao's GTK window and default container |
