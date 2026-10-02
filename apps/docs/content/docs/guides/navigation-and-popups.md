---
title: 'Navigation and popups'
description: 'Use synchronous guards to allow or reject navigation and new-window requests.'
---

Use `navigationHandler` and `newWindowHandler` in `createWebview()` when a navigation or popup request must be allowed or rejected. These callbacks return a boolean synchronously; a promise is not supported.

```js
const webview = win.createWebview({
  url: 'app://localhost/index.html',
  navigationHandler(url) {
    return url.startsWith('app://localhost/') || url.startsWith('https://docs.example.com/');
  },
  newWindowHandler(event) {
    return event.url?.startsWith('https://docs.example.com/') ?? false;
  },
});
```

`navigationHandler` runs for normal navigation and for a new-window URL. On a new-window request, `newWindowHandler` also runs when supplied. If both callbacks are supplied, both must return `true` for the request to be allowed. Keep them synchronous and fast.

## Guards and events

The `navigation` and `new-window` events are observational notifications. They let application code log or react to a request, but they do not control its outcome. Native webview callbacks deliver these event notifications asynchronously to JavaScript, so cancel requests in the synchronous handlers instead.

```js
webview.on('navigation', ({ url, target }) => {
  console.log('navigation request', target, url);
});

webview.on('new-window', ({ url, windowFeatures }) => {
  console.log('popup request', url, windowFeatures);
});
```

`navigation` uses `target: 'current'`. `new-window` uses `target: 'new-window'` and may include size and position hints supplied by the page. The API does not expose the original `target` attribute or guarantee that every browser engine supplies window features.

When a page uses `window.open()`, `target="_blank"`, or an equivalent action, decide explicitly whether the new-window URL is trusted. Use the guard to deny it when the app should keep navigation inside the current webview.

See the runnable [navigation handler example](https://github.com/webviewjs/webview/blob/main/apps/examples/navigation-handler.ts) and the complete event list in the [Webview reference](../api/webview#events).
