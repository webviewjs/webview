---
title: 'IPC messaging'
description: 'Choose raw messages for one-way transport or expose named host methods through a Promise-based bridge.'
---

WebviewJS provides two page-to-host mechanisms. Raw IPC sends a message body to a host callback. `webview.expose()` creates named page functions that call host methods and return promises.

## Raw IPC

The page calls `window.ipc.postMessage()` with a string. Serialize structured data yourself, then parse it in the host:

```js
// Page
window.ipc.postMessage(JSON.stringify({ action: 'save', id: 42 }));
```

```js
// Host
webview.onIpcMessage((message) => {
  const data = JSON.parse(message.body.toString('utf8'));
  console.log(data.action, data.id);
});
```

The handler receives an `IpcMessage`:

```ts
interface IpcMessage {
  body: Buffer;
  method: string;
  headers: HeaderData[];
  uri: string;
}

interface HeaderData {
  key: string;
  value?: string;
}
```

`body` contains the posted bytes. `method`, `headers`, and `uri` come from the native webview IPC request. Raw IPC is one-way; use `evaluateScript()` for a host-to-page update or use `expose()` when the page needs a request/response function.

`window.ipc` is always present. Set `ipcName` when creating the webview to add an alias, for example `ipcName: 'bindings'` makes `window.bindings.postMessage()` available before page scripts run. On Windows, prefer a registered custom protocol for bundled local pages; see [Custom Protocols](./custom-protocols).

## `expose()`

Expose a target object under a namespace. Enumerable own functions become page-callable methods; other enumerable own data properties become page-visible values:

```js
webview.expose('native', {
  appName: 'Example',
  async readFile(path) {
    return await readApplicationFile(path);
  },
});
```

The page calls those methods as promises, even when the host function returns synchronously:

```js
console.log(window.native.appName);
const text = await window.native.readFile('notes.txt');
```

The host function runs with the original target as `this`. Each namespace can be registered once per webview. The same namespace name may be used by another webview.

### Serialization contract

`expose()` transfers data with `JSON.stringify()` and `JSON.parse()`. Keep static values, arguments, and results JSON-compatible.

| Value or property                                        | Behavior                                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Enumerable own data property                             | Exposed. If its value is a function, it becomes a callable method; otherwise its value is serialized.                                     |
| Inherited, non-enumerable, or symbol-keyed property      | Not exposed.                                                                                                                              |
| Getter or setter                                         | Ignored; accessors are not invoked.                                                                                                       |
| `undefined` as a top-level static value or method result | Fails with `SerializationError`. In nested objects JSON omits such properties; in arrays JSON converts entries to `null`.                 |
| Function as a nested JSON value                          | In objects JSON omits the property; in arrays it becomes `null`. A top-level enumerable function property is exposed as a method instead. |
| `BigInt` or a cyclic structure                           | Fails serialization with `SerializationError`.                                                                                            |
| JSON-compatible primitive, array, or plain object        | Transferred using JSON semantics. Values such as `Date` may use their `toJSON()` representation.                                          |
| Synchronous throw or rejected host promise               | Rejects the page promise with an `Error` carrying the message. The bridge does not preserve the host error's prototype or stack.          |

Arguments are serialized as an array. JSON therefore converts `undefined` array entries to `null`; a `BigInt` or cycle rejects the page call with `SerializationError`. Non-finite numbers follow normal JSON rules and serialize as `null`.

Host-side serialization failures also reject the page promise with an error named `SerializationError`. Other host errors arrive as `Error` with the message; custom error names are not preserved.

The namespace must match the ASCII identifier form `^[A-Za-z_$][A-Za-z0-9_$]*$`. Names with hyphens, names that begin with a digit, and Unicode identifier characters are rejected. Invalid targets and duplicate namespace registration throw synchronously on the host.

See the runnable [expose example](https://github.com/webviewjs/webview/blob/main/apps/examples/expose.ts). The underlying implementation reserves its own IPC message marker for RPC calls; ordinary page messages continue to `onIpcMessage()`.

## Host to page

Use `evaluateScript()` for a one-way update. `evaluateScriptWithCallback()` returns the evaluated result as a string in a one-argument callback:

```js
webview.evaluateScriptWithCallback('document.title', (title) => {
  console.log('page title:', title);
});
```

The callback does not use an error-first `(error, result)` signature. Use `expose()` when page code should initiate an asynchronous host operation.
