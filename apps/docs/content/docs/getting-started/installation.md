---
title: 'Installation'
---

## Requirements

| Platform | Requirement                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| Windows  | WebView2 runtime (ships with Windows 11 and Edge; auto-installed on Windows 10) |
| macOS    | macOS 10.15 Catalina or later (WebKit is built-in)                              |
| Linux    | `libwebkit2gtk-4.1` and `libxdo`                                                |

### Linux dependency install

```bash
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel libxdo-devel

# Arch
sudo pacman -S webkit2gtk-4.1 xdotool
```

## Create a project

For a new application, use the official project creator:

```bash
npm create webview@latest
```

The `npm create webview-app@latest` alias runs the same scaffolder.

## Install from npm

```bash
npm install @webviewjs/webview
```

## Building from source

You need Bun 1.4.2 and the stable Rust toolchain. The repository includes the NAPI-RS CLI as a Webview package development dependency.

```bash
git clone https://github.com/webviewjs/webview
cd webview
bun install
bun --filter @webviewjs/webview build
```

The build places the platform-specific native addon in `packages/webview/`, regenerates `js-bindings.js` and `js-bindings.d.ts`, and compiles the public TypeScript layer from `packages/webview/lib/` into `packages/webview/dist/`.
