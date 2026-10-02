---
title: 'Linux'
description: 'WebKitGTK requirements, display backends, and GTK menus.'
---

## WebKitGTK and build dependencies

Linux uses WebKitGTK 4.1 with GTK 3 and libsoup 3. Prebuilt N-API packages still depend on the system webview libraries. To build the native addon from source on Debian or Ubuntu, install the packages used by the repository's Linux build:

```sh
sudo apt install pkg-config libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libglib2.0-dev libcairo2-dev libpango1.0-dev libatk1.0-dev \
  libgdk-pixbuf2.0-dev libgtk-3-dev libxdo-dev
```

Other distributions need equivalent WebKitGTK 4.1, libsoup 3, GTK 3, and XDoTool development packages. See [installation](../getting-started/installation).

## X11 and Wayland

Tao's GTK window backend can run in X11 and Wayland desktop sessions. Window placement, decorations, taskbar behavior, and capture protection depend on the window manager or Wayland compositor. Absolute positioning may be ignored by compositors.

`win.getWaylandSurface()` returns a native Wayland surface pointer on Wayland and `0n` on X11 or non-Linux targets. WebviewJS does not expose X11 visual/screen IDs or Wayland app-ID creation options.

## Native menus

Muda's GTK integration attaches application and per-window menus to GTK windows. Menu selection events arrive through the application event pump as `custom-menu-click`. Linux menus and their events are supported; run `app.run()` or pump events for callbacks to arrive. See [Menus](../guides/menus) and [Menu API](../api/menu).

## Native package and validation scope

Published Linux N-API targets use glibc and include x64, ia32, arm64, and armv7. The repository's CI builds these Linux targets and runs the package/Rust test jobs on Linux. CI does not establish visual behavior on every distribution, desktop environment, display server, or compositor.
