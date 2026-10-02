# WebviewJS repository instructions

## What this project is

A native Node.js (NAPI-RS) binding to [wry](https://github.com/tauri-apps/wry) and [tao](https://github.com/tauri-apps/tao) that lets JavaScript/TypeScript create native desktop windows with embedded webviews. Works with Node.js, Deno, and Bun.

## Repo layout

```text
apps/docs/             Static Next.js + Fumadocs site for webview.js.org
  app/                 App Router routes and layouts
  content/docs/        Markdown/MDX documentation source
  public/CNAME          GitHub Pages custom domain
  out/                 Static export output (generated)
apps/examples/          Runnable TypeScript examples and their assets
packages/webview/       Published @webviewjs/webview package
  src/                  Rust NAPI-RS bindings
  lib/                  Handwritten TypeScript public API layer
  cli/                  Shipped ESM webview/webviewjs CLI
  scripts/              Build helpers
  __test__/             Bun test suites, fakes, static checks, and type fixtures
  npm/                  Per-platform NAPI packages
  js-bindings.js        Generated and tracked NAPI-RS bindings
  js-bindings.d.ts      Generated and tracked NAPI-RS declarations
packages/create-webview/ Official WebviewJS project scaffolder
.cargo/                 Root Cargo configuration
.github/workflows/      Native CI, repository checks, and Pages deployment
.husky/                 Root Git hooks
assets/                 Repository-level project assets
skills/                 WebviewJS skill content
```

## Tech stack

| Layer           | Tool                       |
| --------------- | -------------------------- |
| Monorepo        | Bun workspaces + Turborepo |
| Rust bindings   | NAPI-RS (`@napi-rs/cli`)   |
| Package manager | Bun 1.4.2                  |
| JS test harness | Bun 1.4.2 (`bun:test`)     |
| Linter          | Root Oxlint                |
| Formatter       | Root Prettier              |
| Rust formatter  | `cargo fmt`                |

## Common commands

Run these from the repository root:

```bash
bun install
bun run dev
bun run build
bun run test
bun run lint
bun run lint:fix
bun run format
bun run format:check
bun run check
bun run clippy
```

To build the published package directly:

```bash
bun --filter @webviewjs/webview build
```

Run an example after building the package with `bun apps/examples/simple.ts`. To work on docs, use `bun --filter @webviewjs/docs dev` or `bun --filter @webviewjs/docs build`.

## Key conventions

- Handwritten public library source belongs in `packages/webview/lib/`; TypeScript writes CommonJS and declarations to `packages/webview/dist/`.
- Native NAPI classes remain the public runtime objects. TypeScript explicitly augments them with JS-only lifecycle, event, protocol, and IPC behavior.
- Do not edit `packages/webview/js-bindings.js` or `packages/webview/js-bindings.d.ts`; NAPI-RS generates them from Rust source and both generated files are intentionally tracked.
- `packages/webview/cli/index.mjs` is the permanent plain ESM npm bin shim. The TypeScript CLI implementation lives in `packages/webview/lib/cli/` and builds to `packages/webview/dist/cli/`.
- Tests use Bun's built-in `bun:test` harness and TypeScript files. Use `expect(...)` assertions; do not use `node:test`, `node:assert`, Jest, Vitest, AVA, or `@ts-nocheck`.
- `packages/webview/__test__/runtime/` tests the normal compiled `dist/index.js` API with the shared fake binding registered by `__test__/native/register.ts`. Do not load the real N-API addon, create a GUI, or add special public test classes.
- Extend `packages/webview/__test__/native/bindings.ts` and `harness.ts` when a test needs native behavior. Fakes should record arguments and calls, isolate state per instance, allow deterministic event delivery, enforce lifecycle invariants, and throw for unsupported behavior instead of silently accepting it.
- Put pure internal JavaScript behavior tests in `packages/webview/__test__/internal/`; put runtime boundary tests in `runtime/`; put CLI behavior tests in `cli/`; and keep README/example/declaration inspections in `static/` or TypeScript compile fixtures in `types/`. Do not use source regexes as substitutes for runtime or Rust behavior tests.
- Public type fixtures belong in `packages/webview/__test__/types/`; use valid examples and `@ts-expect-error` for invalid API usage, and run them with `tsc --noEmit`.
- Tests for `packages/create-webview` also use `bun:test`, `expect(...)`, and `.test.ts` files. Keep temporary filesystem cleanup attached to the test lifecycle with Bun's test hooks.
- Use Bun's timer mocks from `bun:test` for timer behavior; do not replace global timer functions by hand.
- Add Rust behavior tests beside the implementation under `#[cfg(test)]`. Keep them independent of a display server or GUI session, and run them with `cargo test --manifest-path packages/webview/Cargo.toml --lib`.
- The root `bun run test` runs package tests and strict example typechecking. `.github/workflows/run-test.yml` runs that suite and the Rust unit tests.
- Examples in `apps/examples/` import `@webviewjs/webview` through the Bun workspace dependency so they use the same package entry point as consumers.
- Documentation lives in `apps/docs/content/docs/`. Its public routes start at the domain root, such as `/getting-started/installation` and `/api/application`.
- Keep repository-level tools in the root package. Application and package dependencies belong to their respective workspaces.

## CLI (`webview build`)

The CLI compiles a user's app into a standalone executable. Node.js is the default runtime; choose Bun or Deno with `--runtime <node|bun|deno>`:

| Runtime | Mechanism                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------- |
| `node`  | Node.js SEA; Node 24 uses `--experimental-sea-config` + pinned Postject; Node 25.5+ can use `--build-sea` |
| `deno`  | Deno 2 `compile --bundle --self-extracting --allow-all`                                                   |
| `bun`   | `bun build --compile`                                                                                     |

The entry file is positional, for example `webview build src/main.ts`. Use `--asset` to embed files or directories; `--resources` remains available for JSON asset maps. Each runtime adapter embeds the matching WebviewJS native addon.

## Docs / GitHub Pages

- The Fumadocs site is in `apps/docs/` and exports to `apps/docs/out/`.
- Documentation source is in `apps/docs/content/docs/`; the section order is controlled by its `meta.json` files.
- The static site includes `apps/docs/public/CNAME` for **webview.js.org**, static Orama search, `/llms.txt`, `/llms-full.txt`, and per-page Markdown.
- To add a guide, create it under `apps/docs/content/docs/guides/` and add it to `apps/docs/content/docs/guides/meta.json`.
- Documentation routes use the domain root, for example `/guides/custom-protocols`.

## Adding a new CLI flag

1. Add or update argument parsing in `packages/webview/lib/cli/args.ts`.
2. Pass the parsed option to the relevant command or runtime implementation under `packages/webview/lib/cli/`.
3. Update runtime-specific behavior in `packages/webview/lib/cli/runtimes/` when needed.
4. Update the options table in `apps/docs/content/docs/guides/building-executables.md`.

`packages/webview/cli/index.mjs` is the small permanent ESM npm-bin bootstrap. Do not put CLI implementation logic there.

## Rust / NAPI notes

- Bindings are declared in `packages/webview/src/`. After editing Rust, build from the Webview package with `bun --filter @webviewjs/webview build` to regenerate `js-bindings.js` / `js-bindings.d.ts` and compile the TypeScript layer.
- The NAPI target list is in `packages/webview/package.json` under `napi.targets`.
- Each target gets its own package under `packages/webview/npm/`.
- The crate manifest is `packages/webview/Cargo.toml`. There is no root Cargo workspace; root Rust commands should pass this manifest explicitly.
- Native build outputs and Cargo's `target/` directory live under `packages/webview/`.
- Native builds are platform-specific and are not cached by Turborepo.
- Publishing the public package must run from `packages/webview/`, never from the private repository root.
- The creator source lives only in `packages/create-webview/`. `create-webview` is the canonical npm package; `create-webview-app` is published by mirroring that exact package during release. There is intentionally no `packages/create-webview-app/` workspace.
