# Changelog

## v0.16.0 — Deprecate Torque & Agent Workflow System (2026-07-14)

### Breaking Changes

- **Removed `torque/` directory** — The Torque visual workflow editor (Next.js app with Clerk auth, reactflow, zustand) has been fully removed from the monorepo. It was a separate product with zero shared code, its own dependency tree, and a leaked Clerk secret key in `.env.local`.
- **Removed `/api/agents/*` endpoints** — All agent/workflow REST API routes have been removed:
  - `GET /api/agents/nodes` — list node types
  - `GET /api/agents/nodes/:type` — get node definition
  - `POST /api/agents/workflows/register` — register workflow
  - `GET /api/agents/workflows` — list workflows
  - `GET /api/agents/workflows/:id` — get workflow
  - `DELETE /api/agents/workflows/:id` — delete workflow
  - `POST /api/agents/workflows/:id/execute` — execute workflow
  - `GET /api/agents/workflows/:id/execute/stream` — SSE execution stream
  - `GET /api/agents/workflows/:id/executions` — execution history
  - `GET /api/agents/executions/:id` — execution detail
- **Removed `src/agent/` module** — `node-registry.ts`, `workflow-engine.ts`, `types.ts` deleted.
- **Removed `_agentWorkflows` and `_agentExecutions` database tables** from schema initialization.

### Net Impact

- −5,141 lines of code
- −34 files removed
- −250KB `package-lock.json` (torque dependencies)
- Eliminates leaked `CLERK_SECRET_KEY` from git history

## v0.15.0 — Critical Regression Fixes + Security Hardening (2026-05-14)

### Regressions Addressed

These four findings were specified as fixes in Round 5 (v0.14.0) but were not applied to the source until this release:

- **C-1:** `passwordHash` was listed as a required `stripProtectedFields` addition in Round 5 but never added to the `protectedFields` array. This was the single highest-risk gap — an attacker sending `{ "passwordHash": "<known_bcrypt_hash>" }` could bypass authentication entirely.
- **C-2:** The `/api/installer` endpoint was flagged as allowing unlimited superuser creation by email enumeration but only the per-email check was documented; the global-superuser-count guard was never written.
- **H-1:** Admin `confirm-password-reset` endpoint was flagged for missing rate limiting but the `adminResetRateLimiter` middleware was never applied to the route.
- **H-2:** Record auth `/refresh` endpoint was flagged for missing rate limiting but the `authRateLimiter` middleware was never applied.

### New Findings

#### High
- **N-1:** Added `parsePagination()` helper (`src/utils/pagination.ts`) enforcing `perPage` cap at 200 and page cap at 10000 across all list endpoints (`record_crud`, `batch`, `logs`). Previously `perPage=999999999` could cause OOM from unbounded SQL `LIMIT`.
- **N-2:** `BaseApp.bootstrap()` now validates JWT secret at startup — throws `FATAL` error if `SOLARCH_JWT_SECRET` is missing or under 32 characters. Previously the server booted but silently failed on auth.

#### Medium
- **N-3:** LLM node output capped at 100KB (both OpenAI and Anthropic paths). Previously an LLM could return megabytes of text causing `_agentExecutions` database bloat.
- **N-4:** Logger now auto-redacts Bearer tokens, 32+ character hex strings, and apiKey/secret/token/password/hash key-value pairs before emitting. Previously sensitive data could leak into `_logs` and `console.error`.
- **N-5:** Email change `/request-email-change` and `/confirm-email-change` endpoints now use opaque one-time tokens (stored in `_passwordResetTokens` table) instead of JWTs. Tokens are hashed before storage, expire after 2 hours, and are revoked on use.

### Verified Clean
- SQL injection: all identifier paths validated, all values parameterized, `findRecordsByRawQuery` throws unconditionally
- XSS: no HTML rendering anywhere in server code
- CSRF: Bearer token auth with CSP headers
- Mass assignment: `stripProtectedFields` now includes `passwordHash` and `emailVisibility`
- Auth: all sensitive endpoints gated by `requireSuperuserAuth` or `requireAuth`
- Rate limiting: enabled by default (60 req/min IP), applied to all auth flows and admin routes
- Error leakage: all errors return `'Internal server error'` to client; logger now sanitizes before emitting
- Crypto: bcrypt, AES-256-CBC with per-encryption salt, timing-safe OTP comparison, `crypto.randomBytes` for all randomness
- SSRF: `isPrivateHostname` blocks private IPs; `ALLOWED_URL_PREFIXES` respected
- Path traversal: `assertPathSafe` + `path.basename` sanitizer on all file paths
- No `Math.random()` — all randomness from `crypto.*`

