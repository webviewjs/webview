---
title: 'Window appearance'
description: 'Set window icons, transparency, decorations, and platform-specific window attributes.'
---

Set creation-time appearance in `BrowserWindowOptions`. Some properties, such as transparency, must be selected when the native window is created.

## Window icons

`setWindowIcon()` accepts encoded image bytes or raw RGBA bytes with dimensions. Use both dimensions for raw pixel data, or omit both to decode an encoded image:

```js
import { readFile } from 'node:fs/promises';

const icon = await readFile('./assets/window.png');
win.setWindowIcon(icon);
// Later, restore the platform default:
win.removeWindowIcon();
```

The native window icon is not the macOS Dock/application icon; that icon comes from the packaged application's bundle metadata. See [BrowserWindow icons](../api/browser-window#icons-taskbar-and-progress) for taskbar-specific icon APIs.

## Transparency and decorations

Create a transparent native window and a transparent webview background:

```js
const win = app.createBrowserWindow({
  transparent: true,
  decorations: false,
});

const webview = win.createWebview({
  html: '<main class="panel">Transparent window</main>',
  transparent: true,
});
webview.setBackgroundColor(0, 0, 0, 0);
```

`BrowserWindowOptions.transparent` creates a transparent window; `WebviewOptions.transparent` enables transparency in the webview. Set the webview background alpha to `0` when the page should show the window behind it. The OS compositor and webview engine determine the final result.

`decorations: false` removes the native title bar and border. You must provide any app-specific drag controls in the page or through a native integration. `win.setDecorations()` can change decorations later, but it does not add custom controls.

## Platform-specific attributes

Windows supports taskbar icons, owner-window association, `setEnable()`, and undecorated shadow controls. macOS supports titlebar layout, movable-by-background behavior, shadows, and tabbing identifiers. The exact fields and no-op behavior on other platforms are listed in the [BrowserWindow reference](../api/browser-window#windows-creation-options).

Runnable examples: [transparent window](https://github.com/webviewjs/webview/blob/main/apps/examples/transparent.ts) and [undecorated window](https://github.com/webviewjs/webview/blob/main/apps/examples/undecorated.ts).
