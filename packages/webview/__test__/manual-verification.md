# Native manual verification

Run `bun run build` once before these checks. Launch examples from the repository
root with `bun run apps/examples/<example>.ts`.

## Desktop checks

- **Drag regions:** Run `drag-region.ts`. Drag the titlebar background and a
  nested element marked `data-webview-drag-region="deep"`; confirm the window
  moves. Confirm `data-webview-drag-region="false"` and buttons, inputs, and
  other interactive elements do not start a drag. Double-click an eligible
  region and confirm maximize/restore toggles. Repeat on macOS after pressing
  and releasing the pointer without moving, then double-click to check the
  macOS event handling path.
- **Page and native drag APIs:** Run `start-dragging.ts`. Confirm the page-side
  helper and the Node `BrowserWindow.startDragging()` action move the window
  only while the primary button is held. Confirm a call without a trusted held
  button does nothing in page code.
- **Native file drop:** Run `native-file-drop.ts`. Drag multiple files and a
  directory over the Webview; confirm `drag-enter`, `drag-over`, `drag-drop`,
  and `drag-leave` include the documented paths and Webview-relative position.
  Confirm normal HTML file-input drop behavior is unavailable while
  `nativeFileDrop` is enabled, and restored when it is disabled.
- **Runtime theme:** Create a Webview with a visible page, call
  `webview.setTheme(Theme.Dark)` and `webview.setTheme(Theme.Light)`, and
  confirm WebView2 changes appearance on Windows. Confirm other platforms
  accept the method without changing platform appearance.
- **Cursor position:** Move the pointer over a window and compare
  `getCursorPosition()` with `getCursorPosition(true)` at a non-1 display scale.
  Check the documented unsupported Wayland, iOS, and Android behavior where
  those targets are available.
- **File picker:** Run `file-picker.ts` and exercise open, multiple-select, and
  cancel behavior. On macOS, run `file-picker-issue-68.ts` both normally and
  with `--sync`; confirm file-input click/change/cancel events arrive and the
  asynchronous example's heartbeat remains responsive.
- **macOS Dock icon:** Run `macos-dock-icon.ts`, set an image, and restore the
  original icon. Confirm invalid image bytes and calls made off the main thread
  return errors.

## Platform checks

- **Linux custom-protocol bodies:** Run `custom-protocol-body.ts` on Linux with
  WebKitGTK 2.40 or newer. Confirm text, binary, and empty POST bodies reach the
  handler unchanged. Repeat on macOS and Windows to check the shared Fetch
  `Request` interface.
- **Native file drop:** Exercise the event sequence on Windows, macOS, and
  Linux. On Windows, check the WebView2 target replacement behavior; on Linux,
  test both X11 and Wayland when available.
- **API availability:** On non-macOS targets, call `setDockIcon()` and
  `removeDockIcon()` and confirm they are no-ops. On Android and iOS, confirm
  native window dragging reports its documented unsupported-platform error.

Record the operating system, webview engine version, display backend, and
result for each platform run; the automated suite does not exercise native GUI
input or OS dialogs.
