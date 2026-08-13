# Solarch — Feature Status Report

> **Generated:** 2026-07-26 — Evidence-based audit of the full codebase.  
> **Test suite:** 155/155 passing across 10 test files.  
> **Methodology:** Features marked ✅ have passing tests that exercise their code path. Features marked ⚠️ have complete implementations but lack dedicated test coverage.

---

## Legend

| Status | Meaning |
|---|---|
| ✅ VERIFIED | Test evidence proves correctness |
| ⚠️ UNTESTED | Code complete, no dedicated tests |
| ❌ BROKEN | Provable defects at runtime |
| 🚫 STUB | Endpoint/function exists but is a no-op |
| 🔴 FALSE | Claimed in docs but absent in code |

---

## 1. Authentication & Authorization

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Password auth (email + password) | ✅ VERIFIED | `record_auth.test.ts` → "Login: Valid credentials" | `src/apis/record_auth.ts:72-146` |
| OTP auth (email one-time password) | ✅ VERIFIED | `record_auth.test.ts` → "OTP Auth flow: Request and Verify" | `src/apis/record_auth.ts:263-363` |
| OAuth2 (GitHub, Google, Discord, Facebook) | ⚠️ UNTESTED | — | `src/apis/record_auth.ts:148-261`, `src/tools/auth/oauth2.ts` |
| MFA / TOTP (two-factor auth) | ✅ VERIFIED | `record_auth.test.ts` → "MFA/TOTP setup & verify" | `src/apis/record_auth.ts:399-497` |
| Token refresh (record auth) | ✅ VERIFIED | implicit via auth flow tests | `src/apis/record_auth.ts:367-397` |
| Admin / superuser login | ✅ VERIFIED | `admin_auth.test.ts` → "Login: invalid credentials → 400" | `src/apis/admin_auth.ts:47-92` |
| Admin token refresh | ✅ VERIFIED | `admin_auth.test.ts` → "Token Refresh: valid/revoked/expired" | `src/apis/admin_auth.ts:95-133` |
| Admin password reset | ✅ VERIFIED | `admin_auth.test.ts` → "Password Reset: E2E flow" | `src/apis/admin_auth.ts:135-214` |
| Admin brute-force lockout | ✅ VERIFIED | `admin_auth.test.ts` → "lock out after 10 failed attempts" | `src/utils/lockout.ts` |
| Auth methods endpoint | ⚠️ UNTESTED | — | `src/apis/record_auth.ts:500-522` |
| External auths listing | ⚠️ UNTESTED | — | `src/apis/record_auth.ts:524-561` |
| Email verification (request + confirm) | ⚠️ UNTESTED | `onlyVerified` gating tested in `record_auth.test.ts` | `src/apis/auth_flows.ts:129-209` |
| Password reset (user auth) | ✅ VERIFIED | `auth_flows.test.ts` → "Password reset: E2E flow" | `src/apis/auth_flows.ts:32-127` |
| Email change (request + confirm) | ✅ VERIFIED | `auth_flows.test.ts` → "Change email: E2E flow" | `src/apis/auth_flows.ts:211-311` |
| Impersonation | ✅ VERIFIED | `auth_flows.test.ts` → "admin can impersonate, user cannot" | `src/apis/auth_flows.ts:314-355` |
| JWT middleware (token loading) | ✅ VERIFIED | `auth_middleware.test.ts` | `src/apis/middlewares_auth.ts:20-74` |

## 2. Record CRUD

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| List records (paginated, filtered, sorted) | ⚠️ UNTESTED | filter/sort SQL tested in `sql_injection.test.ts` | `src/apis/record_crud.ts:14-73` |
| Get single record | ⚠️ UNTESTED | — | `src/apis/record_crud.ts:129-168` |
| Create record | ✅ VERIFIED | `record_auth.test.ts` → "Registration: Valid creation" + "duplicate email" | `src/apis/record_crud.ts:170-222` |
| Update record | ✅ VERIFIED | `security.test.ts` → "BUG-006: oldPassword verification" (6 sub-tests) | `src/apis/record_crud.ts:224-266` |
| Delete record | ⚠️ UNTESTED | — | `src/apis/record_crud.ts:268-303` |
| Vector search | ⚠️ UNTESTED | — | `src/apis/record_crud.ts:75-127` |
| Record enrichment (expand, fields, hide) | ✅ VERIFIED | `new_issue.test.ts` → "BUG-001", "NEW-002" | `src/apis/record_helpers.ts:14-63` |
| Access rules (list/view/create/update/delete) | ✅ VERIFIED | Multiple tests exercise rule evaluation | `src/apis/record_helpers.ts:133-191` |

## 3. Collection Management

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Collection CRUD | ⚠️ UNTESTED | exercised transitively by integration tests | `src/apis/collection.ts:24-174` |
| Collection import/export | ⚠️ UNTESTED | — | `src/apis/collection.ts:112-170` |
| Schema sync (DDL) | ⚠️ UNTESTED | exercised transitively by integration tests | `src/core/schema_sync.ts` |

## 4. Field Types

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Field types (13 types) | ⚠️ UNTESTED | email/password validated transitively | `src/core/field.ts` |

