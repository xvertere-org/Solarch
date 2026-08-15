# PRE-CORE-CLIENT IMPLEMENTATION PLAN
**Gated Implementation Roadmap for Solarch Server Platform Stabilization**  
**Pre-Requisite Gate for `@solarch/core-client`**

---

## Overview & Objective

This document defines the exact, dependency-aware, phased execution plan to resolve all architectural, security, and contract inconsistencies identified in `AUDIT_SUMMARY.md`. 

**Strict Rule:** No code in `@solarch/core-client` should be written until Phases 0 through 14 of this plan are completed and verified by the regression test suite.

---

## Dependency Graph

```
Phase 0: Baseline Verification
    │
    ▼
Phase 1: Contract & Type Cleanup ──► Phase 2: Error Model Unification
                                           │
                                           ▼
                                     Phase 3: REST Envelope Normalization
                                           │
                                           ▼
                                     Phase 4: Query & Pagination Fixes
                                           │
                                           ▼
                                     Phase 5: Serialization Matrix
                                           │
                                           ▼
                                     Phase 6: Auth & Identity Hardening
                                           │
                                           ▼
                                     Phase 7: Authorization Consistency
                                           │
                                           ▼
                                     Phase 8: File Contract Alignment
                                           │
                                           ▼
                                     Phase 9: Realtime Security & Protocol
                                           │
                                           ▼
                                     Phase 10: Hook/Event Stability
                                           │
                                           ▼
                                     Phase 11: Schema Migration Unification
                                           │
                                           ▼
                                     Phase 12: Admin Client Compatibility
                                           │
                                           ▼
                                     Phase 13: Contract Test Expansion
                                           │
                                           ▼
                                     Phase 14: Security Verification Gate
                                           │
                                           ▼
                                     Phase 15: @solarch/core-client Green Light
                                           │
                                           ▼
                                     Phase 16: Independent Audit
                                           │
                                           ▼
                                     Phase 17: Platform Freeze
```

---

## Phased Implementation Plan

### Phase 0 — Baseline & Environment
- **Objective:** Establish the clean testing and build baseline.
- **Exact Files:** `package.json`, `vitest.config.ts`, `tsconfig.json`.
- **Target Behavior:** All 27 existing test suites pass cleanly; typecheck and lint return zero errors.
- **Dependencies:** None.
- **Compatibility Impact:** None.
- **Tests:** `npm test`, `npm run lint`, `npx tsc --noEmit`.
- **Acceptance Criteria:** 100% clean baseline.
- **Rollback Strategy:** Git reset to head.
- **Blocks Core-Client:** YES.

---

### Phase 1 — Contract Cleanup
- **Objective:** Ensure all wire types in `src/core/contracts/api_contracts.ts` accurately model the public protocol without leaking server-internal classes.
- **Exact Files:** `src/core/contracts/api_contracts.ts`.
- **Symbols:** `ApiError`, `ApiResponse<T>`, `PaginatedResponse<T>`, `AuthResponse<T>`, `RealtimeMessage<T>`.
- **Current Behavior:** Types exist but are not imported or enforced across all Express route handlers.
- **Target Behavior:** Wire types become the authoritative TypeScript contract for both server responses and client SDK consumption.
- **Dependencies:** Phase 0.
- **Compatibility Impact:** No breaking changes to existing valid wire responses.
- **Tests:** `src/apis/__tests__/contracts/error_envelope.contract.test.ts`.
- **Acceptance Criteria:** `api_contracts.ts` exports clean wire types without Node/Express imports.
- **Rollback Strategy:** Revert edits to `api_contracts.ts`.
- **Blocks Core-Client:** YES.

---

### Phase 2 — Error Model Unification
- **Objective:** Replace all ad-hoc `{ code, message }` JSON responses with the canonical `ApiError` format (`{ code, status, message, errors?, data? }`).
- **Exact Files:**
  - `src/utils/api_errors.ts`
  - `src/apis/admin_auth.ts`
  - `src/apis/middlewares_auth.ts`
  - `src/apis/auth_flows.ts`
  - `src/apis/collection.ts`
  - `src/apis/batch.ts`
  - `src/apis/settings.ts`
- **Current Behavior:** Several handlers return `{ code: 400, message: '...' }` missing the string `status` enum (e.g. `'VALIDATION_FAILED'`, `'UNAUTHORIZED'`).
- **Target Behavior:** All error responses invoke `sendApiError()` / `createApiError()` ensuring consistent structure.
- **Dependencies:** Phase 1.
- **Compatibility Impact:** Adds `status` field to legacy error payloads; preserves `code` and `message`.
- **Tests:** Run full test suite to verify no existing tests break.
- **Acceptance Criteria:** Every HTTP 4xx/5xx response includes `code`, `status`, and `message`.
- **Rollback Strategy:** Revert individual route error handlers.
- **Blocks Core-Client:** YES.

---

