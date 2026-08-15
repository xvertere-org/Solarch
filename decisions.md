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

---

## [2026-08-15] Dynamic Package Discovery Script (`discover-packages.js`)
**Decision:** Implemented `.github/scripts/discover-packages.js` to inspect the root package and all `packages/*` subdirectories, categorize each by its `solarchCi.type` (`generic`/`backend` vs `sdk`), and emit JSON matrix outputs (`generic`, `sdk`) to `$GITHUB_OUTPUT`.
**Why:** Replaces rigid monolithic CI runs with dynamic matrix fan-out so new SDKs and packages are screened automatically upon addition without modifying CI orchestrators.
**Plan reference:** Section 2 & Section 9 (Week 2, Task 1).

---

## [2026-08-15] Reusable 3-Layer Generic Package Screening Workflow (`_package-screen.yml`)
**Decision:** Created `.github/workflows/_package-screen.yml` implementing the 3-layer screening model (Function -> Build -> Service/Test + Security Audit) with multi-node matrix testing (Node 20.x/22.x) and artifact uploads for the backend.
**Why:** Standardizes quality checks for backend and utility packages while preserving root's build artifact and test coverage retention behavior.
**Plan reference:** Section 1 & Section 9 (Week 2, Task 2).

---

## [2026-08-15] Reusable 5-Layer SDK Screening Workflow (`_sdk-screen.yml`)
**Decision:** Created `.github/workflows/_sdk-screen.yml` establishing the 5-layer quality pyramid (Function -> Feature -> Contract -> Service/E2E -> Distribution) specifically tailored for client SDKs.
**Why:** Client SDKs require distinct boundary enforcement, multi-transport feature validation, contract stability checks, and dual-format distribution verification that exceed standard 3-layer backend pipelines.
**Plan reference:** Section 2 & Section 9 (Week 3, Task 1).

---

## [2026-08-15] Static Platform Dependency Boundary Audit Gate (`test:platform`)
**Decision:** Created `packages/core-client/scripts/check-platform-boundary.cjs` and registered `npm run test:platform` to statically scan SDK source trees for forbidden imports (`fs`, `path`, `crypto`, `child_process`, `http`, `https`, `react`, `react-native`, `electron`, `@tauri-apps/*`).
**Why:** Prevents developers from accidentally introducing platform-specific or runtime-bound APIs into universal/core client code, enforcing dependency injection architecture at commit time.
**Plan reference:** Section 3 & Section 9 (Week 3, Task 2).

---

## [2026-08-15] Dedicated Realtime Feature Test Suite (`test:realtime`)
**Decision:** Created `packages/core-client/tests/realtime/realtime.test.ts` and registered `npm run test:realtime` to verify WebSocket handshake, auth token propagation, subscription/unsubscription lifecycle, minimal mutation payloads, malformed frame resilience, heartbeat ping/pong, and reconnect subscription recovery.
**Why:** Multi-transport realtime logic is highly vulnerable to subtle regression; isolating it into an explicit feature test step provides immediate visibility in CI summaries.
**Plan reference:** Section 4 & Section 9 (Week 3, Task 3).

---

## [2026-08-15] Distribution Output Shape & Packaging Gate (`test:package-shape`)
**Decision:** Created `packages/core-client/scripts/check-package-shape.cjs` and registered `npm run test:package-shape` to verify that ESM (`dist/index.js`), CJS (`dist/index.cjs`), and TypeScript declarations (`dist/index.d.ts`) exist, are non-empty, and resolve according to `package.json` export definitions.
**Why:** Catches bundle corruption or broken package entrypoints before distribution or publishing.
**Plan reference:** Section 6 & Section 9 (Week 5).

---

## [2026-08-15] Deferral of Pinned Backend CI Container & API Manifest Diff Gate
**Decision:** DEFERRED — Week 4 Contract Layer pinned backend CI service container (`backend:start:ci`) and automated API manifest diff checking (`api:manifest:check`) are explicitly deferred to the next session.
**Why:** Standing up a live pinned backend service container requires building a stable frozen server container/binary harness. Rather than shipping a fake or rushed stub that creates false confidence, this gap is documented and scheduled for proper implementation when the backend container harness is stood up.
**Plan reference:** Section 5 & Section 9 (Week 4).