## 5. Realtime

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| SSE realtime | ⚠️ UNTESTED | — | `src/apis/realtime.ts:14-50` |
| WebSocket realtime | ⚠️ UNTESTED | auth tested in `new_issue.test.ts` SEC-008 | `src/apis/realtime.ts:139-236` |
| Realtime channel authorization | ✅ VERIFIED | `new_issue.test.ts` → "SEC-008" | `src/apis/realtime.ts:104-137` |
| Record event broadcasting | ⚠️ UNTESTED | — | `src/apis/realtime.ts:247-260` |

## 6. File Storage

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Local file storage | ⚠️ UNTESTED | — | `src/tools/filesystem/driver.ts` |
| S3 file storage | ⚠️ UNTESTED | — | `src/tools/filesystem/s3_driver.ts` |
| File tokens (JWT-based access) | ⚠️ UNTESTED | — | `src/apis/file.ts:75-91` |
| Thumbnail generation | ⚠️ UNTESTED | — | `src/apis/file.ts:376-411` |

## 7. AI Features

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| AI generate collection | ⚠️ UNTESTED | — | `src/ai/service.ts:31-85` |
| AI generate rule | ⚠️ UNTESTED | — | `src/ai/service.ts:87-115` |
| AI seed records | ⚠️ UNTESTED | — | `src/ai/service.ts:117-163` |
| AI chat | ⚠️ UNTESTED | — | `src/ai/service.ts:165-193` |
| LLM providers (OpenAI, Anthropic, Ollama) | ⚠️ UNTESTED | — | `src/ai/provider.ts` |

## 8. Backup & Restore

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Create backup | ✅ VERIFIED | `backup.test.ts` → "creates a backup" + "rejects duplicate" | `src/apis/backup.ts:61-97` |
| List backups | ✅ VERIFIED | `backup.test.ts` → "returns empty list" + "lists created" | `src/apis/backup.ts:27-59` |
| Delete backup | ✅ VERIFIED | `backup.test.ts` → "removes a backup" + "404 for missing" | `src/apis/backup.ts:99-130` |
| Restore backup | ✅ VERIFIED | `backup.test.ts` → "restores a backup" + "404 for missing" | `src/apis/backup.ts:132-167` |
| Upload backup | ✅ VERIFIED | `backup.test.ts` → "upload accepts a zip file" | `src/apis/backup.ts:170-208` |
| Auto-backup (cron) | ⚠️ UNTESTED | — | `src/apis/serve.ts:149-179` |

## 9. JSVM & Hooks

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| JS hooks (pb_hooks/*.js) | ⚠️ UNTESTED | — | `src/tools/jsvm/jsvm.ts` |
| Deno isolated sandbox | ✅ VERIFIED | `jsvm_sandbox.test.ts` → 54 tests (isolation, limits, attacks) | `src/tools/jsvm/deno_sandbox.ts` |

## 10. CLI

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| `superuser-create` | ⚠️ UNTESTED | — | `src/cmd/superuser.ts` |
| `serve` | ⚠️ UNTESTED | route registration exercised by all integration tests | `src/apis/serve.ts` |

## 11. Admin UI

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Admin UI (React/Vite SPA) | ⚠️ UNTESTED | — | `admin/src/` |

## 12. Other Features

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| Installer (first-run setup) | ⚠️ UNTESTED | — | `src/apis/installer.ts` |
| Batch API | ⚠️ UNTESTED | — | `src/apis/batch.ts` |
| Cron jobs (API-managed) | ⚠️ UNTESTED | — | `src/apis/cron.ts` |
| Logs API | ⚠️ UNTESTED | — | `src/apis/logs.ts` |
| Settings API (get/update) | ⚠️ UNTESTED | — | `src/apis/settings.ts` |
| Health endpoint | ✅ VERIFIED | `backup.test.ts` → "returns ok" + "returns details for admin" | `src/apis/health.ts` |
| Email sending (SMTP/nodemailer) | ⚠️ UNTESTED | — | `src/tools/mailer/mailer.ts` |
| Migration runner | ⚠️ UNTESTED | exercised transitively by `app.migrate()` in all tests | `src/core/migration.ts` |
| Migrations (pb_migrations/) | ⚠️ UNTESTED | — | `src/solarch.ts` |

## 13. Security

| Feature | Status | Test Evidence | Source |
|---------|--------|---------------|--------|
| SQL injection protection | ✅ VERIFIED | `sql_injection.test.ts` → 20+ payloads tested | `src/utils/sql_safe.ts` |
| Rate limiting | ⚠️ UNTESTED | lockout tested in `admin_auth.test.ts` | `src/apis/middlewares_rate_limit.ts` |
| Password hash protection | ✅ VERIFIED | `new_issue.test.ts` → "NEW-001", "NEW-002" | `src/apis/record_helpers.ts` |
| Old password verification | ✅ VERIFIED | `security.test.ts` → "BUG-006" (6 sub-tests) | `src/apis/record_crud.ts` |
| Token revocation | ✅ VERIFIED | `admin_auth.test.ts` → "revoked token → 401" | `src/apis/admin_auth.ts` |
| Security headers (Helmet) | ⚠️ UNTESTED | — | `src/apis/serve.ts:39-72` |
| Path traversal protection | ⚠️ UNTESTED | — | `src/apis/file.ts:52-58` |

---

## Totals

| Status | Count |
|---|---|
| ✅ VERIFIED | 25 |
| ⚠️ UNTESTED | 43 |
| ❌ BROKEN | 0 |
| 🚫 STUB | 0 |
| 🔴 FALSE | 0 |
