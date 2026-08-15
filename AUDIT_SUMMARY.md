# SOLARCH — COMPLETE ARCHITECTURAL & IMPLEMENTATION STATUS AUDIT
**Pre-Core-Client Feature Completion Gate**  
**Audit Date:** August 15, 2026  
**Repository Version:** `0.15.8`  
**Target Next Milestone:** `@solarch/core-client`

---

## 1. Executive Summary

This document presents a comprehensive, read-only architectural and implementation status audit of the entire Solarch codebase. Solarch is a TypeScript backend-as-a-service featuring multi-provider database support (SQLite, PostgreSQL, Neon, MongoDB), authentication, collection & record management, file storage, realtime event streaming (SSE/WebSocket), a JavaScript sandbox (JSVM/Deno), AI schema generation, and an embedded React Admin UI.

The primary objective of this audit is to determine whether the server-side platform and its public contracts are stable, secure, consistent, and ready to be targeted by the universal `@solarch/core-client` SDK across Web, React Native, Tauri, and Electron runtimes.

### Gate Verdict: **READY WITH REQUIRED FIXES**

The foundation of Solarch is well-structured and functional (27 test suites passing, 275 tests passing, TypeScript compilation and Vite build clean). However, there are **5 critical contract and security defects** that directly affect the public client boundary and MUST be addressed before writing client SDK code:

1. **Realtime Broadcast Authorization Leak (P0 / Blocker):** Realtime events on collection channels broadcast created/updated record payloads to all subscribed clients without per-subscriber record-level authorization evaluation.
2. **List Pagination Count Information Leak (P1 / Blocker):** `totalItems` and `totalPages` are computed against the database before applying `listRule` in application memory, leaking exact record counts and producing pagination offsets that misalign with returned items.
3. **Realtime Protocol & Channel Naming Drift (P1 / Blocker):** Server code expects `collections.<id>.records` with WS payload `{ type: 'subscribe', channels: [...] }`, whereas documentation and client expectations claim `<collectionName>`, `<collectionName>/<id>`, and `*`.
4. **Error Envelope & Response Model Inconsistencies (P1 / Blocker):** While a canonical `ApiError` contract (`{ code, status, message, errors, data }`) exists in `src/utils/api_errors.ts`, multiple route handlers still return raw/ad-hoc `{ code, message }` JSON shapes without status identifiers.
5. **Database Migration Table Name Conflict (P2 / Blocker):** `src/core/base.ts` initializes table `_migrations` while `src/core/migration.ts` reads/writes `_applied_migrations`.

---

## 2. Full Repository Inventory & Map

```
/Users/jay/Downloads/solarch
├── admin/                  # React 18 + Vite + TailwindCSS Admin Frontend
│   ├── src/
│   │   ├── api/client.ts   # Minimal fetch-based REST client for Admin UI
│   │   ├── components/     # UI widgets, layout, navigation, Sonner toaster
│   │   ├── hooks/          # use-mobile hook
│   │   ├── pages/          # 10 Admin views (Dashboard, Collections, Records, etc.)
│   │   └── types/          # (Empty directory)
├── docs/                   # Markdown documentation & reference guides
│   ├── features/           # Feature guides (auth, realtime, files, db, hooks, ai)
│   └── reference/          # Reference docs, capability matrices, REST API tables
├── docs-verified/          # Verified technical guides and security snapshots
├── pb_migrations/          # User-defined JavaScript migration files
├── pb_public/              # Static file hosting root & compiled Admin build target
├── scripts/                # Build and CI helper scripts (copy-admin, pg-test-env, postinstall)
├── src/                    # Primary backend source code
│   ├── ai/                 # AI service layer and multi-provider LLM abstraction
│   ├── apis/               # Express HTTP route controllers & middleware
│   ├── cmd/                # CLI sub-commands (superuser management)
│   ├── core/               # Core engine (BaseApp, Collection, Record, Fields, DB wrapper)
│   ├── migrations/         # (Empty directory reserved for system migrations)
│   ├── tools/              # Subsystem implementations (db drivers, jsvm, s3, mailer, search)
│   │   ├── auth/           # OAuth2 provider registry and exchange flows
│   │   ├── database/       # DatabaseDriver interfaces, capabilities, SQLite/PG/Mongo drivers
│   │   ├── filesystem/     # Local filesystem and S3 BlobDriver storage adapters
│   │   ├── hook/           # Hook and TaggedHook priority pub/sub mechanisms
│   │   ├── jsvm/           # Deno subprocess isolated execution sandbox & Node VM fallback
│   │   ├── mailer/         # Nodemailer wrapper and transactional email templates
│   │   ├── router/         # (Empty directory)
│   │   ├── search/         # Filter tokenizer, AST parser, and SQL builder
│   │   ├── security/       # Cryptographic hashing (Argon2id/Bcrypt), JWT generation & parsing
│   │   └── subscriptions/  # In-memory realtime topic broker
│   ├── utils/              # Shared helpers (API errors, pagination, lockout, sql_safe, masking)
│   ├── cli.ts              # Commander.js CLI entry point (`solarch`)
│   ├── index.ts            # Public library root exports
│   └── solarch.ts          # Solarch application bootstrap, lifecycle, and graceful shutdown
```

### Directory Assessment Table

