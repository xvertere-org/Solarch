# Changelog

## v0.12.1 — Security Patch (2025-05-14)

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
