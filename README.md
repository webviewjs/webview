# WebviewJS

[![CI](https://github.com/webviewjs/webview/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/webviewjs/webview/actions/workflows/CI.yml)
[![npm](https://img.shields.io/npm/v/%40webviewjs%2Fwebview?logo=npm)](https://www.npmjs.com/package/@webviewjs/webview)
[![License](https://img.shields.io/github/license/webviewjs/webview)](https://github.com/webviewjs/webview/blob/main/LICENSE)

WebviewJS is a typed JavaScript binding for building desktop applications with the webview provided by the operating system. It connects Node.js, Bun, or Deno to native windows through N-API and the `tao` and `wry` libraries.

This repository contains the published package, its documentation site, runnable examples, and the tooling used to develop them.

[Documentation](https://webview.js.org) · [npm package](https://www.npmjs.com/package/@webviewjs/webview) · [Examples](https://github.com/webviewjs/webview/tree/main/apps/examples) · [Issues](https://github.com/webviewjs/webview/issues)

## Repository

| Workspace                 | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `packages/webview`        | Published `@webviewjs/webview` native binding and CLI          |
| `packages/create-webview` | Official WebviewJS project scaffolder (`create-webview`)       |
| `apps/docs`               | Documentation site at [webview.js.org](https://webview.js.org) |
| `apps/examples`           | Runnable JavaScript examples                                   |

## Development

Install [Bun 1.3.14](https://bun.sh/), [Rust stable](https://www.rust-lang.org/tools/install), and [Node.js 24 or newer](https://nodejs.org/) for package tests.

```bash
bun install
bun run build
bun run test
bun run lint
bun run format:check
bun run check
```

## Working on the package

Build the native package and its TypeScript API with:

```bash
bun --filter @webviewjs/webview build
```

## Working on the docs

Start the documentation site locally with:

```bash
bun --filter @webviewjs/docs dev
```

## Examples

Build the package, then run an example with Node.js:

```bash
bun --filter @webviewjs/webview build
node apps/examples/simple.mjs
```

## Project structure

```text
apps/
  docs/                 Documentation site
  examples/             Runnable examples
packages/
  webview/              @webviewjs/webview package
  create-webview/       Official WebviewJS project scaffolder
```

## Contributing

Issues and pull requests are welcome. For bugs or feature requests, [open an issue](https://github.com/webviewjs/webview/issues); before contributing code, review the repository guidance in [`AGENTS.md`](./AGENTS.md).

## License

MIT. See [`LICENSE`](./LICENSE).
