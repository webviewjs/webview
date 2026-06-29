# Linux

## X11 and Wayland window attributes

X11 creation options expose visual and screen IDs, `WM_CLASS` names,
override-redirect, `_NET_WM_WINDOW_TYPE`, and base size.

Wayland creation options expose the application ID and instance name.
`getWaylandSurface()` returns Tao's native Wayland surface pointer for
interoperability, or `0n` when the window uses X11.

See [BrowserWindow platform APIs](../api/browser-window#linux-creation-options).

## WebKitGTK

WebviewJS on Linux uses **WebKitGTK 4.1** (WebKit-based). Install the runtime and development headers before building or running:

```bash
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev

# Fedora / RHEL
sudo dnf install webkit2gtk4.1-devel libxdo-devel

# Arch Linux
sudo pacman -S webkit2gtk-4.1 xdotool
```

## Display server support

WebviewJS supports both **X11** and **Wayland** through Tao. The active backend
is selected at runtime from the available display environment.

No `Cargo.toml` changes or feature flags are needed.

## Menus

Native menu bars use Muda's GTK integration. WebviewJS obtains the GTK window
and default vertical box directly from Tao, so `app.setMenu()`, window menu
options, and `CustomMenuClick` events work on Linux.

## Wayland-specific notes

- Window decorations on Wayland are drawn client-side (via `adwaita` CSD).
- Absolute window positioning (`win.setPosition()`) may be ignored on compositors that enforce the XDG Shell placement protocol.
- Screen capture / content protection APIs are compositor-dependent.

## `setSkipTaskbar`

This calls Tao's GTK implementation. The final behavior remains subject to the
desktop environment and window manager.

## Tested environments

| Distribution | Display         | Status    |
| ------------ | --------------- | --------- |
| Ubuntu 22.04 | X11 / Wayland   | Supported |
| Fedora 40    | Wayland (GNOME) | Supported |
| Arch Linux   | X11 / Wayland   | Supported |
| Debian 12    | X11             | Supported |
