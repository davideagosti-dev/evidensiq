# npm Trusted Publishing & Provenance

Release-security procedure for future publications of `@evidensiq/core` (EVI-REL-0.3).

This document describes the **normal** release path after `@evidensiq/core@0.1.0`. It does not authorize a new package version by itself.

## Goals

- Publish from GitHub Actions only (tag-triggered)
- Authenticate with npm **Trusted Publishing** via OIDC
- Use short-lived workflow credentials — **no long-lived npm publish token**
- Generate **npm provenance** automatically for eligible public releases
- Fail safely on tag/version mismatch or duplicate registry versions

## Trust binding (security-sensitive)

npm Trusted Publishing is bound to **exact** values:

| Field | Value |
|-------|--------|
| Package | `@evidensiq/core` |
| Provider | GitHub Actions |
| GitHub owner | `davideagosti-dev` |
| Repository | `evidensiq` |
| Workflow filename | `publish-npm.yml` |
| Environment | *(none)* |
| Allowed action | direct `npm publish` |

Renaming `.github/workflows/publish-npm.yml` **breaks** Trusted Publishing until the npm trusted-publisher configuration is updated.

## Future release procedure

1. Prepare the approved package version in the repository (`package.json` and `package-lock.json` root/`packages[""]` versions must match).
2. Complete Product Owner–authorized governance promotion (feature → `develop` → `main` as required).
3. Ensure `main` is clean and quality gates pass locally/CI.
4. Create and push the annotated matching tag only:

   ```bash
   git tag -a vX.Y.Z -m "EvidensIQ @evidensiq/core vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. GitHub Actions workflow **Publish npm Package** (`.github/workflows/publish-npm.yml`) runs on `ubuntu-latest`:
   - installs dependencies with `npm ci`
   - runs format, lint, typecheck, `tsc --noEmit`, tests, build, pack, Northstar, and `npm audit`
   - verifies tag `vX.Y.Z` equals `package.json` / lockfile version `X.Y.Z`
   - refuses publish if that exact version already exists on the registry
   - publishes with `npm publish --access public` using OIDC Trusted Publishing
6. npm generates provenance automatically for this Trusted Publishing path on the public repository.
7. Verify the registry and a fresh consumer install of `@evidensiq/core@X.Y.Z`.
8. Create or confirm the GitHub Release for `vX.Y.Z` as governed.

## Explicit non-goals for the publish workflow

- No `NPM_TOKEN` / `NODE_AUTH_TOKEN` for publication
- No manual local `npm publish` as the normal release path
- No version bump inside CI
- No publish on ordinary `main`/`develop` pushes or pull requests
- No staged publishing unless separately authorized
- No automatic overwrite of existing registry versions

## Distinguishing 0.1.0

`@evidensiq/core@0.1.0` was the first public release and was published **manually** (local CLI). That environment could not attach automatic provenance (`provider: null`). **0.1.0 is not republished.** Future authorized releases should obtain provenance through this Trusted Publishing workflow.

## Operator checklist

Before pushing a release tag:

- [ ] Product Owner authorized the exact version
- [ ] `package.json` version = intended `X.Y.Z`
- [ ] `package-lock.json` versions match
- [ ] Release commit is on the authorized branch topology
- [ ] Tag will be exactly `vX.Y.Z`
- [ ] Workflow filename remains `publish-npm.yml`
- [ ] npm Trusted Publisher still lists direct publish allowed for this workflow

## References

- Workflow: [`.github/workflows/publish-npm.yml`](../../.github/workflows/publish-npm.yml)
- npm Trusted Publishers: https://docs.npmjs.com/trusted-publishers/
