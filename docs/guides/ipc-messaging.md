# IPC Messaging

IPC lets web content (HTML/JS) talk to Node.js and vice versa.

## Page → Node

The page uses the injected `window.__webview__.postMessage()` helper:

```html
<button id="btn">Send ping</button>
<script>
  document.getElementById('btn').addEventListener('click', () => {
    window.__webview__.postMessage('hello from the page');
  });
</script>
```

Node receives the message via the `ipcHandler` option:

```js
const webview = win.createWebview({
  html: `…`,
  ipcHandler: (msg) => {
    const text = msg.body.toString('utf8');
    console.log('IPC received:', text);
    // msg.method, msg.headers, msg.uri are also available
  },
});
```

`postMessage` also accepts binary payloads; the `body` field is always a `Buffer`.

## Node → Page

Call `evaluateScript()` to run arbitrary JS in the page:

```js
webview.evaluateScript(`
  document.getElementById('status').textContent = 'Connected';
`);
```

For async operations, use `evaluateScriptWithCallback()`:

```js
webview.evaluateScriptWithCallback(
  'document.title',
  (result) => console.log('Page title:', result),
);
```

## Injection at startup

Use `initializationScript` to define globals before any page script runs — useful for exposing a Node-backed bridge:

```js
const webview = win.createWebview({
  url: 'https://myapp.local',
  initializationScript: `
    window.myBridge = {
      version: '1.0.0',
      openFile() { window.__webview__.postMessage(JSON.stringify({ action: 'openFile' })); },
    };
  `,
});
```

## Structured messages (JSON convention)

IPC carries raw bytes; wrapping in JSON is a common pattern:

```js
// Node side
ipcHandler: (msg) => {
  const data = JSON.parse(msg.body.toString());
  switch (data.action) {
    case 'openFile': handleOpenFile(); break;
    case 'saveData': handleSave(data.payload); break;
  }
}
```

```js
// Page side
window.__webview__.postMessage(JSON.stringify({ action: 'saveData', payload: form.getData() }));
```
