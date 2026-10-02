---
title: 'WebContext'
description: 'Creates a browser data context that can be shared by multiple webviews.'
---

`WebContext` configures browser data for webviews. Pass the same context to each webview that should use the same profile. Use separate contexts and data directories when the profiles must be separated.

## Create a context

Create contexts through `Application`; direct construction throws:

```js
const profile = app.createWebContext({
  dataDirectory: './data/main-profile',
});
```

```ts
interface WebContextOptions {
  dataDirectory?: string;
  allowsAutomation?: boolean;
}
```

`dataDirectory` is an optional native browser-data directory. A relative path is resolved by the native backend from the application's working directory. Keep it writable and stable if data should persist between launches. On Windows, a custom path can keep WebView2 data out of a protected installation directory such as Program Files.

## Share or separate profiles

Pass the same `WebContext` to webviews that should share cookies, cache, and storage:

```js
const first = firstWindow.createWebview({
  url: 'https://example.com',
  webContext: profile,
});

const second = secondWindow.createWebview({
  url: 'https://example.com',
  webContext: profile,
});
```

When no explicit `webContext` is supplied, Wry uses the platform's default context behavior. Do not rely on omitted contexts to create isolated profiles. Pass an explicit context when sharing or separation matters. `WebviewOptions.incognito` separately requests private browsing behavior from the native engine.

Use a distinct `dataDirectory` for an independent persistent profile:

```js
const privateProfile = app.createWebContext({
  dataDirectory: './data/private-profile',
});
```

See [Cookies and storage](../guides/cookies-and-storage) for cookie and cleanup examples.

## Properties and methods

```ts
context.dataDirectory: string | null
context.isCustomProtocolRegistered(scheme: string): boolean
context.setAllowsAutomation(enabled: boolean): void
context.dispose(): void
context.isDisposed(): boolean
context[Symbol.dispose](): void
```

`dataDirectory` is `null` when the context has no custom data-directory path. `isCustomProtocolRegistered()` queries the native context. `setAllowsAutomation()` is currently enforced only on Linux, and only one context may allow automation at a time.

The application tracks contexts created through it and disposes them during `app.exit()`. Dispose a context only after all webviews using it are finished. Disposal is idempotent.

See the runnable [web context example](https://github.com/webviewjs/webview/blob/main/apps/examples/web-context.ts).
