# npm releases

`CI` runs on code pushes and pull requests targeting `main` and `v[0-9]`.
It calls the local `Build.yml`: the native matrix, FreeBSD smoke test, headless
suite, release-script tests, Rust tests, and locked Cargo metadata validation.
It has read-only permissions and no publishing or npm credentials.

Run **Release** manually in Actions, select **main**, and enter `version` and
`npm_tag` (default `next`). Main accepts exact `1.x` versions, rejects build
metadata because npm strips it, and reserves `v0` for the independent v0 branch.
`latest` requires a stable version; `rc` and `beta` require the matching
prerelease identifier; `next` accepts stable and prerelease v1 versions.
The default branch exposes the same workflow name and input names as v0;
selecting v0 runs v0's own workflows and scripts.

The repository-wide `npm-release` concurrency group serializes both branches.
Configure the **npm-release** GitHub environment and retain **NPM_TOKEN** with
publish access to `@webviewjs/webview`, its platform packages, `create-webview`,
and `create-webview-app`. The token may be an environment or repository secret.
Only the publishing step receives it. Environment protection/approvals are
optional repository policy. The publishing job needs `id-token: write` for npm
provenance; no trusted-publishing migration or GitHub write permission is needed.

Release validation checks every package version against npm before native builds
and again immediately before publishing. Only HTTP 404 means absent; auth,
network, rate-limit, and registry errors fail the run. Existing versions cause a
hard failure, even if only one package exists. Version changes are temporary in
each job's checkout: primary and creator manifests are updated directly, then
`bun run version` synchronizes the native package manifests. No changes are
committed or pushed.

The publishing job downloads `bindings-*` into `packages/webview/artifacts`,
requires every configured target, runs `bun run artifacts`, and verifies every
assembled binary. It builds the TypeScript library and creator CLI, then uses
NAPI prepublish with `skipOptionalPublish` to prepare exact optional dependencies
without npm writes. It validates versions and manifests, packs the workspace
package with `bun pm pack --ignore-scripts --quiet`, and uses Bun's returned
filename. Tarball manifests must contain registry semver dependency ranges,
with no unresolved `workspace:` or `catalog:` references.

Both creator packages retain the existing staging model: copy `dist`, README,
LICENSE, and the manifest outside the workspace, retain both CLI aliases, assign
the requested version, and rename the mirror to `create-webview-app`. npm packs
these normalized stages. Every tarball is inspected and npm dry-run validated
before any package is published.

NAPI still owns native platform publishing through its npm client, inheriting
`npm_config_tag`, `npm_config_provenance=true`, public access, and
`npm_config_ignore_scripts=true`. GitHub release side effects are disabled.
Platform versions and dist-tags are verified before publishing the primary and
creator tarballs with `npm publish --ignore-scripts --provenance --access public
--tag <tag>`. Scripts never publish the private monorepo root or execute the
native build/prepublish lifecycle a second time. Registry propagation checks
retry reads, never writes.

If publishing fails, the run fails with an explicit partial-release warning.
Inspect npm versions and dist-tags for every planned package and recover manually
under the same environment controls, or choose a new version. A rerun never
silently skips previously published packages; npm versions cannot be overwritten.
Do not assume a failed run published nothing.

Local guard/packaging tests (no real publishing):

```sh
bun test ./.github/scripts/release.test.ts
```

The `prepare` command performs only artifact assembly, build, staging, packing,
and npm dry runs. It expects a disposable checkout with installed dependencies,
release versions already assigned, all downloaded artifacts, and the release
environment variables. The separate `publish` command is the only write path.
