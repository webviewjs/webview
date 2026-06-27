# Installation

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

## NPM

```bash
npm install @webviewjs/webview
```

## Building from source

You need the Rust toolchain and the [napi-rs CLI](https://napi.rs/docs/introduction/getting-started).

```bash
git clone https://github.com/webviewjs/webview
cd webview
npm install
npm run build   # compiles Rust and generates JS bindings
```

The compiled native addon is placed in `<platform>-<arch>/` (e.g. `win32-x64-msvc/`) and `index.js` is updated automatically.
