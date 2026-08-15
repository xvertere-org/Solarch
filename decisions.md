# Architecture & CI/CD Decision Log (`decisions.md`)

This log tracks all architectural and implementation decisions made during the CI/CD rollout.

---

## [2026-08-15] Package Type Metadata Convention via `solarchCi`
**Decision:** Added `"solarchCi": { "type": "backend", "workspace": "root" }` to root `package.json` and `"solarchCi": { "type": "sdk", "workspace": "@solarch/core-client" }` to `packages/core-client/package.json`.
**Why:** Establishing explicit package type metadata directly within each package's `package.json` enables dynamic package discovery in CI without hardcoding folder structures or guessing screening depth.
**Plan reference:** Section 2 & Section 9 (Week 1, Task 1).

---

## [2026-08-15] CodeQL Security Alert Upload Activation
**Decision:** Changed `upload: false` to `upload: true` in `.github/workflows/codeql.yml`.
**Why:** CodeQL static analysis findings must be uploaded to GitHub Security Advisories to ensure automated vulnerability visibility and compliance enforcement.
**Plan reference:** Section 8 & Section 9 (Week 1, Task 2).

---

## [2026-08-15] Secret Scanning Workflow with Gitleaks
**Decision:** Created `.github/workflows/secret-scan.yml` running `gitleaks/gitleaks-action@v2` on every `push` and `pull_request`.
**Why:** Prevents accidental leakage of API keys, tokens, or credentials into the git history before code merges into main branches.
**Plan reference:** Section 8 & Section 9 (Week 1, Task 3).

---

## [2026-08-15] Pre-Publish Sanity Check Gate in Release Workflow
**Decision:** Added a `pre-publish-check` job in `.github/workflows/publish.yml` that builds the repository, runs `npm pack --dry-run`, and verifies that all `package.json` entrypoint targets (`main`, `types`, `bin`, `exports`) resolve to real built files on disk before permitting `npm publish` or GitHub Packages release.
**Why:** Prevents shipping broken packages with missing compiled artifacts, unbuilt TypeScript files, or dangling file references.
**Plan reference:** Section 8 & Section 9 (Week 1, Task 4).
