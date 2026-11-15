# macOS native regressions

Backported from [PR #92](https://github.com/webviewjs/webview/pull/92) for the
root-layout `v0` package. Tao is pinned to
`73ab3e94986f045ad379faee9b2560bffd84012c`, including the macOS observer-lifetime
and explicit borderless-shadow fixes.

Build the local addon, then opt into real GUI tests:

```sh
bun run build
bun run test:native:macos
```

Requires a logged-in macOS desktop session, Node.js 24+ and Bun on PATH. Run
without interacting with the windows. These tests use the root `index.js` public API and real N-API addon.
They skip unless on macOS with `WEBVIEW_NATIVE_TESTS=1`.

The parent Node test process serves HTTP while a fresh main-thread Node or Bun
child owns AppKit. A 25-second watchdog kills a blocked child; every child is
reaped and the server is closed, including on assertion failures. Native
resources and the application pump are explicitly disposed on normal exit.

- [Copilot CLI #5398](https://github.com/github/copilot-cli/issues/5398): adapted
  from the issue's reproduction to load `index.js` locally. Uses
  `whenReady({ interval: 50, ref: false })`, localhost, inline HTML and `data:`
  navigation, page timers, HTTP fetches, IPC, JS reads and DOM mutation. Each
  page must load before another window is created or focus is requested. After
  seven seconds without input, also exercises repeated manual pumps, multiple
  windows, resize, focus and cleanup. Serving HTTP in the parent isolates server
  availability from native pump blocking in the child.
- [WebviewJS #91](https://github.com/webviewjs/webview/issues/91): checks all 16
  combinations of decorations/resizable/minimizable/shadow after webview
  creation, style mutations, explicit shadow disabling and runtime changes.
  This asserts AppKit `hasShadow` state; visual compositor appearance requires
  human inspection.

Passing on one macOS version does not establish that the macOS 26 loading stall
is resolved. Retest on the affected OS before claiming that result. These tests
do not validate Windows or Linux runtime behavior.

Known Wry 0.55.1 limitation: `data:` pages load and execute JavaScript, but their
IPC messages are discarded in Wry's macOS delegate because `http::Uri` cannot
represent opaque data URLs. The tests assert data-page timers through JavaScript
evaluation and require IPC from HTTP and inline HTML. This is separate from Tao
pump scheduling and remains unfixed by this dependency update.