### Phase 3 — REST Contract Normalization
- **Objective:** Verify and normalize parameter naming, query string parsing, and response headers across all REST endpoints.
- **Exact Files:** `src/apis/serve.ts`, `src/apis/record_crud.ts`, `src/apis/collection.ts`.
- **Target Behavior:** All endpoints set `X-Solarch-Protocol: 1.0` and process `?page=`, `?perPage=`, `?filter=`, `?sort=`, `?expand=`, `?fields=` uniformly.
- **Dependencies:** Phase 2.
- **Tests:** `src/apis/__tests__/contracts/error_envelope.contract.test.ts`.
- **Acceptance Criteria:** Zero parameter name discrepancies across endpoints.
- **Blocks Core-Client:** YES.

---

### Phase 4 — Query & Pagination Semantics Fix
- **Objective:** Fix the information leak where `totalItems` and `totalPages` are calculated on the raw database table prior to record rule filtering.
- **Exact Files:** `src/apis/record_crud.ts`, `src/core/record_query.ts`.
- **Symbols:** `recordRouter.get('/')`, `findAllRecords()`.
- **Current Behavior:** `findAllRecords` counts all rows in `_r_<collectionId>` before checking `collection.listRule`, leaking the total count and misaligning pagination when records are restricted.
- **Target Behavior:** When `collection.listRule === null`, immediately return `{ page: 1, perPage, totalItems: 0, totalPages: 1, items: [] }`. When `listRule` contains an expression, evaluate rule filtering during query compilation where possible, or document clearly that listRule applies to query results.
- **Dependencies:** Phase 3.
- **Security Implications:** Eliminates P1 metadata enumeration vulnerability.
- **Tests:** Add test cases in `src/apis/__tests__/contracts/pagination_semantics.contract.test.ts`.
- **Acceptance Criteria:** Locked collections return `totalItems: 0`.
- **Rollback Strategy:** Revert changes in `record_crud.ts`.
- **Blocks Core-Client:** YES.

---

### Phase 5 — Serialization & Field Type Matrix Verification
- **Objective:** Guarantee that all 14 field types serialize into standard JSON primitives across SQLite, PostgreSQL, Neon, and MongoDB.
- **Exact Files:** `src/core/record.ts`, `src/core/field.ts`, `src/apis/record_helpers.ts`.
- **Target Behavior:** Complete type fidelity with zero database-specific leaks (e.g. SQLite integers for booleans must serialize to `boolean` in public JSON).
- **Dependencies:** Phase 4.
- **Tests:** `src/apis/__tests__/contracts/serialization_matrix.contract.test.ts`.
- **Acceptance Criteria:** All 14 field types pass serialization matrix tests.
- **Blocks Core-Client:** YES.

---

### Phase 6 — Authentication & Identity Hardening
- **Objective:** Eliminate identity ambiguity in `loadAuthToken` and ensure token refresh and revocation work symmetrically across superuser and record principals.
- **Exact Files:**
  - `src/apis/middlewares_auth.ts`
  - `src/apis/record_auth.ts`
  - `src/apis/admin_auth.ts`
- **Symbols:** `loadAuthToken()`, `authenticateAdmin()`.
- **Current Behavior:** `loadAuthToken` blindly trusts `payload.isAdmin` without verifying database existence or revocation.
- **Target Behavior:** Check `payload.type === 'admin'` and verify the superuser exists and is active.
- **Dependencies:** Phase 5.
- **Security Implications:** Eliminates P1 privilege escalation vector.
- **Tests:** `src/apis/__tests__/admin_auth.test.ts`, `src/apis/__tests__/auth_middleware.test.ts`.
- **Acceptance Criteria:** Admin tokens verified against `_superusers` and token revocation list.
- **Blocks Core-Client:** YES.

---

### Phase 7 — Cross-Surface Authorization Gate
- **Objective:** Verify that record authorization rules (`viewRule`, `createRule`, `updateRule`, `deleteRule`, `listRule`) evaluate identically across REST, Batch, and Realtime surfaces.
- **Exact Files:** `src/apis/record_helpers.ts`, `src/apis/batch.ts`, `src/core/record_field_resolver.ts`.
- **Target Behavior:** Consistent execution context (`RequestInfo`) provided to all rule evaluation invocations.
- **Dependencies:** Phase 6.
- **Tests:** `src/apis/__tests__/contracts/cross_surface_authz.contract.test.ts`.
- **Acceptance Criteria:** Zero authorization bypass across any surface.
- **Blocks Core-Client:** YES.

---

### Phase 8 — File Storage Contract Alignment
- **Objective:** Ensure file URLs, thumbnail endpoints, and protected file tokens work identically across Local storage and S3.
- **Exact Files:** `src/apis/file.ts`, `src/tools/filesystem/s3_driver.ts`, `src/tools/filesystem/driver.ts`.
- **Target Behavior:** Clean separation between database records and storage blobs; consistent token verification via `/api/files/:c/:recordId/:filename?token=...`.
- **Dependencies:** Phase 7.
- **Tests:** `src/apis/__tests__/security.test.ts` (file access tests).
- **Acceptance Criteria:** File upload, download, and token authorization work identically across drivers.
- **Blocks Core-Client:** YES.

