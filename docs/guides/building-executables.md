# Building Standalone Executables

The `webview` CLI can package your application into a single self-contained executable — no Node.js, Deno, or Bun installation required on the target machine.

## Quick start

```bash
# Install globally (or use npx)
npm install -g @webviewjs/webview

# Build with your current runtime (Node.js by default)
webview --build --input src/index.js --name myapp
```

The executable is written to `dist/` by default. On Windows it gets a `.exe` extension automatically.

---

## Choosing a runtime

Use `--runtime` (short: `-R`) to select how the executable is compiled:

| Runtime | Flag             | Tool used             |
| ------- | ---------------- | --------------------- |
| Node.js | `--runtime node` | Node.js SEA (default) |
| Deno    | `--runtime deno` | `deno compile`        |
| Bun     | `--runtime bun`  | `bun build --compile` |

### Node.js (default)

Node.js does not have a one-shot compile command, so the CLI automates the multi-step [Single Executable Application (SEA)](https://nodejs.org/api/single-executable-applications.html) workflow for you:

1. Writes a `sea-config.json` in the output directory.
2. Runs `node --experimental-sea-config sea-config.json` to produce `sea-prep.blob`.
3. Copies the current `node` binary.
4. Removes its existing signature (macOS / Windows).
5. Injects the blob via `postject` (downloaded automatically with `npx`).
6. Re-signs the binary (`codesign` on macOS, `signtool` on Windows — optional).

```bash
webview --build --runtime node --input src/index.js --name myapp --output dist
```

#### Bundling assets (Node.js only)

Pass a JSON file mapping asset names to file paths via `--resources`:

```json
{
  "icon.png": "./assets/icon.png",
  "config.json": "./config.json"
}
```

```bash
webview --build --runtime node --resources assets.json --input src/index.js --name myapp
```

Inside your script, read them with the `node:sea` API:

```js
const { getAsset } = require('node:sea');
const iconBuffer = getAsset('icon.png');
```

---

### Deno

Requires `deno` on your `PATH`. Uses `deno compile` which bundles everything into a single binary.

```bash
webview --build --runtime deno --input src/index.ts --name myapp --output dist
```

The CLI runs:

```bash
deno compile --allow-all --no-check --output dist/myapp src/index.ts
```

> `--allow-all` grants all permissions. Restrict them in your own build script if needed.

---

### Bun

Requires `bun` on your `PATH`. Uses `bun build --compile`.

```bash
webview --build --runtime bun --input src/index.ts --name myapp --output dist
```

The CLI runs:

```bash
bun build --compile src/index.ts --outfile dist/myapp
```

On Windows, Bun automatically appends `.exe` if not already present.

---

## All options

```
  -b, --build        Build the project into a standalone executable
  -R, --runtime      Runtime to use for compilation: node (default), deno, bun
  -n, --name         Executable name (default: webviewjs)
  -i, --input        Entry file (default: index.js in cwd)
  -o, --output       Output directory (default: dist/)
  -r, --resources    Resources mapping JSON file path (node runtime only)
  -d, --dry-run      Print what would be done without executing
  -h, --help         Show help
  -v, --version      Show version
```

---

## Examples

```bash
# Node.js SEA — default, no extra tools needed beyond node + npx
webview --build --input src/main.js --name myapp

# Deno — produces a single binary including the Deno runtime
webview --build --runtime deno --input src/main.ts --name myapp

# Bun — fast compilation, includes the Bun runtime
webview --build --runtime bun --input src/main.ts --name myapp

# Custom output directory and project name
webview --build --runtime bun --input src/main.ts --name "MyDesktopApp" --output ./release

# Dry-run to see what would happen
webview --build --runtime node --input src/main.js --name myapp --dry-run
```

---

## Platform notes

| Platform | Node SEA             | Deno compile         | Bun compile          |
| -------- | -------------------- | -------------------- | -------------------- |
| Windows  | ✅ `.exe` auto-added | ✅ `.exe` auto-added | ✅ `.exe` auto-added |
| macOS    | ✅ codesign applied  | ✅ ad-hoc signed     | ✅                   |
| Linux    | ✅                   | ✅                   | ✅                   |

### Code signing

- **Node.js** — the CLI removes the existing signature and re-signs with `codesign -s -` (macOS) or `signtool` (Windows) if available.
- **Deno** — applies an ad-hoc signature on macOS automatically. Use `codesign` / `signtool` for distribution.
- **Bun** — use `codesign` on macOS after building. On Windows, use `signtool`.

### Cross-compilation

- **Deno**: pass `--target` directly to `deno compile`. Use a custom build script rather than the webviewjs CLI for cross-compile targets.
- **Bun**: pass `--target` to `bun build`. Same recommendation.
- **Node SEA**: cross-compilation is not supported; build on the target OS.
