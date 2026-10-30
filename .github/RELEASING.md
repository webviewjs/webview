# npm releases

`CI` runs on code pushes and pull requests targeting `main` and `v[0-9]`.
It calls the local `Build.yml`: the native matrix, FreeBSD smoke test, headless
suite, release-script tests, Rust tests, and locked Cargo metadata validation.
It has read-only permissions and no publishing or npm credentials.

Run **Release CI** manually in Actions, select **main**, and enter `version`,
`npm_tag`, and `resume` (default `false`). Main accepts exact `1.x` versions,
rejects build metadata because npm strips it, and reserves `v0` for the
independent v0 branch. The workflow stamps the requested version into the
monorepo packages in its temporary checkout. `latest` requires a stable version;
`rc` and `beta` require the matching prerelease identifier; `next` accepts stable
and prerelease v1 versions.
The default branch exposes the same workflow name and input names as v0;
selecting v0 runs v0's own workflows and scripts.

The repository-wide `npm-release` concurrency group serializes both branches.
The publishing job uses npm Trusted Publishing through GitHub Actions OIDC; it
does not need `NPM_TOKEN` or npm registry authentication configuration. Keep the
**npm-release** GitHub environment and `id-token: write` permission. The workflow
pins npm CLI 11.21.0, which supports OIDC publishing with dist-tags.

Configure a GitHub Actions Trusted Publisher separately on every package below
at npmjs.com. Use organization/user `webviewjs`, repository `webview`, workflow
filename `CI.yml`, and environment `npm-release`; allow `npm publish`. The trust
settings are package-specific and cannot be created in repository code. The
release runs `npm publish --tag <tag>` directly and does not call `npm dist-tag`.

- `@webviewjs/webview`
- `@webviewjs/webview-android-arm-eabi`
- `@webviewjs/webview-android-arm64`
- `@webviewjs/webview-darwin-arm64`
- `@webviewjs/webview-darwin-x64`
- `@webviewjs/webview-freebsd-x64`
- `@webviewjs/webview-linux-arm-gnueabihf`
- `@webviewjs/webview-linux-arm64-gnu`
- `@webviewjs/webview-linux-ia32-gnu`
- `@webviewjs/webview-linux-x64-gnu`
- `@webviewjs/webview-win32-arm64-msvc`
- `@webviewjs/webview-win32-ia32-msvc`
- `@webviewjs/webview-win32-x64-msvc`
- `create-webview`
- `create-webview-app`

The shared `npm-release` GitHub environment must allow both `main` and `v0` if
branch deployment rules are enabled; environment protection and approvals are
otherwise repository policy.

The registry plan covers all 15 packages: 12 native packages, `@webviewjs/webview`,
`create-webview`, and `create-webview-app`. Main scans before the native build
and again in the publish job before npm writes. Lookups run concurrently and retry
network errors, timeouts, HTTP 429, and HTTP 5xx responses with bounded
exponential backoff. They honor `Retry-After`, fail immediately on permanent
errors or unexpected metadata, and treat HTTP 404 as absent. If an exact-version
lookup returns 404, a dist-tag lookup also checks whether npm already points any
tag at that exact version.

With `resume=false`, any existing exact package version blocks the release
before publishing. With `resume=true`, the workflow records and logs which
packages already exist and which are missing, then publishes only confirmed
missing versions. It never overwrites an npm version. This supports recovery if
only some native packages, the primary package, or either creator package made
it to npm. If all 15 already exist, the publish job completes without npm writes.
To recover the current `1.0.0-rc.3` partial release, dispatch that same version
with `npm_tag=rc` and `resume=true`.

Version changes are temporary in each job's checkout: primary and creator
manifests are updated directly, then `bun run version` synchronizes the native
package manifests. No changes are committed or pushed.

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

NAPI synchronizes platform manifests and optional dependencies with
`skipOptionalPublish: true`; npm writes are then issued individually with the
requested tag, public access, `--ignore-scripts`, and provenance. Native packages
publish first, followed by `@webviewjs/webview`, then the two creator packages.
The existing staging and tarball inspection remains in place. A successful
`npm publish` command is the completion signal; the workflow does not fail while
waiting for post-publish registry visibility.

After npm publication completes, a separate job creates the `v<version>` GitHub
Release and attaches the 12 native `.node` artifacts from the build. It targets
the dispatched commit, marks prereleases, and checks that an existing Git tag is
in the dispatched commit's main history. If the release already exists, it
uploads only missing asset names and leaves existing assets untouched. Only this
job has `contents: write`; the npm publishing job retains `contents: read` and
`id-token: write`.

If npm publishing fails partway through, inspect the logged package state and
rerun the same version and tag with `resume=true`. If GitHub Release creation or
asset upload fails, rerun with `resume=true`; npm will skip confirmed packages
and the GitHub Release job will add only missing assets. Never assume a failed
run published nothing.

Local guard/packaging tests (no real publishing):

```sh
bun test ./.github/scripts/release.test.ts
```

The `prepare` command performs only artifact assembly, build, staging, packing,
and npm dry runs. It expects a disposable checkout with installed dependencies,
release versions already assigned, all downloaded artifacts, and the release
environment variables. The `publish` command is the only npm package write path.
