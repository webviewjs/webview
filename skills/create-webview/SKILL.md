---
name: create-webview
description: Create a minimal WebviewJS desktop application from an official repository-hosted example.
---

# Create a WebviewJS project

Use this skill when starting a new WebviewJS application with the official
scaffolder. For API work beyond the starter, use the WebviewJS skill and the
hosted [documentation](https://webview.js.org).

## Use the official scaffolder

The canonical npm package is `create-webview`:

```sh
npm create webview@latest
npm create webview@latest my-app
```

`create-webview-app` is an npm alias published from the exact same package.
Both names run the same CLI and offer the same examples.

The default example is `basic-ts`; `basic-js` provides a JavaScript version.
Examples do not add a frontend framework or development server. The basic app
opens local `src/index.html` in a native `BrowserWindow` using `Application`.
You can also select a public GitHub repository or a directory URL from GitHub.

Useful non-interactive forms:

```sh
npm create webview my-app -- --example basic-ts --yes
npm create webview-app my-app -- --example basic-js --no-install --yes
npm create webview my-app -- --example https://github.com/owner/repository/tree/main/path/to/example
```

The deprecated `--template typescript` and `--template javascript` options
remain aliases for `basic-ts` and `basic-js`.

The CLI detects npm, Bun, pnpm, or Yarn from `npm_config_user_agent`; use
`--package-manager <npm|bun|pnpm|yarn>` to override it. `--no-install` skips
dependency installation. Without a directory argument, an interactive run
asks for a project name; non-interactive runs require a directory unless
`--yes` selects the default `webview-app` name.

The scaffolder accepts missing or empty target directories. It asks before
writing into a non-empty directory when interactive, and requires `--force`
in non-interactive mode. `--force` replaces only colliding generated files
and preserves unrelated files. Choose a dedicated project directory; do not
target a filesystem root, your home directory, or an existing project's root.

The basic examples require Node.js 24 or newer. Their `dev` and
`start` scripts run the source directly; `build` uses the installed `webview`
CLI to create a standalone executable and includes `src/index.html` as an
asset. Host-specific native prerequisites still apply; use the
[installation guide](https://webview.js.org/getting-started/installation).

The basic examples contain `package.json`, `README.md`, `.gitignore`,
`src/index.html`, and either `src/main.ts` or `src/main.js`. The creator sets
the project npm package name in `package.json` and preserves the example's
dependency versions.
