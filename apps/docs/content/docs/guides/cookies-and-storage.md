---
title: 'Cookies and browser data'
description: 'Share or separate browser profiles and manage cookies and stored data.'
---

WebviewJS uses the operating system's browser engine. Persistent cookies,
cache, local storage, and IndexedDB live in that engine's browser context, not
in the JavaScript wrapper. Use an explicit [`WebContext`](../api/web-context)
when your app needs predictable sharing or separation between webviews.

## Share a profile

Create one context and pass it to each webview that should share browser data:

```js
const profile = app.createWebContext({ dataDirectory: './data/profile' });

const first = firstWindow.createWebview({
  url: 'https://example.com',
  webContext: profile,
});

const second = secondWindow.createWebview({
  url: 'https://example.com/account',
  webContext: profile,
});
```

`dataDirectory` is an optional native data path. Keep it stable and writable
when the profile should survive restarts. On Windows, a custom directory can
keep WebView2 data out of a protected application installation directory.
Without an explicit context, Wry uses the platform's default context
behavior; do not rely on that to isolate webviews.

Create separate `WebContext` instances with separate data directories when
profiles must not share persistent state. A context is an application-owned
native resource. Dispose it after its webviews are finished; `app.exit()` also
disposes it. `allowsAutomation` is currently enforced only on Linux, and only
one context at a time may enable it.

`WebviewOptions.incognito` asks the native engine for private browsing
behavior. Its storage behavior is provided by each system browser engine.
Use a separate explicit `WebContext` and directory when you need an
application-managed persistent profile boundary.

## Read cookies

```js
const matching = webview.getCookies('https://example.com');
const all = webview.getCookies();

for (const cookie of matching) {
  console.log(cookie.name, cookie.value, cookie.domain, cookie.path);
}
```

`getCookies(url?)` returns cookies matching the URL, or all cookies when the
argument is omitted. Cookie fields are:

| Field                | Type       | Meaning                                                         |
| -------------------- | ---------- | --------------------------------------------------------------- |
| `name`, `value`      | `string`   | Cookie name and value.                                          |
| `domain`, `path`     | `string?`  | Optional scope reported by the native engine.                   |
| `httpOnly`, `secure` | `boolean?` | Optional cookie flags.                                          |
| `sameSite`           | `string?`  | Optional same-site policy, commonly `strict`, `lax`, or `none`. |

Cookie parsing, defaults, and persistence follow the underlying browser engine.

## Write and delete cookies

```js
webview.setCookie({
  name: 'session',
  value: 'abc123',
  domain: 'example.com',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

webview.deleteCookie('session', 'example.com', '/');
webview.deleteCookie('old-session');
```

`deleteCookie(name, domain?, path?)` uses the supplied domain and path to
narrow the match. Omit them to request deletion by name across scopes. The
browser engine decides how cookies with matching attributes are resolved.

## Clear browsing data

`clearAllBrowsingData()` asks the native engine to clear cookies, cache, local
storage, and IndexedDB for that webview's browser context:

```js
webview.clearAllBrowsingData();
```

This acts on the context used by the webview. If multiple webviews share that
context, they share the affected browser data. It does not dispose the webview
or its `WebContext`.

See the runnable [WebContext example](https://github.com/webviewjs/webview/blob/main/apps/examples/web-context.ts)
and the [WebContext API](../api/web-context).
