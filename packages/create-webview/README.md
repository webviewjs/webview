# create-webview

Create a WebviewJS desktop application from a repository-hosted starter example.

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
invoke the same scaffolder and offer the same examples and options.

## Examples

The default example is `basic-ts`. Choose the JavaScript starter with:

```sh
npm create webview@latest my-app -- --example basic-js
```

Named examples are downloaded from `webviewjs/webview/examples/<name>` on the
`main` branch. You can also pass a GitHub repository URL or a directory URL such
as `https://github.com/owner/repository/tree/main/path/to/example`. New starter
directories under the repository's top-level `examples/` directory are
available to users without publishing a new `create-webview` version.

The selected example's files and dependency versions are preserved. The creator
sets the npm package name in its `package.json` to match the requested project
directory; it does not rewrite names in source files.

## Options

```text
create-webview [project-directory]
  --example <name|GitHub URL>
  --template <typescript|javascript>  (deprecated alias)
  --package-manager <npm|bun|pnpm|yarn>
  --no-install
  --yes
  --force
```

The package manager is detected from the invoking tool when possible, with npm
as the fallback. `--force` replaces only files provided by the selected example
that already exist in the project directory.

`--template typescript` remains an alias for `--example basic-ts`, and
`--template javascript` remains an alias for `--example basic-js`:

```sh
npm create webview my-app -- --template javascript --no-install --yes
```

See the [WebviewJS documentation](https://webview.js.org) and the
[GitHub repository](https://github.com/webviewjs/webview) for API and platform
details.
