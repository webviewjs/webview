---
name: create-webview
description: Create a minimal WebviewJS desktop application with the official scaffolder and work with its TypeScript or JavaScript starter.
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
Both names run the same CLI and generate the same project.

The starter has two templates: TypeScript (the default) and JavaScript. It
does not add a frontend framework or development server. The app opens local
`src/index.html` in a native `BrowserWindow` using `Application`.

Useful non-interactive forms:

```sh
npm create webview my-app -- --template typescript --yes
npm create webview-app my-app -- --template javascript --no-install --yes
```

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

Generated projects require Node.js 24 or newer. The generated `dev` and
`start` scripts run the source directly; `build` uses the installed `webview`
CLI to create a standalone executable and includes `src/index.html` as an
asset. Host-specific native prerequisites still apply; use the
[installation guide](https://webview.js.org/getting-started/installation).

The generated project contains `package.json`, `README.md`, `.gitignore`,
`src/index.html`, and either `src/main.ts` or `src/main.js`. Its manifest pins
`@webviewjs/webview` to the matching creator release. Keep that exact version
unless the user wants to upgrade WebviewJS deliberately.
