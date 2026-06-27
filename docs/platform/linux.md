# Linux

## X11 and Wayland window attributes

X11 creation options expose visual and screen IDs, `WM_CLASS` names,
override-redirect, `_NET_WM_WINDOW_TYPE`, base size, and embedding into a
parent X11 window.

Wayland creation options expose the application ID and instance name.
`getWaylandXdgToplevel()` returns the native `xdg_toplevel` pointer for
interoperability, or `0n` when the window uses X11.

See [BrowserWindow platform APIs](../api/browser-window.md#linux-creation-options).

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

WebviewJS supports both **X11** and **Wayland** out of the box. winit 0.29 compiles both backends by default — the correct one is selected at runtime based on the `$WAYLAND_DISPLAY` / `$DISPLAY` environment variables.

No `Cargo.toml` changes or feature flags are needed.

## Menu limitations

Native menu bars are **not available** on Linux. The muda menu library requires GTK window handles that winit 0.29 does not expose. As a result:

- `app.setMenu()` and `win.setMenu()` are silently ignored.
- `CustomMenuClick` events are never fired.
- There is no visible menu bar in the window.

**Workaround**: implement your own in-page menu using HTML/CSS, and communicate with Node via IPC.

## Wayland-specific notes

- Window decorations on Wayland are drawn client-side (via `adwaita` CSD).
- Absolute window positioning (`win.setPosition()`) may be ignored on compositors that enforce the XDG Shell placement protocol.
- Screen capture / content protection APIs are compositor-dependent.

## `setSkipTaskbar`

This is a **no-op** on Linux; the behaviour depends on the window manager and cannot be reliably set from within the app.

## Tested environments

| Distribution | Display         | Status    |
| ------------ | --------------- | --------- |
| Ubuntu 22.04 | X11 / Wayland   | Supported |
| Fedora 40    | Wayland (GNOME) | Supported |
| Arch Linux   | X11 / Wayland   | Supported |
| Debian 12    | X11             | Supported |
