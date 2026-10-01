---
title: 'Building Standalone Executables'
description: 'Build a self-contained desktop application with the WebviewJS CLI and Node.js, Bun, or Deno.'
---

The `webview` command builds your application into a standalone executable. The target computer does not need a separate Node.js, Bun, or Deno installation. Your application still needs the platform's desktop webview runtime, such as WebView2 on Windows or WebKit on macOS and Linux.

## Quick start

Install WebviewJS in your application, then build from the project directory:

```bash
npm install @webviewjs/webview
npx webview build src/main.ts
```

The CLI uses Node.js SEA by default and writes the executable to `./dist`. The default name comes from your `package.json` name when it is a valid filename, otherwise from the entry file. Scoped names such as `@acme/my-app` produce `my-app`.

```bash
webview build src/main.ts --name my-app --out-dir ./release
```

Use `webview --help`, `webview --version`, and `webview build --help` for command help. The old `webview --build --input src/main.ts` form remains available temporarily and prints a deprecation warning.

## Shared options

| Option                      | Description                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `--runtime node\|bun\|deno` | Select a runtime. Node is the default.                                                                                           |
| `--name <name>`             | Executable filename without an automatically added Windows `.exe` suffix. Names may contain letters, numbers, `-`, `_`, and `.`. |
| `--out-dir <directory>`     | Output directory. Defaults to `./dist`. `--output` remains as an alias.                                                          |
| `--target <target>`         | Select a runtime-specific target. The matching WebviewJS native package must also be installed.                                  |
| `--native-addon <path>`     | Advanced override for the target-specific WebviewJS `.node` file.                                                                |
| `--asset <path>`            | Embed an asset; Node SEA takes files, while Bun and Deno also accept directories. Repeat the option for multiple assets.         |
| `--resources <json>`        | Read the legacy Node SEA JSON asset map. Resource paths are relative to the JSON file.                                           |
| `--minify`                  | Request minification from the selected runtime where supported.                                                                  |
| `--dry-run`                 | Validate inputs and runtime support, then print the planned commands without compiling.                                          |
| `--verbose`                 | Print subprocess commands with their arguments.                                                                                  |

For Node SEA, `--asset file.txt` uses the file's basename as its SEA key. A resources map can choose explicit keys:

```json
{
  "config.json": "./assets/config.json",
  "images/icon.png": "./assets/icon.png"
}
```

Read Node SEA assets with `require('node:sea').getAsset('config.json')`. The private WebviewJS addon asset name is reserved.

## Node.js

Node builds bundle the application with esbuild as one CommonJS script targeting Node 24. This gives SEA one entry script and avoids relying on ordinary filesystem modules at runtime. The WebviewJS `.node` addon is added to the SEA asset map automatically.

The runtime capability probe selects one of two SEA flows:

- **Node 24 through Node 25.4:** Node creates a preparation blob. The CLI copies that exact Node executable, removes its macOS signature, and injects the blob with the pinned Postject dependency. The temporary bundle, config, and blob live in the operating system's temporary directory and are removed after the build.
- **Node 25.5 and newer:** When `node --help` reports `--build-sea`, Node creates the final executable directly. Postject is not used.

When the executable starts, a small prelude reads the private addon asset from `node:sea`, writes it atomically beneath `os.tmpdir()` in a directory keyed by the WebviewJS version and addon SHA-256, then sets `NAPI_RS_NATIVE_LIBRARY_PATH`. It replaces SEA's builtin-only `require` with `createRequire(process.execPath)` so NAPI-RS can load that extracted `.node` file. The bundle and addon are both inside the executable; it does not load them from the application's `node_modules`.

macOS executables receive an ad-hoc `codesign --sign -` signature. This is not a developer identity or notarization. Windows distribution signing is separate: the CLI does not invent a certificate or claim that the output has been signed.

Node SEA does not cross-compile. Build on the platform and architecture where the executable will run.

## Bun

Bun builds use Bun's standalone compiler directly:

```bash
webview build src/main.ts --runtime bun
```

The CLI passes `--compile`, `--outfile`, optional `--target`, `--minify`, and repeatable embedded assets to `bun build`. It does not add a second bundling pass. WebviewJS's generated N-API loader is included in the application; the Bun integration fixture verifies that a compiled executable can call `getWebviewVersion()` after it has been moved away from the project.

The CLI recognizes Bun target names `bun-darwin-x64`, `bun-darwin-arm64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`, and `bun-windows-arm64`. Bun also accepts musl targets, but WebviewJS does not publish musl native addons, so this CLI rejects them. The Bun integration smoke test covered the current `darwin-arm64` host only; cross-target Bun executables are not claimed as verified.

## Deno

Deno builds use Deno 2's compiler with bundling and self-extraction:

```bash
webview build src/main.ts --runtime deno
```

The CLI runs `deno compile --bundle --self-extracting --allow-all`. A temporary target adapter gives Deno the selected `.node` file and maps unrelated optional N-API packages to build-only stubs, so it bundles the target addon without changing your project. The compiled entry locates Deno's extracted addon and sets `NAPI_RS_NATIVE_LIBRARY_PATH` before importing your app. The CLI passes `--no-check` because Deno 2.9 reports three unresolved internal callback aliases in WebviewJS's NAPI-RS-generated declaration file; this lets JavaScript and Node-style TypeScript projects package normally. Run `deno check` on application source separately when you want Deno's type diagnostics. User assets are passed through Deno 2.9's `--include` option; Deno also treats included `.js` and `.ts` files as module roots.

The CLI recognizes `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc`, `x86_64-apple-darwin`, `aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, and `aarch64-unknown-linux-gnu`. The Deno integration smoke test covered the current `aarch64-apple-darwin` host only; cross-target Deno executables are not claimed as verified.

## Native packages and cross-compilation

WebviewJS currently publishes native packages for macOS x64 and arm64; Windows x64, arm64, and ia32; and glibc Linux x64, arm64, ia32, and arm. Runtime targets are accepted only when both the runtime compiler and WebviewJS provide a matching target. The CLI resolves that target package from your project first, then checks the matching native file in a WebviewJS development checkout. It never substitutes the host addon for a different target.

If the target package is not installed, install the optional dependency for the target platform or pass `--native-addon` with a matching `.node` file. The CLI checks a recognizable target in the filename and reports when it does not match. It does not change your dependency installation during cross-compilation.

Cross-target compiler support is runtime-specific. Node SEA is host-only. Bun and Deno accept the target identifiers listed above, but an executable can only load WebviewJS when the matching native package is available. A local integration run validates the current host build; it does not execute cross-compiled binaries on their destination operating systems.

## Examples

```bash
# Default Node SEA build
webview build src/main.ts

# Bun standalone build
webview build src/main.ts --runtime bun --minify --asset assets

# Deno self-extracting build
webview build src/main.ts --runtime deno --out-dir ./release

# Check all inexpensive validations without compiling
webview build src/main.ts --runtime node --dry-run
```
