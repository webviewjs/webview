# Releasing v0

## Workflows and npm trusted publishing

`Validation.yml` runs push and pull request checks. `Build.yml` is the reusable
native build workflow. `CI.yml` is the manual release workflow; it was renamed
from `Release.yml` to keep the workflow file name configured for npm trusted
publishing. Keep the file at `.github/workflows/CI.yml` and do not rename it
without updating the npm trusted publisher configuration.

Configure npm trusted publishing for the root package and all twelve platform
packages with GitHub Actions, repository `webviewjs/webview`, workflow
`CI.yml`, and environment `npm-release`. The publish job requests
`id-token: write` and uses npm provenance. A `NODE_AUTH_TOKEN` secret is not
required; the release script intentionally does not require one.

Create the GitHub environment `npm-release` in repository Settings →
Environments. Allow only the `v0` branch, do not allow tags, and apply any
required-reviewer policy you want for publication. The build and validation jobs
receive no publishing credentials.

## Dispatching a release

`CI.yml` accepts only `workflow_dispatch` on branch `v0`. Set `version` to the
exact 0.x SemVer version already present in the root `package.json`, select the
npm dist-tag, and choose `resume`:

- `resume: false` is the normal release path. It rejects any package version
  already present on npm, validates all twelve native artifacts, prepares the
  NAPI platform packages, publishes each platform package, verifies it, and
  publishes the root package last.
- `resume: true` is for recovery after a partial publish. It scans all twelve
  platform packages and the root package. Before publishing anything, it
  verifies npm's registry signatures and provenance for each existing version.
  The provenance must match the registry's package integrity and identify the
  trusted `v0` workflow at `.github/workflows/CI.yml`. It also checks package
  identity, version, platform metadata, root optional dependencies, and the
  requested dist-tag. Existing immutable packages are reused; missing platform
  packages are published individually, and a missing root package is published
  only after all platform packages are verified.

Both paths assemble packages with `napi artifacts` and use napi-rs `prePublish`
for package version synchronization and root `optionalDependencies` generation.
`prePublish` is told to skip its bulk platform publish; the release script uses
individual `npm publish` calls with the requested tag and provenance so resume
never attempts to overwrite an existing immutable version. Resume state scans
treat a 404 as a missing version; post-publish version and dist-tag checks use
bounded exponential retries for eventual consistency, rate limits, and
temporary server errors. Existing packages are checked with `npm audit
signatures`; resume does not compare rebuilt native binaries or download prior
workflow artifacts. If an existing package's signature, provenance, registry
integrity, metadata, or requested tag cannot be verified, resume aborts before
publishing anything.

A normal manual dispatch can be started from the Actions UI after selecting
branch `v0`, or with:

```sh
gh workflow run CI.yml --ref v0 -f version=0.4.8 -f npm_tag=latest -f resume=false
```

To recover the partial `0.4.8` release, dispatch the same workflow with
`resume=true`:

```sh
gh workflow run CI.yml --ref v0 -f version=0.4.8 -f npm_tag=latest -f resume=true
```

Do not unpublish or reuse a version to recover a release.

The workflow serializes releases with the shared `npm-release` concurrency
group and never cancels an active run. It rebuilds the native artifacts for
each dispatch and does not bump or commit package versions.

## Local checks without publishing

```sh
actionlint .github/workflows/CI.yml .github/workflows/Build.yml .github/workflows/Validation.yml
node --test .github/scripts/release.test.mjs
```

The release tests mock registry responses and the npm publish executable. They
never publish to npm. Do not use `npm publish --dry-run` to test this flow:
NAPI lifecycle scripts can publish platform packages.
