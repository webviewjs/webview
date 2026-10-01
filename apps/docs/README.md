# WebviewJS documentation

The static Fumadocs site is built from `content/docs` and exports to `out/`.

From the repository root, run:

```bash
bun install
bun --filter @webviewjs/docs dev
bun --filter @webviewjs/docs build
```

The app uses Fumadocs' generated static search index, `llms.txt`,
`llms-full.txt`, and processed per-page Markdown routes. Its build also copies
those Markdown pages to convenient `/<page>.md` files in the static export.
