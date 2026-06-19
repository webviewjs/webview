# IPC Messaging

wry injects `window.ipc.postMessage()` into each page. Node receives those messages through `webview.onIpcMessage()`.

```js
const webview = win.createWebview({ html: '<button id="ping">Ping</button>' });

webview.onIpcMessage((message) => {
  console.log(message.body.toString('utf8'));
});

webview.evaluateScript(`
  document.querySelector('#ping').addEventListener('click', () => {
    window.ipc.postMessage('hello from the page');
  });
`);
```

## Custom page global name

`window.ipc` always remains available. Set `ipcName` to add an alias before page scripts run:

```js
const webview = win.createWebview({
  url: 'app://localhost/index.html',
  ipcName: 'bindings',
});
```

The page can then call either `window.ipc.postMessage(...)` or `window.bindings.postMessage(...)`.

On Windows, load IPC-enabled pages through a custom protocol such as `app://`, not a `file:` URL. See [Custom Protocols](./custom-protocols.md).

## Node to page

Use `evaluateScript()` for one-way messages or DOM updates:

```js
webview.evaluateScript(`
  document.title = 'Connected';
`);
```

Use `evaluateScriptWithCallback()` to receive a serialized JavaScript result:

```js
webview.evaluateScriptWithCallback('document.title', (error, title) => {
  if (error) throw error;
  console.log(title);
});
```

## JSON messages

IPC message bodies are bytes. JSON is a practical convention:

```js
// Page
window.ipc.postMessage(JSON.stringify({ action: 'save', payload: { id: 1 } }));

// Node
webview.onIpcMessage((message) => {
  const data = JSON.parse(message.body.toString('utf8'));
  console.log(data.action);
});
```

For a structured Promise-based Node bridge, use [`webview.expose()`](../api/webview.md#expose-name-target) instead of building your own IPC request/response protocol.
