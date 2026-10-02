---
title: FreeBSD
---

## Status

FreeBSD x64 is experimental. It uses Tao's GTK backend and Wry with WebKitGTK
4.1; it does not use a separate FreeBSD webview implementation.

Install the GTK3, WebKitGTK 4.1, and libsoup3 development packages before
building:

```sh
sudo pkg install gtk3 webkit2-gtk_41 libsoup3 pkgconf xdotool libappindicator
```

The CI job is configured to run a native smoke test in the FreeBSD 15.1 VM with
Xvfb. It constructs an application and window, verifies that a GTK menu is
attached, creates a WebKitGTK webview from HTML, then pumps the event loop. Tray,
file-dialog, and notification integrations are included in the native build,
but are not covered by that runtime smoke test yet.