| Directory | Purpose | Entry Points | Key Dependencies | Public vs Internal | Architectural Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/core` | Core models, BaseApp lifecycle, record query/upsert | `src/core/base.ts`, `collection.ts`, `record.ts` | `jsonwebtoken`, `better-sqlite3`, `pg` | Public SDK / Core | **FROZEN / STABLE** |
| `src/tools/database` | Database drivers, dialects, capabilities, migrations | `factory.ts`, `types.ts`, `capabilities.ts` | `better-sqlite3`, `pg`, `@neondatabase/serverless`, `mongodb` | Server-Internal | **FROZEN / STABLE** |
| `src/apis` | REST endpoints, route handlers, middleware | `serve.ts` | `express`, `helmet`, `cors`, `multer`, `ws` | Public Network Boundary | **PARTIALLY INCONSISTENT** |
| `src/tools/subscriptions`| Realtime subscription broker | `broker.ts` | In-memory `Set` & `Map` | Server-Internal | **IMPLEMENTED** |
| `src/tools/search` | Filter parser & AST | `filter.ts`, `query-builder.ts` | None | Public Query Abstract | **IMPLEMENTED / STABLE** |
| `src/tools/filesystem` | Local and S3 file blob storage | `filesystem.ts`, `driver.ts`, `s3_driver.ts` | Node `fs`, AWS SigV4 `fetch` | Server-Internal | **IMPLEMENTED** |
| `src/tools/jsvm` | Hook execution & Deno sandbox | `jsvm.ts`, `deno_sandbox.ts` | Node `vm`, `child_process` (Deno) | Server-Internal | **IMPLEMENTED** |
| `src/ai` | LLM service & providers | `service.ts`, `provider.ts` | `fetch` (OpenAI, Anthropic, Ollama) | Server-Internal / Admin | **IMPLEMENTED** |
| `admin/src` | React Admin Console | `main.tsx`, `App.tsx` | React 18, Vite, TailwindCSS, Radix UI | Admin Frontend | **IMPLEMENTED** |

---

## 3. Build & Runtime Baseline

### Exact Test and Verification Results

| Command | Exit Code | Result Summary | Diagnostics / Notes |
| :--- | :---: | :--- | :--- |
| `npm test` | **0** | **27 test files passed**, 275 tests passed, 65 skipped | Skipped tests are live PostgreSQL/Neon network tests requiring `DATABASE_URL`. |
| `npm run lint` | **0** | Clean (0 errors, 0 warnings) | ESLint 8.56 with TypeScript parser. |
| `npx tsc --noEmit` | **0** | Clean compilation | No TypeScript errors in backend. |
| `npm run build` | **0** | Build succeeded | Backend compiled to `dist/`, Admin UI bundled to `dist/` & copied to `pb_public/admin`. |
| `git diff --check` | **0** | Clean | No whitespace or line-ending defects. |

### Environment & Package Specifications
- **Node Engine Requirement:** `>=20.0.0` (validated in `package.json`).
- **Package Version:** `0.15.8`
- **Module System:** CommonJS for backend output (`dist/index.js`, `dist/cli.js`), ES Modules for Admin UI (`vite v6.4.3`).
- **Build Target:** Node.js ES2022 (`tsconfig.json`).
- **Production Entry Point:** `dist/index.js` (library) and `dist/cli.js` (executable binary).

---

## 4. Feature Inventory & Status Matrix

| Subsystem | Feature | Exists | Verified | Stable | Security | Client Ready | Blocks Core Client | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Core** | BaseApp Lifecycle (`bootstrap`, `reset`, `start`) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Core** | App Settings & Decryption (`SettingsEncryption`) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Core** | Event Hooks (`Hook`, `TaggedHook`) | YES | YES | YES | YES | NO | NO | `SERVER-INTERNAL` |
| **Core** | Migrations (`MigrationRunner`) | YES | YES | PARTIAL | YES | NO | YES | `INCONSISTENT` |
| **Database** | SQLite Driver (`better-sqlite3`, WAL mode) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Database** | PostgreSQL Driver (`pg` connection pool) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Database** | Neon Driver (HTTP / WebSocket modes) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Database** | MongoDB Driver (Memory & Cluster) | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Database** | Database Capability Matrix | YES | YES | YES | YES | YES | NO | `FROZEN / READY` |
| **Database** | Schema Synchronization (`schema_sync.ts`) | YES | YES | YES | YES | NO | NO | `SERVER-INTERNAL` |
| **Collections** | Collection CRUD (Base, Auth, View) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Collections** | Field Definitions (14 field types) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Collections** | Collection Access Rules (`listRule`, etc.) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Collections** | Schema Import & Export | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Records** | Record CRUD (`findRecordById`, `save`, `delete`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Records** | Filtering & AST Parsing (`parseFilter`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Records** | Sorting (`buildSort`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Records** | Pagination (`page`, `perPage`, bounds) | YES | YES | PARTIAL | NO | PARTIAL | YES | `INCONSISTENT / BLOCKS` |
| **Records** | Relation Expansion (`expandRecord` / nested) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Records** | Vector Cosine Similarity Search | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Password Login (Argon2id/Bcrypt) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Token Refresh & Revocation | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | OTP Email Login (`request-otp`, `auth-with-otp`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | MFA / TOTP Setup & Verification | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | OAuth2 (`auth-with-oauth2`, PKCE, State) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Password Reset & Verification Flows | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Email Change Flow (Opaque Token) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Impersonation (`/impersonate/:recordId`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Superuser Authentication (`/api/admins/*`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Auth** | Auth Middleware (`loadAuthToken`) | YES | YES | PARTIAL | NO | NO | YES | `INCONSISTENT / BLOCKS` |
| **Authz** | Record-level Access Rules (`canAccessRecord`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Files** | File Upload (`multipart/form-data`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Files** | File Download & Serving (`/api/files/...`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Files** | Short-Lived Protected File Tokens | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Files** | Image Thumbnail Generation (`sharp`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Files** | Local vs S3 Storage Parity | YES | YES | YES | YES | NO | NO | `SERVER-INTERNAL` |
| **Realtime** | WebSocket Protocol (`ws://.../api/realtime`) | YES | YES | PARTIAL | NO | PARTIAL | YES | `BROKEN / BLOCKS` |
| **Realtime** | SSE Streaming (`/api/realtime`) | YES | YES | PARTIAL | NO | PARTIAL | YES | `INCONSISTENT / BLOCKS` |
| **Realtime** | Channel Authorization & Broadcast | YES | YES | NO | NO | NO | YES | `BROKEN / BLOCKS` |
| **Batch** | Atomic Multi-Operation Batch (`/api/batch`) | YES | YES | YES | YES | YES | NO | `READY FOR CLIENT` |
| **Backups** | Streaming Zip Backups (SQLite only) | YES | YES | YES | YES | NO | NO | `SERVER-INTERNAL` |
| **AI** | Collection & Rule Generation | YES | YES | YES | YES | NO | NO | `POST-CORE-CLIENT` |
| **AI** | Mock Record Seeding | YES | YES | YES | YES | NO | NO | `POST-CORE-CLIENT` |
| **JSVM** | Deno Sandbox & Legacy VM Execution | YES | YES | YES | YES | NO | NO | `SERVER-INTERNAL` |
| **Admin** | React Admin UI | YES | YES | YES | YES | NO | NO | `POST-CORE-CLIENT` |

---

## 5. Core Architecture Audit

### Structure & Abstractions
- `BaseApp` (`src/core/base.ts`): Acts as the central kernel orchestrating database connections, collection schema cache, settings encryption, system migrations, and hook dispatches.
- `DB` (`src/core/db.ts`): Thin contract wrapper delegating to `DatabaseDriver` instances created by `createDatabaseDriver` in `src/tools/database/factory.ts`.
- `Collection` (`src/core/collection.ts`): Represents schema metadata for `base`, `auth`, and `view` collections.
- `RecordModel` (`src/core/record.ts`): Entity model containing dynamic attributes in a `Map<string, any>`, supporting hidden field exclusion and nested relation expansion.

### Lifecycle Findings
- System bootstrap checks database availability (`db.ping()`), runs system migrations (`runSystemMigrations()`), loads settings from `_settings`, preheats `_collectionCache`, and validates JWT secret strength (minimum 32 characters).
- Reset and graceful termination properly checkpoint WAL files (on SQLite) and close connection pools (PostgreSQL/MongoDB).

---

## 6. Database Status Audit

### Provider Architecture
The database layer adheres to a strict contract suite (`src/tools/database/contracts/contract-suite.ts`):
- **SQLite:** WAL mode enabled, synchronous query execution via `better-sqlite3`, native JSON operations, transaction isolation.
- **PostgreSQL / Neon:** Connection pooling via `pg` or `@neondatabase/serverless`, asynchronous execution, parameterized SQL translation from `?` to `$n`.
- **MongoDB:** Complete document-oriented emulation with BSON canonicalization, schema translation, and query translation.

### Capability Isolation
Capabilities are strictly declared in `src/tools/database/capabilities.ts` and queried via `app.db().getDriver().capabilities`:
- Features requiring database-level capabilities (e.g., `vector_cosine_similarity` in SQLite) throw clear error messages when executed on unsupported providers.

---

## 7. API Status & Endpoint Contract Audit

Every public endpoint in `src/apis/` was audited for authentication, authorization, envelope format, error handling, and parameter acceptance:

### Public Endpoint Directory

| Method | Path | Auth Required | Parameters / Body | Response Status & Shape | Error Status & Shape | Contract Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None (Public) | None | `200` `{ status: 'ok' }` or Admin diagnostic | `503` `{ code: 503, message }` | **Stable** |
| `GET` | `/api/installer/check` | None | None | `200` `{ installed: boolean }` | `500` `{ code: 500, message }` | **Stable** |
| `POST` | `/api/installer` | None | `{ email, password, passwordConfirm }` | `200` `{ code: 200, message }` | `400`/`403`/`500` | **Stable** |
| `POST` | `/api/admins/auth-with-password` | None | `{ identity, password }` | `200` `{ token, admin: { id, email } }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/admins/refresh` | Superuser | Header `Authorization: Bearer <token>` | `200` `{ token, admin: { id, email } }` | `401`/`500` | **Stable** |
| `POST` | `/api/admins/request-password-reset` | None | `{ email }` | `200` `{ code: 200, message }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/admins/confirm-password-reset` | None | `{ token, password, passwordConfirm }` | `200` `{ code: 200, message }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/auth-with-password` | None | `{ identity, password }` | `200` `{ token, record }` or `{ mfaRequired, mfaId, token }` | `400`/`403`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/auth-with-oauth2` | None | `{ provider, code, codeVerifier, redirectURL, state, createData }` | `200` `{ token, record, meta: { isNew } }` | `400`/`403`/`500` | **Stable** |
| `POST` | `/api/collections/:c/request-otp` | None | `{ email }` | `200` `{ otpId }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/auth-with-otp` | None | `{ otpId, password }` | `200` `{ token, record }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/refresh` | Record Auth | `{ token }` (or Header) | `200` `{ token }` | `400`/`401`/`500` | **Stable** |
| `POST` | `/api/collections/:c/mfa/setup` | Record Auth | Header `Authorization` | `200` `{ secret, backupCodes, qrURL }` | `401`/`404`/`500` | **Stable** |
| `POST` | `/api/collections/:c/mfa/verify` | Record/MFA Auth | `{ code }` + Header `Authorization` | `200` `{ verified: true, token?, record? }` | `400`/`401`/`404`/`500` | **Stable** |
| `GET` | `/api/collections/:c/methods` | None | None | `200` `{ authMethods, mfa, otp }` | `500` | **Stable** |
| `GET` | `/api/collections/:c/external-auths` | Record Auth | Header `Authorization` | `200` `Array<ExternalAuth>` | `400`/`401`/`500` | **Stable** |
| `POST` | `/api/collections/:c/request-password-reset` | None | `{ email }` | `200` `{ code: 200, message }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/confirm-password-reset` | None | `{ token, password, passwordConfirm }` | `200` `{ code: 200, message }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/request-verification` | None | `{ email }` | `200` `{ code: 200, message }` | `400`/`429`/`500` | **Stable** |
| `POST` | `/api/collections/:c/confirm-verification` | None | `{ token }` | `200` `{ code: 200, message }` | `400`/`500` | **Stable** |
| `POST` | `/api/collections/:c/request-email-change` | Record Auth | `{ newEmail }` + Header | `200` `{ code: 200, message }` | `400`/`401`/`500` | **Stable** |
| `POST` | `/api/collections/:c/confirm-email-change` | None | `{ token }` | `200` `{ code: 200, message }` | `400`/`500` | **Stable** |
| `POST` | `/api/collections/:c/impersonate/:recordId` | Superuser | Header `Authorization` | `200` `{ token, record }` | `400`/`403`/`404`/`500` | **Stable** |
| `GET` | `/api/collections` | Superuser | None | `200` `PaginatedResponse<Collection>` | `403`/`500` | **Stable** |
| `POST` | `/api/collections` | Superuser | Collection schema body | `201` `Collection` | `400`/`403`/`500` | **Stable** |
| `GET` | `/api/collections/:idOrName` | Superuser | None | `200` `Collection` | `403`/`404`/`500` | **Stable** |
| `PATCH` | `/api/collections/:idOrName` | Superuser | Partial collection schema body | `200` `Collection` | `400`/`403`/`404`/`500` | **Stable** |
| `DELETE` | `/api/collections/:idOrName` | Superuser | None | `204` No Content | `403`/`404`/`500` | **Stable** |
| `POST` | `/api/collections/import` | Superuser | `{ collections: Collection[] }` | `200` `{ imported: string[] }` | `400`/`403`/`500` | **Stable** |
| `POST` | `/api/collections/export` | Superuser | None | `200` `Collection[]` | `403`/`500` | **Stable** |
| `GET` | `/api/collections/:c/records` | `listRule` | `?page=&perPage=&filter=&sort=&expand=&fields=` | `200` `PaginatedResponse<Record>` | `404`/`500` | **Unstable (Authz count leak)** |
| `GET` | `/api/collections/:c/records/:id` | `viewRule` | `?expand=&fields=` | `200` `Record` | `404`/`500` | **Stable** |
| `POST` | `/api/collections/:c/records` | `createRule` | Record data body | `201` `Record` or `{ token, record }` | `400`/`403`/`404`/`500` | **Stable** |
| `PATCH` | `/api/collections/:c/records/:id` | `updateRule` | Partial record data body | `200` `Record` | `400`/`403`/`404`/`500` | **Stable** |
| `DELETE` | `/api/collections/:c/records/:id` | `deleteRule` | None | `204` No Content | `403`/`404`/`500` | **Stable** |
| `POST` | `/api/collections/:c/vector-search` | `listRule` | `{ field, vector, limit, minSimilarity }` | `200` `{ items: Record[] }` | `400`/`404`/`500` | **Stable** |
| `POST` | `/api/files/token` | Record Auth | `{ collection, recordId, filename }` | `200` `{ token }` | `400`/`403`/`404`/`500` | **Stable** |
| `GET` | `/api/files/:c/:recordId/:filename`| Public / Token| `?token=&thumb=&download=` | `200` File stream | `403`/`404`/`500` | **Stable** |
| `POST` | `/api/collections/:c/records/:id/files`| Superuser | `multipart/form-data` | `200` `{ files, thumbs }` | `400`/`403`/`404`/`500` | **Stable** |
| `GET` | `/api/realtime` | None | `?clientId=` (Accept: `text/event-stream`) | `200` SSE stream / endpoint info | `500` | **Unstable (Topic drift)** |
| `POST` | `/api/realtime` | None | `{ clientId, subscriptions: [{ action, channel }] }` | `200` `{ clientId, subscriptions }` | `400`/`403`/`500` | **Unstable (Topic drift)** |
| `WS` | `/api/realtime` | None | WebSocket connection | Connected handshake | Protocol error | **Unstable (Broadcast authz leak)** |
| `POST` | `/api/batch` | Superuser | `{ requests: BatchRequest[] }` | `200` `BatchResponse[]` | `400`/`403`/`500` | **Stable** |
| `GET` | `/api/settings` | Superuser | None | `200` `AppSettings` | `403`/`500` | **Stable** |
| `PATCH` | `/api/settings` | Superuser | Partial `AppSettings` | `200` `AppSettings` | `403`/`500` | **Stable** |
| `POST` | `/api/backups` | Superuser | `{ name? }` | `200` `{ code: 200, data }` | `400`/`409`/`429`/`500` | **Server-Internal** |
| `GET` | `/api/logs` | Superuser | `?page=&perPage=&level=` | `200` `PaginatedResponse<LogEntry>` | `403`/`500` | **Server-Internal** |

---

## 8. Error Model Audit

### Evidence: Canonical Error vs Ad-Hoc Shapes
The repository defines a canonical contract in `src/core/contracts/api_contracts.ts`:
```typescript
export interface ApiError {
  code: number
  status: ApiErrorStatus
  message: string
  errors?: Array<{ field: string; message: string; code?: string }>
  data?: {
    fieldErrors?: Record<string, { code: string; message: string }>
    retryAfter?: number
    [key: string]: any
  }
}
```
And provides builder/normalization helpers in `src/utils/api_errors.ts`:
- `createApiError(code, status, message, data)`
- `normalizeDatabaseError(err)` (maps unique constraints to `400 VALIDATION_FAILED`, FK errors to `400 VALIDATION_FAILED`, etc.)

### Inconsistent Error Sites Found
While `record_crud.ts` and contract tests use `createApiError()`, several route handlers return raw legacy objects without `status`:
1. `src/apis/admin_auth.ts:L52, L62, L69, L89`: returns `{ code: 400, message: 'Invalid credentials.' }` without `status: 'UNAUTHORIZED'`.
2. `src/apis/middlewares_auth.ts:L119, L128, L138, L147`: returns `{ code: 401, message: 'Authentication required.' }` without `status`.
3. `src/apis/auth_flows.ts:L41, L84, L94`: returns `{ code: 400, message: ... }` without `status`.
4. `src/apis/collection.ts:L48, L116`: returns `{ code: 404, message: 'Collection not found.' }` without `status`.
5. `src/apis/batch.ts:L25, L30, L34`: returns `{ code: 400, message: ... }` without `status`.

### Recommendation
Every error response emitted across the entire API must pass through `sendApiError()` / `createApiError()` to guarantee that `@solarch/core-client` can parse errors deterministically via `err.status` without regex parsing.

---

## 9. Query Contract Audit

### Filter Parser & SQL Compiler Evaluation
- **Filter Syntax:** `@request.auth.id`, `field = 'value'`, `age >= 18`, `title ~ 'solarch'`, `tags ?= 'news'`, `&&`, `||`, `!(...)`.
- **AST Generation (`src/tools/search/filter.ts`):** `parseFilter()` transforms string expressions into a deterministic tree (`FilterAST`).
- **Dialect Compilers:**
  - SQLite: `SQLiteDialect.compileFilter()` outputs positional `?` parameters and SQLite functions.
  - PostgreSQL: `PostgresDialect.compileFilter()` outputs standard SQL, later translated to `$1, $2, ...`.
  - MongoDB: `MongoDialect.compileFilter()` converts `FilterAST` into a native MongoDB query document.
- **SQL Safety:** All field identifiers in queries are validated through `validateIdentifier()` in `src/utils/sql_safe.ts` preventing SQL injection.

### Can FilterAST Become a Public SDK Abstraction?
**YES.** The `FilterAST` structure is provider-agnostic and clean. `@solarch/core-client` can safely support both raw filter strings (e.g. `client.collection('posts').getList({ filter: 'views > 100' })`) and fluent query builders that serialize into the same grammar.

---

## 10. Pagination Audit

### Critical Semantic Finding: Pre-Authz Count Information Leak

```
FILE: src/apis/record_crud.ts
FUNCTION: recordRouter.get('/')
CURRENT BEHAVIOR:
  1. findAllRecords(app, collection, { page, perPage, filter, sort }) executes SQL SELECT COUNT(*) on table.
  2. totalItems and totalPages are assigned directly from database count.
  3. items are sliced by LIMIT/OFFSET in database query.
  4. In application memory, items are filtered against canAccessRecord(..., collection.listRule).
  5. The response returns { page, perPage, totalItems, totalPages, items: accessibleItems }.

EXPECTED BEHAVIOR:
  - If a user lacks permission to view records, totalItems and totalPages must reflect the accessible set, or rule filtering must be compiled into the query WHERE clause so database LIMIT/OFFSET and COUNT(*) are accurate.
  - If collection.listRule is null (locked), totalItems must be 0, not the full database row count.

IMPACT:
  1. Information Leak: Unauthorized users can discover the exact number of records in private collections.
  2. Broken Pagination: A user requesting page 1 might receive 2 items out of perPage=30 because 28 items were stripped in memory, while totalPages indicates 10 pages, causing clients to iterate over empty pages.

SEVERITY: P1 (Blocks Core-Client)
```

---

## 11. Serialization Audit

### Complete 14-Field Type Matrix

| Field Type | Server Memory Value | Database Storage Value | Wire JSON Value | Client Typed Representation | Null Semantics | Default Value |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | `TEXT` / `VARCHAR` | `string` | `string` | `null` allowed if not required | `""` |
| `number` | `number` | `REAL` / `NUMERIC` | `number` | `number` | `null` allowed | `0` |
| `bool` | `boolean` | `INTEGER (0/1)` / `BOOLEAN` | `boolean` | `boolean` | `null` -> `false` | `false` |
| `email` | `string` | `TEXT` | `string` | `string` | `null` allowed | `""` |
| `url` | `string` | `TEXT` | `string` | `string` | `null` allowed | `""` |
| `date` | `string` (ISO 8601) | `TEXT` / `TIMESTAMPTZ` | `string` | `string` | `null` allowed | `""` |
| `select` | `string` or `string[]` | `TEXT` / `JSON` | `string` or `string[]` | `string \| string[]` | `null` allowed | `""` or `[]` |
| `file` | `string` or `string[]` | `TEXT` / `JSON` | `string` or `string[]` | `string \| string[]` | `null` allowed | `""` or `[]` |
| `relation` | `string` or `string[]` | `TEXT` / `JSON` | `string` or `string[]` | `string \| string[]` | `null` allowed | `""` or `[]` |
| `json` | `Record<string, any>` | `TEXT` / `JSONB` | `object` / `array` | `T` (Generic JSON) | `null` allowed | `{}` |
| `editor` | `string` (HTML/MD) | `TEXT` | `string` | `string` | `null` allowed | `""` |
| `autodate` | `string` (ISO 8601) | `TEXT` / `TIMESTAMPTZ` | `string` | `string` | Never null | Server generated |
| `geoPoint` | `{ lat: number, lng: number }` | `TEXT` / `JSON` | `{ lat, lng }` | `{ lat: number, lng: number }` | `null` allowed | `null` |
| `vector` | `number[]` | `TEXT` / `JSON` | `number[]` | `number[]` | `null` allowed | `[]` |

### Sensitive Field Protection
Verified in `src/apis/record_helpers.ts` and `src/core/base.ts`:
- `passwordHash`: Strictly hidden across all serializers and cannot be injected via request bodies.
- `lastResetSentAt`, `lastVerificationSentAt`: Stripped from public responses.
- `email`: Stripped for non-admin viewers when `emailVisibility === false`.

---

## 12. Authentication Audit

### Authentication Flows Summary

```
   [User Request]
         │
         ├───► Email/Username + Password ───► /api/collections/:c/auth-with-password
         │                                       │
         │                                       ├──► Argon2id / Bcrypt check
         │                                       ├──► MFA Check (returns mfaRequired + short token)
         │                                       └──► Returns { token, record } (720h JWT)
         │
         ├───► OAuth2 (Google/GitHub/Discord) ─► /api/collections/:c/auth-with-oauth2
         │                                       └──► State + PKCE validation -> returns { token, record, meta }
         │
         ├───► OTP Email Flow ────────────────► /api/collections/:c/request-otp -> /auth-with-otp
         │                                       └──► 6-digit cryptographic hash comparison
         │
         ├───► MFA / TOTP ────────────────────► /api/collections/:c/mfa/setup -> /mfa/verify
         │                                       └──► HMAC-SHA1 TOTP verification
         │
         └───► Superuser Admin Login ─────────► /api/admins/auth-with-password
                                                 └──► Rate limited -> returns { token, admin }
```

### Identity Model Finding: Admin JWT Verification
```
FILE: src/apis/middlewares_auth.ts
FUNCTION: loadAuthToken()
CURRENT BEHAVIOR:
  Lines 87-90:
  if (payload.isAdmin) {
    setAuthContext(req, null, true, token)
    return next()
  }

EXPECTED BEHAVIOR:
  Admin status must require payload.type === 'admin' and verification that the admin account still exists in _superusers (lines 104-109) and that the token is not revoked. Simply checking payload.isAdmin creates potential identity confusion.

SEVERITY: P1 (Blocks Core-Client)
```

---

## 13. Authorization Audit

### Principal Resolution
Every protected request establishes an `authContext`:
- `Principal`: Superuser Admin (`isAdmin = true`), Auth Record (`record: PBRecord`), or Guest (`auth = null`).
- `RecordFieldResolver` (`src/core/record_field_resolver.ts`): Exposes `@request.auth.*`, `@request.headers.*`, `@request.query.*`, `@request.data.*`, and record fields into rules expressions.
- Rules are evaluated synchronously or asynchronously without database leakages during evaluation.
- Admin requests bypass collection and record rules as intended.

---

## 14. File Storage Contract Audit

### Implementation Assessment
- **Drivers:** `LocalBlobDriver` stores files under `pb_data/storage/<collectionName>/<recordId>/<filename>`; `S3BlobDriver` supports S3 / MinIO using AWS SigV4 signed requests.
- **MIME & Magic Byte Verification:** Detects actual magic bytes (`ffd8ffe0` for JPEG, `89504e47` for PNG, `25504446` for PDF) to prevent malicious extension spoofing.
- **Path Traversal Protection:** `assertPathSafe()` guarantees uploaded and retrieved paths stay within the designated storage sandbox.
- **Protected File Tokens:** Public access to protected files requires a signed JWT token generated via `/api/files/token` with 1-hour validity.
- **Image Thumbnails:** On-the-fly thumbnail generation via `sharp` cached alongside originals.

---

## 15. Realtime Subsystem Audit

### Transport & Protocol Findings

1. **Transport Guarantees:**
   - WebSocket (`ws://<host>:<port>/api/realtime`): Full-duplex connection.
   - Server-Sent Events (`http://<host>:<port>/api/realtime` with `Accept: text/event-stream`): Unidirectional streaming.
   - Heartbeat: Handles `{ type: 'ping' }` -> `{ type: 'pong', timestamp: number }`.
   - Handshake: Emits `{ type: 'connected', clientId: string, protocolVersion: '1.0', authenticated: boolean }`.

2. **Critical Defect: Realtime Authorization Leak Across Broadcast**
```
FILE: src/apis/realtime.ts
FUNCTION: broadcastRecordEvent() & broadcastRealtimeEvent()
CURRENT BEHAVIOR:
  When a record is created/updated/deleted, broadcastRecordEvent sends the entire record payload to the topic channel `collections.<id>.records`.
  All clients connected to that channel receive the raw event payload regardless of their individual read permissions on that specific record.

EXPECTED BEHAVIOR:
  Realtime events must either:
  a) Evaluate the collection's viewRule against each subscriber's identity before delivery, or
  b) Emit only minimal change notifications (e.g. { action, id, collectionId }) prompting clients to fetch the record through authorized REST endpoints.

IMPACT:
  A user with view access to public records in a collection receives private records of other users via realtime push notifications.

SEVERITY: P0 (Critical Security Blocker)
```

3. **Offline Sync Status in Realtime:**
   - There is currently **NO sequence numbering, event replay buffer, or cursor mechanism**. Realtime is purely ephemeral pub/sub. Offline sync engines must NOT assume message replay exists on the current server.

---

## 16. Lifecycle Hooks & Events Audit

- `Hook<T>` & `TaggedHook<T>` (`src/tools/hook/hook.ts`) provide synchronous and asynchronous event listeners.
- **Supported Hooks:**
  - App Lifecycle: `onBootstrap`, `onServe`, `onTerminate`
  - Backups: `onBackupCreate`, `onBackupRestore`
  - Models: `onModelValidate`, `onModelCreate`, `onModelUpdate`, `onModelDelete` (+ Execute and AfterSuccess/Error)
  - Records: `onRecordEnrich`, `onRecordValidate`, `onRecordCreate`, `onRecordUpdate`, `onRecordDelete` (+ AfterSuccess/Error)
  - Collections: `onCollectionValidate`, `onCollectionCreate`, `onCollectionUpdate`, `onCollectionDelete` (+ AfterSuccess/Error)
- **Status:** Stable and server-internal. These hooks should NOT be exposed directly as public client SDK APIs.

---

## 17. Schema & Migration Audit

### Inconsistency Finding: Migration Table Name Mismatch
```
FILE 1: src/core/base.ts (line 495)
CODE: CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied TEXT NOT NULL)

FILE 2: src/core/migration.ts (lines 27-33)
CODE: CREATE TABLE IF NOT EXISTS _applied_migrations (id TEXT PRIMARY KEY, applied TEXT NOT NULL)

IMPACT:
  BaseApp migrations and MigrationRunner check different tables. A migration recorded by one subsystem is invisible to the other.

SEVERITY: P2 (Blocker for Migration Subsystem)
RECOMMENDATION: Unify canonical migration table name to `_applied_migrations` across both files.
```

---

## 18. AI Subsystem Audit

- **Providers:** OpenAI (`OpenAIProvider`), Anthropic (`AnthropicProvider`), Ollama (`OllamaProvider`), OpenRouter (`OpenAIProvider` with custom baseURL).
- **Capabilities:** Schema generation from English prompt (`generateCollection`), Rule generation (`generateRule`), Mock data seeding (`seedRecords`), Developer assistance chat (`chat`).
- **Security:** All `/api/ai/*` routes require Superuser Authentication (`requireSuperuserAuth`).
- **SDK Classification:** Server-Internal / Admin feature. Not part of core client SDK.

---

## 19. JSVM & Sandbox Audit

- **Execution Engine:** `JSVM` (`src/tools/jsvm/jsvm.ts`).
- **Sandbox Modes:**
  - `legacy`: Node.js `vm.Script` with sandboxed context (for operator-trusted `pb_hooks/*.js` files).
  - `isolated`: Deno subprocess (`deno run --deny-net --deny-read --deny-write --deny-env --deny-run --deny-ffi`) with 64MB V8 memory limit and 5-second execution timeout.
- **Status:** Server-Internal. Fully verified by 54 passing sandbox tests.

---

## 20. Admin Frontend Audit

### Component Architecture
- Built with React 18, Vite 6, TailwindCSS, Lucide icons, and Radix UI primitives.
- API Client (`admin/src/api/client.ts`): Raw `fetch` wrapper storing JWT in `localStorage` under `tb_admin_auth`.
- **Pages:** `Dashboard`, `Collections`, `CollectionDetail`, `Records`, `RecordDetail`, `Settings`, `Logs`, `Backups`, `AIAssistant`, `Login`.
- **Finding:** The Admin UI currently duplicates types and API calls inline rather than using a typed SDK. Once `@solarch/core-client` is implemented, `admin/src/api/client.ts` should be replaced by `@solarch/core-client`.

---

## 21. Security Audit Findings

| ID | Finding Description | Affected File & Symbol | Severity | Status |
| :--- | :--- | :--- | :---: | :--- |
| **SEC-01** | Realtime broadcast leaks unauthorized record data across subscribers | `src/apis/realtime.ts` (`broadcastRecordEvent`) | **P0** | **BLOCKS CORE-CLIENT** |
| **SEC-02** | List pagination calculates `totalItems` before rule filtering | `src/apis/record_crud.ts` (`recordRouter.get`) | **P1** | **BLOCKS CORE-CLIENT** |
| **SEC-03** | Admin token authentication allows unverified `payload.isAdmin` check | `src/apis/middlewares_auth.ts` (`loadAuthToken`) | **P1** | **BLOCKS CORE-CLIENT** |
| **SEC-04** | Realtime subscription topic naming inconsistency breaks subscriptions | `src/apis/realtime.ts` (`canSubscribeToChannel`) | **P1** | **BLOCKS CORE-CLIENT** |
| **SEC-05** | Migration tracking table name mismatch (`_migrations` vs `_applied_migrations`) | `src/core/base.ts` vs `src/core/migration.ts` | **P2** | **BLOCKS CORE-CLIENT** |
| **SEC-06** | Rate limiting on admin & auth endpoints verified working (Brute-force lockout) | `src/utils/lockout.ts`, `src/apis/admin_auth.ts` | **P3** | **VERIFIED / SAFE** |
| **SEC-07** | SQL identifier sanitization prevents DDL/DML injection across all drivers | `src/utils/sql_safe.ts` (`validateIdentifier`) | **P3** | **VERIFIED / SAFE** |
| **SEC-08** | Sensitive secrets masking in logs and connection strings | `src/utils/secret_mask.ts`, `src/core/base.ts` | **P3** | **VERIFIED / SAFE** |

---

## 22. Test Architecture Audit

### Existing Test Suite Breakdown
- **Total Test Files:** 29 (27 run, 2 skipped pending external PG/Neon databases).
- **Total Tests:** 342 (275 passed, 65 skipped).
- **Categories Covered:**
  - Unit: `config_resolution.test.ts`, `sql_injection.test.ts`, `jsvm_sandbox.test.ts` (54 tests).
  - Contract: `sqlite.contract.test.ts`, `mongodb.contract.test.ts`, `postgres.contract.test.ts`, `neon.contract.test.ts`, `error_envelope.contract.test.ts`, `pagination_semantics.contract.test.ts`, `serialization_matrix.contract.test.ts`, `realtime_protocol.contract.test.ts`, `cross_surface_authz.contract.test.ts`, `auth_lifecycle.contract.test.ts`.
  - Integration: `admin_auth.test.ts`, `record_auth.test.ts`, `auth_flows.test.ts`, `auth_middleware.test.ts`, `backup.test.ts`, `security.test.ts`, `new_issue.test.ts`.

---

## 23. Documentation Drift

| Area | Documentation Claim | Source Code Reality | Discrepancy Severity |
| :--- | :--- | :--- | :---: |
| **Realtime Topics** | `docs/features/realtime.md` claims topics are `posts`, `posts/rec123`, `*` | Code in `src/apis/realtime.ts:L113` only accepts `collections.<id>.records` | **HIGH** |
| **WebSocket WS Endpoint** | `docs-verified/realtime.md` claims endpoint is `/ws?token=...` | Code in `src/apis/serve.ts:L184` mounts WebSocket on `/api/realtime` | **HIGH** |
| **WS Message Schema** | `docs-verified/realtime.md` claims `{ type: 'subscribe', channel: 'posts' }` | Code in `src/apis/realtime.ts:L197` expects `{ type: 'subscribe', channels: [...] }` | **MEDIUM** |
| **Admin REST API Table** | `docs/reference/rest-api.md` lists `/api/collections/:c/records` as public | Handlers enforce `listRule`, `createRule`, etc. correctly | **LOW** |

---

## 24. Cross-Platform Compatibility Evaluation

`@solarch/core-client` will target Web (browser), React Native, Tauri, and Electron:

| Platform | Pure Fetch Support | WebSocket Support | Local Storage / Secure Storage | Node.js Free | Ready for SDK? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Web Browser** | YES | YES | `localStorage` / `sessionStorage` | YES | **READY** |
| **React Native** | YES | YES | `AsyncStorage` / `Expo.SecureStore` | YES | **READY** |
| **Tauri** | YES | YES | Tauri Plugin Store / Local Storage | YES | **READY** |
| **Electron** | YES | YES | Local Storage / IndexedDB | YES | **READY** |

**Boundary Rule:** `@solarch/core-client` must rely strictly on standard `fetch`, standard `WebSocket`, and an injectable `StorageAdapter`. It must contain **zero Node.js dependencies** (`fs`, `crypto`, `path`, `child_process`).

---

## 25. Offline Readiness Audit

The current server contract provides the following offline sync primitives:
- **Stable Record IDs:** 15-character hex/alphanumeric strings generated client-side or server-side.
- **ISO 8601 Timestamps:** `created` and `updated` fields on every record.
- **Atomic Batch Mutation:** `/api/batch` supports multiple operations in a single transactional request.

**Missing for Full Offline Sync (Post-Core-Client):**
- Monotonic record revision numbers (`version` or `_v`).
- Server-side mutation tombstone tracking for deleted records.
- Event sequence IDs or cursor-based change logs.
- Client-side conflict resolution semantics.

---

## 26. Agent & MCP Readiness Audit

Solarch provides a clean candidate operational boundary for Future DeepAgents / Model Context Protocol (MCP) servers:
- **Tool Mapping:**
  - `collection_list_records` -> `GET /api/collections/:c/records`
  - `collection_get_record` -> `GET /api/collections/:c/records/:id`
  - `collection_create_record` -> `POST /api/collections/:c/records`
  - `collection_update_record` -> `PATCH /api/collections/:c/records/:id`
  - `collection_delete_record` -> `DELETE /api/collections/:c/records/:id`
  - `collection_vector_search` -> `POST /api/collections/:c/vector-search`
- **Principal & Auditing:** Agent operations can authenticate via standard API key or JWT, with all operations logging to `_logs` and obeying collection authorization rules.

---

## 27. SDK Public Boundary vs Server-Internal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       @solarch/core-client BOUNDARY                         │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │   AuthService         │  │   CollectionService   │  │  RecordService  │  │
│  │  - authWithPassword   │  │  - getList / getOne   │  │  - getList      │  │
│  │  - authWithOAuth2     │  │  - create / update    │  │  - getOne       │  │
│  │  - requestOTP/authOTP │  │  - delete             │  │  - create/update│  │
│  │  - mfaSetup/mfaVerify │  │  - import / export    │  │  - delete       │  │
│  │  - refresh / logout   │  └───────────────────────┘  │  - vectorSearch │  │
│  └───────────────────────┘                             └─────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │   FileService         │  │   RealtimeService     │  │  BatchService   │  │
│  │  - getFileUrl         │  │  - subscribe          │  │  - send         │  │
│  │  - getFileToken       │  │  - unsubscribe        │  │                 │  │
│  │  - uploadFiles        │  │  - on(event)          │  │                 │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │ (HTTP / WebSocket JSON Wire Protocol)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER-INTERNAL (FROZEN)                           │
│                                                                             │
│  - DatabaseDriver (SQLiteDriver, PostgreSQLDriver, NeonConnection, Mongo)  │
│  - Deno Subprocess Sandbox / Node VM execution                             │
│  - SettingsEncryption (AES-256-GCM server-side key)                         │
│  - File Blob Drivers (Local filesystem storage, S3 AWS SigV4)               │
│  - MigrationRunner & Schema Synchronization                                 │
│  - Lifecycle Hooks & TaggedHook Dispatcher                                  │
│  - AI Service & LLM Provider Implementations                               │
│  - Point-in-time Streaming Zip Backups                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 28. Blockers for `@solarch/core-client`

The following 5 issues are hard blockers that must be resolved before implementing `@solarch/core-client`:

1. **[BLOCKER-1] Realtime Broadcast Authorization:** Must prevent broadcasting private record payloads to unauthorized channel subscribers.
2. **[BLOCKER-2] Pagination Count Leak:** `totalItems` / `totalPages` must not leak private record counts when `listRule` restricts visibility.
3. **[BLOCKER-3] Realtime Topic & Channel Normalization:** Unify topic naming to accept both `<collectionName>` and `<collectionId>` consistently across SSE and WebSocket.
4. **[BLOCKER-4] Canonical Error Envelope Enforcement:** Ensure all route error handlers return standard `ApiError` (`{ code, status, message, errors?, data? }`).
5. **[BLOCKER-5] Migration Table Name Unification:** Synchronize `_applied_migrations` across `base.ts` and `migration.ts`.

---

## 29. Non-Blockers (Safe to Defer Post-Client)

The following items do not affect the public client contract and can safely be implemented after `@solarch/core-client`:
- Offline Sync Engine (conflict resolution, tombstone tables).
- DeepAgents & Model Context Protocol (MCP) Server.
- Admin UI migration to `@solarch/core-client`.
- Additional database drivers (e.g. MySQL).
- Advanced AI features and streaming agent workflows.

---

## 30. Recommended Execution Order

```
[Phase 1-3: Contract & Error Cleanup]
         │
         ▼
[Phase 4-5: Query, Pagination & Serialization Fixes]
         │
         ▼
[Phase 6-7: Auth & Authorization Security Hardening]
         │
         ▼
[Phase 8-9: File & Realtime Protocol Normalization]
         │
         ▼
[Phase 10-14: Verification, Security & Regression Suite]
         │
         ▼
[Phase 15: BEGIN @solarch/core-client IMPLEMENTATION]
```
