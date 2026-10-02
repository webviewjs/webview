---
title: 'FreeBSD'
description: 'Experimental FreeBSD x64 support through GTK and WebKitGTK.'
---

## Status and target

FreeBSD x64 is an experimental target. The package builds against Tao's GTK backend, Muda's GTK menu integration, and WebKitGTK 4.1; there is no separate FreeBSD webview engine. The published N-API target is x86_64-unknown-freebsd.

Install the system packages used by the repository's FreeBSD CI job:

```sh
sudo pkg install gtk3 webkit2-gtk_41 libsoup3 pkgconf xdotool libappindicator
```

## Menus and runtime checks

GTK menus are supported on FreeBSD. Application menu events are delivered when the application event pump runs.

Repository CI builds the FreeBSD x64 addon, runs Rust and package tests, and runs a GTK/WebKitGTK smoke test in a FreeBSD 15.1 VM under Xvfb. That smoke test creates a window with a per-window GTK menu, checks hasMenu(), creates a webview from inline HTML, and pumps the event loop. It does not verify interactive desktop rendering, tray UI, file dialogs, or notification behavior on a physical FreeBSD desktop.

See [Linux notes](./linux) for the GTK/WebKitGTK backend and [menus](../api/menu) for menu behavior.
