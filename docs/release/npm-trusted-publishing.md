# npm Trusted Publishing & Provenance

Release-security procedure for future publications of `@evidensiq/core` (EVI-REL-0.3).

This document describes the **normal** release path after `@evidensiq/core@0.1.0`. It does not authorize a new package version by itself.

## Goals

- Publish from GitHub Actions only (tag-triggered)
- Authenticate with npm **Trusted Publishing** via OIDC
- Use short-lived workflow credentials — **no long-lived npm publish token**
- Generate **npm provenance** automatically for eligible public releases
- Fail safely on tag/version mismatch or duplicate registry versions
- Route releases through explicit maturity channels so prereleases can never become `latest`

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
| Allowed action | direct `npm publish` (and staged publish capability on the trust relationship) |

Renaming `.github/workflows/publish-npm.yml` **breaks** Trusted Publishing until the npm trusted-publisher configuration is updated.

## Release maturity model

| Release type | Version example | Git tag | npm dist-tag | Intended use |
|--------------|-----------------|---------|--------------|--------------|
| Alpha | `0.2.0-alpha.1` | `v0.2.0-alpha.1` | `alpha` | Experimental public validation |
| Beta | `0.2.0-beta.1` | `v0.2.0-beta.1` | `beta` | Feature-complete / validation |
| RC | `0.2.0-rc.1` | `v0.2.0-rc.1` | `next` | Release candidate |
| Stable | `0.2.0` | `v0.2.0` | `latest` | Production/default |

Supported grammar only:

- `vX.Y.Z`
- `vX.Y.Z-alpha.N`
- `vX.Y.Z-beta.N`
- `vX.Y.Z-rc.N`

Unsupported labels (`preview`, `dev`, bare `-alpha`, build metadata, etc.) **fail before publish**.

### Consumer install examples

```bash
npm install @evidensiq/core@alpha
npm install @evidensiq/core@beta
npm install @evidensiq/core@next
npm install @evidensiq/core
```

The last command resolves the `latest` dist-tag (stable releases only).

### Absolute safety invariant

Prerelease versions **must never** use dist-tag `latest`.

The publish workflow:

1. resolves the channel via `scripts/release-channel.mjs`
2. publishes with an explicit `npm publish --access public --tag <resolved>`
3. re-checks immediately before publish that a version containing `-` cannot have `DIST_TAG=latest`

Do not rely on npm’s default tag behavior.

## Future release procedure

1. Prepare the approved package version in the repository (`package.json` and `package-lock.json` root/`packages[""]` versions must match), including any approved prerelease suffix.
2. Complete Product Owner–authorized governance promotion (feature → `develop` → `main` as required).
3. Ensure `main` is clean and quality gates pass locally/CI.
4. Create and push the annotated matching tag only:

   ```bash
   git tag -a vX.Y.Z -m "EvidensIQ @evidensiq/core vX.Y.Z"
   # or: vX.Y.Z-alpha.N / vX.Y.Z-beta.N / vX.Y.Z-rc.N
   git push origin <that-tag>
   ```

5. GitHub Actions workflow **Publish npm Package** (`.github/workflows/publish-npm.yml`) runs on `ubuntu-latest`:
   - installs dependencies with `npm ci`
   - runs format, lint, typecheck, `tsc --noEmit`, tests, build, pack, Northstar, and `npm audit`
   - validates the release-channel resolver (`npm run release:channel:self-test`)
   - verifies tag version equals `package.json` / lockfile version
   - resolves the npm dist-tag from the maturity model
   - refuses publish if that exact version already exists on the registry
   - publishes with `npm publish --access public --tag <channel>` using OIDC Trusted Publishing
6. npm generates provenance automatically for this Trusted Publishing path on the public repository.
7. Verify the registry and a fresh consumer install for the intended channel.
8. Create or confirm the GitHub Release for the tag as governed.

## Explicit non-goals for the publish workflow

- No `NPM_TOKEN` / `NODE_AUTH_TOKEN` for publication
- No manual local `npm publish` as the normal release path
- No version bump inside CI
- No publish on ordinary `main`/`develop` pushes or pull requests
- No automatic overwrite of existing registry versions
- No silent promotion of prereleases to `latest`
- No manual `npm dist-tag add/rm` unless separately authorized

## Distinguishing 0.1.0

`@evidensiq/core@0.1.0` was the first public release and was published **manually** (local CLI). That environment could not attach automatic provenance (`provider: null`). **0.1.0 is not republished.**

Future authorized releases after EVI-REL-0.3 closure are expected to use:

**GitHub Actions → OIDC → npm Trusted Publishing → automatic provenance**

## Local channel validation (no publish)

```bash
npm run release:channel:self-test
node scripts/release-channel.mjs resolve v0.2.0-alpha.1
```

Do not create real release tags solely to exercise the pipeline.

## Operator checklist

Before pushing a release tag:

- [ ] Product Owner authorized the exact version and maturity channel
- [ ] `package.json` version = intended release version (stable or prerelease)
- [ ] `package-lock.json` versions match
- [ ] Release commit is on the authorized branch topology
- [ ] Tag matches exactly (`v` + package version)
- [ ] Channel mapping is understood (`alpha` / `beta` / `next` / `latest`)
- [ ] Workflow filename remains `publish-npm.yml`
- [ ] npm Trusted Publisher still targets `publish-npm.yml` for this repository

## References

- Workflow: [`.github/workflows/publish-npm.yml`](../../.github/workflows/publish-npm.yml)
- Channel resolver: [`scripts/release-channel.mjs`](../../scripts/release-channel.mjs)
- npm Trusted Publishers: https://docs.npmjs.com/trusted-publishers/
