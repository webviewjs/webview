# Cookies and Storage

## Reading cookies

```js
// All cookies for a URL
const cookies = webview.getCookies('https://example.com');

// Every cookie the webview has
const all = webview.getCookies();

for (const c of cookies) {
  console.log(c.name, '=', c.value, '  domain:', c.domain);
}
```

`WebviewCookie` fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Cookie name |
| `value` | `string` | Cookie value |
| `domain` | `string?` | Owning domain |
| `path` | `string?` | URL path scope |
| `httpOnly` | `boolean?` | Not accessible from JS |
| `secure` | `boolean?` | HTTPS-only |
| `sameSite` | `'strict' \| 'lax' \| 'none'?` | Cross-site policy |

## Writing a cookie

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
```

## Deleting a cookie

```js
// Specific domain + path
webview.deleteCookie('session', 'example.com', '/');

// Name only (removes across all domains/paths)
webview.deleteCookie('session');
```

## Clearing all browsing data

Wipes cookies, cache, local storage, IndexedDB, and session data:

```js
webview.clearAllBrowsingData();
```

## Incognito mode

Pass `incognito: true` when creating the webview to start a session with no persistent storage at all — cookies, cache, and local storage are discarded on exit:

```js
const webview = win.createWebview({
  url: 'https://example.com',
  incognito: true,
});
```