---

## v0.14.0 — Security Audit Remediation (2026-05-14)

### Critical
- **C-1:** Disabled `findRecordsByRawQuery` unconditionally — raw SQL execution bypassed all access controls
- **C-2:** Removed `require` from JSVM hook sandbox; replaced with narrow whitelisted API (`crypto`, `fetch`, console, `$app` proxy)

### High
- **H-1:** Fixed rate limiter key generator in `record_auth` and `admin_auth` to use compound IP+identity key — prevents identity-cycling brute-force bypass
- **H-2:** Routed batch POST/PATCH sub-requests through `validateAndCreateRecord`/`validateAndUpdateRecord` — closes `passwordHash` and protected-field bypass
- **H-3:** Added URL validation, private IP blocking, and configurable `ALLOWED_URL_PREFIXES` allowlist to agent `http_request` node — closes SSRF vector
- **H-4:** Extended `deepScrub` to cover node output/results in agent execution history; scrub execution details for non-superuser callers; extended secret key patterns

### Medium
- **M-1:** Batch mutations now route through `RecordUpsertForm` pipeline (covered by H-2)
- **M-2:** Replaced unbounded lockout Map with LRU-evictable cache capped at 50K entries with 10-minute sweep interval
- **M-3:** Added `setInterval` cleanup every 30 minutes for expired OTPs, MFAs, password-reset tokens, and OAuth2 states
- **M-4:** Added `MAX_FILTER_LENGTH = 4096` guard in `parseFilter()` and `buildSort()` to prevent CPU-based DoS via oversized expressions
- **M-5:** Added `validateIdentifier()` guards to all public `db.ts` methods (`tableColumns`, `tableInfo`, `tableIndexes`, `deleteTable`, `deleteView`, `saveView`)

### Low
- **L-1:** Index definitions now cross-referenced against collection field names — blocks indexes referencing non-existent columns
- **L-2:** HTTP server drain now awaited with 10s forced-exit fallback — prevents in-flight request drops during shutdown
- **L-3:** `sanitizeFilename` now uses `path.basename()` before character filtering — eliminates path traversal by definition
- **L-4:** Logger instance now cached on first call — eliminates per-call object creation and GC pressure

### Verified Clean
This audit round confirmed the following areas are free of findings: SQL injection (all identifier paths validated, all values parameterized), XSS (no HTML rendering), CSRF (Bearer token auth, Content-Security-Policy), mass assignment (field whitelists on all write paths), auth (all sensitive endpoints gated), rate limiting (enabled by default, compound IP+identity keys on auth endpoints), error leakage (all errors logged server-side only), command injection (zero child_process usage), crypto (bcrypt, AES-256-CBC, per-encryption salt, timing-safe OTP comparison, no Math.random), SSRF (private IP blocking on http_request node), open redirects (OAuth2 redirect validated against appURL origin), path traversal (assertPathSafe + path.basename sanitizer), WebSocket auth (JWT validated on connect), CORS (no wildcard-with-credentials).

## v0.13.1 — Performance & Security Hardening (2026-05-14)

### High
- **H-1:** Converted `LocalBlobDriver` from sync `fs.*` to async `fs/promises` — file uploads, downloads, and deletes no longer block the event loop
- **H-2:** Replaced synchronous `scryptSync` with async `crypto.scrypt` + in-memory derived-key cache (5-min TTL) — settings encryption/decryption no longer blocks the event loop

### Medium
- **M-1:** Replaced flat secret-key scrubbing with recursive `deepScrub()` in agent workflow definitions and execution input storage — secrets at any nesting depth are now sanitized

### Low
- **L-1:** Covered by H-2 async scrypt migration and key cache

### Verified Clean
This audit round confirmed the following areas are free of findings: SQL injection (all identifier paths validated, all values parameterized), XSS (no HTML rendering), CSRF (Bearer token auth), mass assignment (field whitelists on all write paths), auth (all sensitive endpoints gated), rate limiting (enabled by default, applied to all auth flows), error leakage (all errors logged server-side only), command injection (zero child_process usage), crypto (bcrypt, AES-256-CBC, per-encryption salt, timing-safe OTP comparison, no Math.random).

## v0.13.0 — Security Patch (2026-05-14)

### Critical
- **C-1:** Added `validateIdentifier` to `Field` constructor and `buildExpectedColumns` — closes SQL injection via field names in DDL (CREATE TABLE, ALTER TABLE)
- **C-2:** Added semicolon guard with string-literal stripping before EXPLAIN view-query validation — prevents multi-statement injection bypass

