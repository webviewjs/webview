---
title: 'Create a project'
description: 'Create a Node.js WebviewJS application from a repository-hosted example.'
---

The project creator downloads a starter example, customizes its npm package name, and can install its dependencies.

```sh
npm create webview@latest my-app
cd my-app
npm run dev
```

The alternate command `npm create webview-app@latest` invokes the same creator. The canonical package name is `create-webview`.

## Choose an example

The default example is `basic-ts`. Select the JavaScript starter with:

```sh
npm create webview@latest my-app -- --example basic-js
```

Named examples resolve to `webviewjs/webview/examples/<name>` on the `main` branch. The creator also accepts a GitHub repository URL or a directory URL that points to a repository subdirectory:

```sh
npm create webview@latest my-app -- --example https://github.com/owner/repository/tree/main/path/to/example
```

New starter directories added under the repository's top-level `examples/` directory are available without publishing a new creator version. The selected example's nested files, dotfiles, scripts, and dependency versions are copied. The creator updates the root `package.json` name to match the project directory and converts `workspace:*` dependencies to the `latest` npm tag. When installation is enabled, it passes those dependencies to the selected package manager with an explicit `@latest` specifier; with `--no-install`, a later `npm install` resolves the tag.

## Options

```text
create-webview [project-directory]
  --example <name|GitHub URL>
  --template <typescript|javascript>
  --package-manager <npm|bun|pnpm|yarn>
  --no-install
  --yes, -y
  --force
  --help, -h
  --version, -v
```

| Option                                     | Behavior                                                                                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--example <name\|GitHub URL>`             | Select an example. The default is `basic-ts`. Named examples come from `webviewjs/webview/examples/<name>` on `main`. GitHub repository and `/tree/<branch>/<directory>` URLs are supported. |
| `--template <typescript\|javascript>`      | Deprecated compatibility alias: `typescript` selects `basic-ts`, and `javascript` selects `basic-js`.                                                                                        |
| `--package-manager <npm\|bun\|pnpm\|yarn>` | Choose which package manager installs dependencies and which commands are printed. The creator detects the invoking manager when possible and otherwise uses npm.                            |
| `--no-install`                             | Write the project files but skip dependency installation.                                                                                                                                    |
| `--yes`, `-y`                              | Skip prompts and use defaults. If no directory is supplied, use `webview-app`.                                                                                                               |
| `--force`                                  | Replace only files supplied by the selected example. It does not clear the directory.                                                                                                        |
| `--help`, `-h`                             | Print usage.                                                                                                                                                                                 |
| `--version`, `-v`                          | Print the creator version.                                                                                                                                                                   |

For example, create a JavaScript project and install with Bun:

```sh
npm create webview@latest my-app -- --example basic-js --package-manager bun --yes
```

The compatibility alias remains available:

```sh
npm create webview@latest my-app -- --template javascript --no-install --yes
```

Skip installation if you want to review the files first:

```sh
npm create webview@latest my-app -- --no-install --yes
cd my-app
npm install
npm run dev
```

The creator refuses to overwrite files unless you confirm interactively or pass `--force`. It preserves unrelated files in a non-empty directory.

## Included starter examples

The TypeScript and JavaScript starters contain:

```text
my-app/
├── package.json
├── README.md
├── .gitignore
└── src/
    ├── main.ts (or main.js)
    └── index.html
```

`npm run dev` runs the example's Node.js entry file. `npm run build` invokes `webview build` and embeds `src/index.html` into the standalone executable. The basic examples require Node.js 24 or newer and carry a published `@webviewjs/webview` dependency range; repository workspace dependency versions are not copied into generated projects.

The basic examples target Node.js. To use Bun or Deno as the application runtime, install the package for that runtime and use the corresponding import form described in [Installation](./installation); the basic starters do not generate Bun- or Deno-specific scripts.

See [Loading application content](../guides/loading-content) to choose between inline HTML, a remote URL, and local assets, and [Building standalone executables](../guides/building-executables) for CLI behavior.
