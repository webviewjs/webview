---
title: 'Create a project'
description: 'Scaffold a Node.js WebviewJS application and inspect the generated files and options.'
---

The project creator generates a small Node.js application with an HTML page and a `webview build` script.

```sh
npm create webview@latest my-app
cd my-app
npm run dev
```

The alternate command `npm create webview-app@latest` invokes the same creator. The canonical package name is `create-webview`.

## Options

```text
create-webview [project-directory]
  --template <typescript|javascript>
  --package-manager <npm|bun|pnpm|yarn>
  --no-install
  --yes, -y
  --force
  --help, -h
  --version, -v
```

| Option                                     | Behavior                                                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--template <typescript\|javascript>`      | Select the starter source language. TypeScript is the default.                                                                                                    |
| `--package-manager <npm\|bun\|pnpm\|yarn>` | Choose which package manager installs dependencies and which commands are printed. The creator detects the invoking manager when possible and otherwise uses npm. |
| `--no-install`                             | Write the project files but skip dependency installation.                                                                                                         |
| `--yes`, `-y`                              | Skip prompts and use defaults. If no directory is supplied, use `webview-app`.                                                                                    |
| `--force`                                  | Replace only conflicting files that the creator would generate. It does not clear the directory.                                                                  |
| `--help`, `-h`                             | Print usage.                                                                                                                                                      |
| `--version`, `-v`                          | Print the creator version.                                                                                                                                        |

For example, generate JavaScript files and install with Bun:

```sh
npm create webview@latest my-app -- --template javascript --package-manager bun --yes
```

Skip installation if you want to review the files first:

```sh
npm create webview@latest my-app -- --no-install --yes
cd my-app
npm install
npm run dev
```

The creator refuses to overwrite generated files unless you confirm interactively or pass `--force`. It preserves unrelated files in a non-empty directory.

## Generated project

The TypeScript template contains:

```text
my-app/
├── package.json
├── README.md
├── .gitignore
└── src/
    ├── main.ts
    └── index.html
```

`npm run dev` runs `node src/main.ts`. `npm run build` invokes `webview build` and embeds `src/index.html` into the standalone executable. The generated `package.json` requires Node.js 24 or newer.

The JavaScript template has the same structure with `src/main.js`. Both templates target Node.js. To use Bun or Deno as the application runtime, install the package for that runtime and use the corresponding import form described in [Installation](./installation); the creator does not generate Bun- or Deno-specific scripts.

See [Loading application content](../guides/loading-content) to choose between inline HTML, a remote URL, and local assets, and [Building standalone executables](../guides/building-executables) for CLI behavior.
