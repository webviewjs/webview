# WebContext

A `WebContext` owns browser data and configuration shared by webviews. Use
separate contexts for isolated profiles, or reuse one context when webviews
need the same cookies, cache, local storage, and IndexedDB data.

## Creation

Create a context through `Application`:

```js
const context = app.createWebContext({
  dataDirectory: './browser-data',
  allowsAutomation: false,
});
```

```ts
interface WebContextOptions {
  dataDirectory?: string;
  allowsAutomation?: boolean;
}
```

`new WebContext()` is not supported. Keep the context alive for at least as
long as every webview that uses it.

## Using a context

Pass the context when creating each webview:

```js
const first = firstWindow.createWebview({
  url: 'https://example.com',
  webContext: context,
});

const second = secondWindow.createWebview({
  url: 'https://example.com',
  webContext: context,
});
```

Both webviews use the same browser-data store. A webview created without
`webContext` uses its own default context.

See the runnable [web context example](../../examples/web-context.mjs).

## Properties and methods

```ts
context.dataDirectory: string | null
context.isCustomProtocolRegistered(scheme: string): boolean
context.setAllowsAutomation(enabled: boolean): void
```

`dataDirectory` reports the configured persistent data directory.
`isCustomProtocolRegistered()` checks the context's native protocol registry.

Automation is currently enforced only on Linux, where only one context can
allow automation at a time. Enable it only for controlled testing.
