# Releasing v0

CI runs on pushes and pull requests targeting `main` and `v[0-9]` (a GitHub
Actions glob for single-digit major branches). Existing documentation-only path
exclusions still apply. `CI.yml` calls `Build.yml`, which owns all twelve native
targets, artifact uploads, and the checks previously in `lint.yml`. It has only
`contents: read`, accepts no secrets, and does not publish.

`Release.yml` accepts only `workflow_dispatch`. Its `version` and `npm_tag`
inputs are the interface to retain when implementing releases on `main` later.
This branch accepts only `v0` and exact `0.x` SemVer versions matching the root
`package.json`. Prereleases cannot use `latest`. Change the version in the
repository before dispatching; the workflow does not bump or commit versions.

## GitHub configuration

1. Create an environment named **npm-release** in repository Settings →
   Environments. Select **Selected branches and tags**, allow only the **branch**
   `v0`, and do not allow tags. Add required reviewers and prevent self-review
   if your release policy requires approval. Disable protection bypass where
   supported. Widen the branch policy only when `main` gains its own validated
   release workflow.
2. Store the existing npm publishing token as the environment secret
   **NPM_TOKEN**, with publishing access to `@webviewjs/webview` and all twelve
   platform packages. Remove any repository/organization-wide copy accessible
   to build jobs. The token is exposed only to the publish step; keep its
   current npm authentication/2FA policy suitable for CI publishing.
3. Permit `id-token: write` for the publishing job. npm provenance uses this
   permission; other jobs have only `contents: read`. The existing npm token
   authentication remains in use, without switching to trusted publishing.
4. Normal manual dispatch requires `Release.yml` to exist on the default
   branch. This v0-only change does **not** add it to `main`; the normal Actions
   UI trigger remains unavailable until the corresponding default-branch work
   is done. Once available, choose **v0** in GitHub's built-in branch selector
   (or use `gh workflow run Release.yml --ref v0 -f version=0.4.8 -f npm_tag=v0`).
   The local reusable workflow is resolved from the selected workflow commit,
   so v0 uses its own build and release scripts, not main's build system.

## Execution and failure handling

The validation job checks branch/version/tag and checks all thirteen package
versions against the public npm registry before any native builds. Registry
errors fail closed. Both callers use the same native build jobs; no secrets
are passed to `Build.yml`.

After all builds and validation succeed, the protected publish job downloads
only this run's `bindings-*` artifacts, requires a nonempty binary for every
configured target, runs `napi artifacts`, and checks every assembled package.
NAPI prepublish synchronizes the platform versions and exact root optional
dependencies and publishes the platform packages with the requested tag and
provenance. GitHub release creation is explicitly disabled. The root package
is published last with `--ignore-scripts` to avoid rerunning `prepublishOnly`.
Registry checks verify every published version and dist-tag.

All release runs share the repository-wide `npm-release` concurrency group and
never cancel a running release. Keep that same group in the future main
workflow. GitHub concurrency retains at most one pending run, so a newer
dispatch can replace a pending run; an active publish continues.

Failures before publishing can be rerun using the same workflow run and commit
(artifacts are retained for seven days). No version is overwritten: any
already-published root **or platform** version causes a clear failure. npm
publishing is not atomic across thirteen packages. If publishing partially
succeeds, inspect the logs and npm state, then prepare a new patch/prerelease
version for a new dispatch. A retry will deliberately refuse to republish the
partial version. A registry verification failure may also mean publishing
succeeded but registry visibility lagged; inspect npm before choosing a new
version. Do not unpublish/reuse versions or blindly rerun npm commands.

## Local checks (no npm publication)

```sh
actionlint .github/workflows/CI.yml .github/workflows/Build.yml .github/workflows/Release.yml
node --test .github/scripts/release.test.mjs
```

The tests exercise validation and the installed NAPI prepublish implementation
in a temporary directory with a fake npm executable and fake registry. They
verify all thirteen versions, tags, provenance settings, missing-artifact
failures, and refusal to republish. Never test this flow with `npm publish
--dry-run`: lifecycle scripts can still publish platform packages.