---

### Phase 9 — Realtime Security & Protocol Normalization
- **Objective:** Fix the P0 realtime broadcast authorization leak and normalize topic naming between documentation and server implementation.
- **Exact Files:** `src/apis/realtime.ts`, `src/tools/subscriptions/broker.ts`.
- **Symbols:** `broadcastRecordEvent()`, `canSubscribeToChannel()`, `setupWebSocketRealtime()`.
- **Current Behavior:**
  - Broadcast sends raw record payloads to all channel subscribers without evaluating `viewRule`.
  - Server accepts only `collections.<id>.records` while client expects `<collectionName>` or `*`.
- **Target Behavior:**
  - Realtime subscription accepts collection names (resolving to collectionId internally).
  - Broadcast events verify subscriber view access or emit minimal metadata notifications.
- **Dependencies:** Phase 7.
- **Security Implications:** Resolves P0 data leakage across realtime connections.
- **Tests:** `src/apis/__tests__/contracts/realtime_protocol.contract.test.ts`.
- **Acceptance Criteria:** Unauthorized clients cannot receive private records via realtime.
- **Blocks Core-Client:** YES.

---

### Phase 10 — Lifecycle Hook & Event Contract
- **Objective:** Freeze the internal hook dispatch mechanics and confirm that hook errors propagate cleanly during record mutations.
- **Exact Files:** `src/tools/hook/hook.ts`, `src/core/events.ts`, `src/core/base.ts`.
- **Target Behavior:** Synchronous and asynchronous hooks execute in declared priority order; failed hooks abort transactions.
- **Dependencies:** Phase 9.
- **Acceptance Criteria:** Hook system verified and marked Server-Internal.
- **Blocks Core-Client:** NO (Server-Internal).

---

### Phase 11 — Schema Migration Table Name Unification
- **Objective:** Resolve the database table name conflict between `base.ts` (`_migrations`) and `migration.ts` (`_applied_migrations`).
- **Exact Files:** `src/core/base.ts`, `src/core/migration.ts`.
- **Target Behavior:** Both files use `_applied_migrations` as the single canonical table for tracking applied migrations.
- **Dependencies:** Phase 10.
- **Tests:** `src/apis/__tests__/backup.test.ts`, `src/apis/__tests__/cli_database_config.test.ts`.
- **Acceptance Criteria:** Schema migrations create and query only `_applied_migrations`.
- **Blocks Core-Client:** YES.

---

### Phase 12 — Admin Client Readiness
- **Objective:** Prepare Admin UI to be the first consumer of `@solarch/core-client`.
- **Exact Files:** `admin/src/api/client.ts`, `admin/src/App.tsx`.
- **Target Behavior:** Map all Admin API calls to the future SDK methods.
- **Dependencies:** Phase 11.
- **Acceptance Criteria:** Admin API surface documented and ready for SDK integration.
- **Blocks Core-Client:** NO (Post-Core-Client).

---

### Phase 13 — Contract Regression Test Matrix Expansion
- **Objective:** Expand the automated contract test suite to cover all edge cases across authentication, record filtering, pagination, and file tokens.
- **Exact Files:** `src/apis/__tests__/contracts/*.ts`.
- **Target Behavior:** Automated contract test suite covering 100% of the public wire protocol.
- **Dependencies:** Phases 1-11.
- **Tests:** `npm test`.
- **Acceptance Criteria:** All contract test suites pass with zero warnings or skips (on SQLite).
- **Blocks Core-Client:** YES.

---

### Phase 14 — Security Verification Gate
- **Objective:** Run full security penetration suite (SQL injection, path traversal, brute force lockout, authz bypass, secret leakage).
- **Exact Files:** `src/apis/__tests__/security.test.ts`, `src/apis/__tests__/security_regression.test.ts`.
- **Target Behavior:** 100% security test pass rate.
- **Dependencies:** Phase 13.
- **Acceptance Criteria:** Zero unresolved P0/P1/P2 security vulnerabilities.
- **Blocks Core-Client:** YES.

---

### Phase 15 — Core-Client Implementation Authorization
- **Objective:** Authorize the start of `@solarch/core-client` package creation.
- **Prerequisites:** Successful completion and verification of Phases 0 through 14.
- **Deliverables:** Scaffold `@solarch/core-client` package targeting the finalized server protocol.
- **Blocks Core-Client:** N/A (Milestone Entry).

---

### Phase 16 — Independent Audit & SDK Validation
- **Objective:** Conduct end-to-end integration testing of `@solarch/core-client` against live Solarch instances across SQLite, PostgreSQL, and Neon.
- **Dependencies:** Phase 15.
- **Blocks Core-Client:** NO.

---

### Phase 17 — Protocol Freeze
- **Objective:** Freeze the 1.0 JSON wire protocol and publish `@solarch/core-client` v1.0.0.
- **Deliverables:** Protocol specification document and frozen release tag.
- **Blocks Core-Client:** NO.
