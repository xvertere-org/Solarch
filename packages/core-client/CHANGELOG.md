# Changelog

All notable changes to the `@solarch/core-client` package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-08-15

### ⚠️ BREAKING CHANGES

- **`AuthStore.isValid()` / `BaseAuthStore.isValid()` (BUG-3, Fix 4)**:
  - **Previous behavior**: Returned `true` for any non-empty token string (including expired JWTs and corrupted 3-part strings).
  - **New behavior**: Decodes the JWT payload and checks the `exp` claim against current time (`exp > Date.now() / 1000`). Returns `false` if the token is expired, empty, or has an invalid/corrupted payload in a 3-part token. Non-JWT opaque tokens without 3 dot-separated parts continue to return `true`.

- **`HttpClient.send()` / Method-Aware Retries (Fix 2)**:
  - **Previous behavior**: Automatic retry loop applied unconditionally to all HTTP methods (including non-idempotent writes like POST, PATCH, PUT, DELETE).
  - **New behavior**: By default, only idempotent HTTP methods (`GET`, `HEAD`) are automatically retried on network errors, timeouts, `5xx`, and `429` responses. Non-idempotent writes (`POST`, `PATCH`, `PUT`, `DELETE`) fail immediately on the first attempt to prevent duplicate server writes. To enable retries for non-idempotent calls, callers must explicitly pass `retryUnsafeMethods: true` in `SendOptions`.

### 🚀 Features & Enhancements

- **HTTP Resilience (BUG-1, BUG-6, BUG-12, Fix 1, Fix 3)**:
  - Added configurable request timeout (default: 30,000ms) with per-request override support.
  - Distinguishes internal request timeouts from genuine user-initiated aborts; internal timeouts are now correctly classified as retryable network failures while user aborts short-circuit immediately.
  - Added full jitter (`[exponential, 1.5 * exponential]`) to exponential backoff delays to prevent thundering-herd effects on recovering servers.
  - Added automatic HTTP 429 rate limit retry with `Retry-After` header respect (capped at 60 seconds).
  - Missing `fetch` in non-standard environments now throws a canonical `ClientResponseError` with status `INTERNAL_ERROR`.

- **OOM Safety & Memory Caps (BUG-2, BUG-7, BUG-8, BUG-9)**:
  - Added `maxItems` safety cap (default: 10,000) and empty page check to `RecordService.getFullList()` to prevent infinite paging and Node/browser heap exhaustion.
  - Added 500-instance LRU cache eviction to `SolarchClient.recordServices` and exposed `SolarchClient.clearCollectionCache()` to prevent unbounded cache growth.
  - Cleaned up stale `channelAliases` entries in `RealtimeService` on topic unsubscription and connection disconnect.
  - Added 30-second TTL auto-invalidation to `CapabilityService.getHealth()` to ensure fresh server health status.

- **Contract Conformance & Spec (BUG-10)**:
  - Published canonical OpenAPI 3.1.0 specification at `src/contracts/openapi.json`.
  - Added automated contract test suite validating SDK routes and wire types against server contracts.

- **CI & Cross-Platform (BUG-13, BUG-16)**:
  - Expanded GitHub Actions CI test matrix to test Node 20.x and 22.x across Ubuntu, Windows, and macOS.
  - Added `@vitest/coverage-v8` test coverage gate and `test:contract` script.