### High
- **H-1:** Re-validate collection name and field names after `Object.assign` on PATCH — prevents path traversal and SQL injection from bypassed constructor validation
- **H-2:** Converted all backup endpoints (list, create, upload, restore, delete) from sync `fs.*` to async `fs/promises` — prevents event-loop blocking during backup operations

### Medium
- **M-1:** Covered by C-1 Field constructor fix — `validateIdentifier` rejects invalid field names at construction time

### Low
- **L-1:** Covered by H-1 — `validateIdentifier` on PATCH prevents invalid collection names from reaching DB and crashing bootstrap
- **L-2:** Added per-field name validation in collection import endpoint — rejects invalid field names before collection creation

## v0.12.1 — Security Patch (2026-05-14)

### High
- **H-1:** Replaced `err.message` with generic `'Internal server error'` in all API catch blocks (71 instances across 16 files) — full errors logged server-side only
- **H-2:** Added rate limiters to all 6 user-facing auth flow endpoints (password reset, verification, email change — 5 req/hr request, 10 req/15min confirm)
- **H-3:** Added rate limiters to OAuth2 authentication callback and admin token refresh
- **H-4:** Replaced blocklist-based view query validation with EXPLAIN-based opcode analysis — blocks write operations (DDL, DML, PRAGMA, ATTACH)

### Medium
- **M-1:** Added SELECT-only guard to `findRecordsByRawQuery`
- **M-2:** Clamped `setBcryptRounds` to [10, 12] to prevent DoS via excessive work factor
- **M-3:** Replaced predictable `superuser_${Date.now()}` IDs with `crypto.randomBytes`
- **M-4:** CLI superuser password input now masked with `*` characters

### Low
- **L-1:** Added `Referrer-Policy: no-referrer` header to password reset email responses
- **L-2:** Replaced inline regex with shared `validateIdentifier` in vector search
- **L-3:** Replaced sync `fs` calls with `fs/promises` in automated backup cron

## v0.12.0 — Security Patch (2025-05-14)

### Critical
- **C-1:** Replaced `...createData` spread in OAuth2 flow with explicit field allowlist to prevent mass assignment of `passwordHash`
- **C-2:** Added rate limiter to `auth-with-otp` endpoint (5 req/min per IP+otpId)
- **C-3:** Replaced `Math.random()` with `crypto.randomInt` for OTP code generation
- **C-4:** Replaced `Math.random()` with `crypto.randomInt` for MFA backup codes; codes now hashed before storage

### High
- **H-1:** Added `requireSuperuserAuth` to `GET /api/collections` and `GET /api/collections/:id` endpoints
- **H-2:** Added `requireSuperuserAuth` to `GET /api/crons` endpoint
- **H-3:** Fixed SQL column/placeholder count mismatch in OTP INSERT statement
- **H-4:** Fixed `+`/`-` field modifier bypass of protected-field stripping in record upsert
- **H-5:** Replaced all `Math.random().toString(36)` ID generation with `crypto.randomBytes` across 5 files
- **H-6:** Enabled rate limiting by default (60 req/min per IP)

### Medium
- **M-1:** Enabled SMTP TLS certificate validation by default
- **M-2:** Replaced hardcoded KDF salt with random per-encryption salt; added backward-compatible decryption
- **M-3:** Lowered JSON/URL-encoded body limit from 50MB to 10MB
- **M-4:** Sanitized morgan request logging to omit query strings
- **M-5:** Added field type validation for file upload `field` query parameter
- **M-6:** Implemented per-account lockout after 10 consecutive failed auth attempts within 15 minutes

### Low
- **L-1:** Replaced string comparison with `crypto.timingSafeEqual` for OTP hash verification
- **L-2:** Capped workflow stream input size to 64KB before `JSON.parse`
- **L-3:** Applied rejection sampling to eliminate modulo bias in `generateRandomString`
- **L-4:** Loaded version from `package.json` at runtime; enabled `helmet.hidePoweredBy()`
- **L-5:** Added structural validation for collection objects in the import endpoint
- **L-6:** Removed hardcoded localhost entries from OAuth2 redirect URL allowlist

## v0.11.0 — Security Remediation (2025-05-13)

### Security
- Fixed 32 security findings including critical SQL injection vulnerabilities, unauthenticated endpoints, weak encryption key fallback, and missing WebSocket authentication
- Added shared `validateIdentifier` utility for consistent SQL injection prevention
- Applied principle of least privilege with auth middleware additions
- See previous audit report for full details

## v0.10.0 — Torque Integration
- Torque agent and workflow engine
- AI-assisted collection and rule generation
