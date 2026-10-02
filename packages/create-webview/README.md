# create-webview

Create a WebviewJS desktop application.

```sh
npm create webview@latest
```

Or start with a named project:

```sh
npm create webview@latest my-app
```

The alternate command is also available:

```sh
npm create webview-app@latest
```

`create-webview-app` is an npm alias/mirror of `create-webview`. Both commands
invoke the same scaffolder and offer the same templates and options.

## Options

```text
create-webview [project-directory]
  --template <typescript|javascript>
  --package-manager <npm|bun|pnpm|yarn>
  --no-install
  --yes
  --force
```

The default template is TypeScript. The package manager is detected from the
invoking tool when possible, with npm as the fallback. `--force` replaces only
generated files that already exist in the selected project directory.

For example, create a JavaScript project without installing dependencies:

```sh
npm create webview my-app -- --template javascript --no-install --yes
```

The generated project contains:

```text
my-app/
├── package.json
├── README.md
├── .gitignore
└── src/
    ├── main.ts (or main.js)
    └── index.html
```

See the [WebviewJS documentation](https://webview.js.org) and the
[GitHub repository](https://github.com/webviewjs/webview) for API and platform
details.
