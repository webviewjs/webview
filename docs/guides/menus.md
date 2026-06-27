# Menus

## Basic setup

```js
import { Application, WebviewApplicationEvent } from '@webviewjs/webview';

const app = new Application();

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
        ],
      },
    },
  ],
});

app.onEvent((ev) => {
  if (ev.event === WebviewApplicationEvent.CustomMenuClick) {
    switch (ev.customMenuEvent.id) {
      case 'new':
        createNewWindow();
        break;
      case 'open':
        openFilePicker();
        break;
    }
  }
});
```

## Updating the menu at runtime

```js
// Replace the whole menu
app.setMenu({ items: updatedItems });

// Remove entirely
app.setMenu(null);
```

## Per-window menus

Windows, child popups, and dialogs can have their own distinct menus:

```js
const win = app.createBrowserWindow({ title: 'Editor' });

win.setMenu({
  items: [{ label: 'Editor', submenu: { items: [{ id: 'editor-prefs', label: 'Preferences' }] } }],
});
```

Per-window menus override the global menu for that window. Clicking items still fires `CustomMenuClick` on the application event handler.

## Nested submenus

```js
{
  label: 'View',
  submenu: {
    items: [
      {
        label: 'Zoom',
        submenu: {
          items: [
            { id: 'zoom-in',  label: 'Zoom In',  accelerator: 'CmdOrCtrl+=' },
            { id: 'zoom-out', label: 'Zoom Out', accelerator: 'CmdOrCtrl+-' },
            { id: 'zoom-reset', label: 'Reset',  accelerator: 'CmdOrCtrl+0' },
          ],
        },
      },
      { role: 'fullscreen' },
    ],
  },
}
```

## Accelerator reference

```
CmdOrCtrl+S          → Cmd+S on macOS, Ctrl+S elsewhere
Alt+F4               → literal Alt+F4
Shift+CmdOrCtrl+Z    → redo shortcut
F5, F11              → function keys
```

## Platform differences

| Feature                  | Windows                      | macOS                    | Linux         |
| ------------------------ | ---------------------------- | ------------------------ | ------------- |
| Menu bar                 | Per-window, inside title bar | App-level, top of screen | Not supported |
| Predefined roles         | Most                         | All                      | N/A           |
| Accelerators             | Yes                          | Yes                      | N/A           |
| `CustomMenuClick` events | Yes                          | Yes                      | Never fires   |
