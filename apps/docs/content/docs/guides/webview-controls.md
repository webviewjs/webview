---
title: 'Webview controls'
description: 'Open DevTools, control visibility and focus, set page zoom, and print webview content.'
---

These methods control the embedded browser surface. `BrowserWindow.show()` and `hide()` act on the native OS window; `Webview.setWebviewVisibility()` acts on the browser surface inside that window.

## DevTools

Enable developer tools when creating the webview, then open or close the panel from host code:

```js
const webview = win.createWebview({
  url: 'app://localhost/index.html',
  enableDevtools: true,
});

webview.openDevtools();
console.log(webview.isDevtoolsOpen());
webview.closeDevtools();
```

## Visibility and focus

```js
webview.setWebviewVisibility(false); // hide the browser surface
webview.setWebviewVisibility(true);

webview.focus(); // give keyboard focus to page content
webview.focusParent(); // return focus to the host window
```

The visibility method does not hide or dispose the `BrowserWindow`. Use `win.hide()` to hide the whole native window.

## Zoom and printing

`zoom()` sets a page scale factor: `1` is 100%, `1.25` is 125%, and `0.8` is 80%.

```js
webview.zoom(1.25);
webview.print(); // ask the native webview to print the current page
```

`print()` has no JavaScript return value; the platform webview handles printing. `hotkeysZoom` controls the browser's built-in keyboard zoom shortcuts. See the [Webview API reference](../api/webview#visibility-focus-zoom-and-printing) for all methods and option signatures.
