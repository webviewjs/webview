# WebviewJS documentation site

This workspace powers [webview.js.org](https://webview.js.org). The guides and
API reference live in `apps/docs/content/docs`; the custom homepage lives in
`apps/docs/app/(home)`.

From the repository root, run:

```bash
bun install
bun --filter @webviewjs/docs dev
bun --filter @webviewjs/docs build
```

The build exports the static site to `apps/docs/out/`, including search,
`llms.txt`, `llms-full.txt`, and per-page Markdown aliases.
