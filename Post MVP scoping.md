# Architectural Red-Teaming Report: Post-MVP SDK Ecosystem & Core-Client

**Target Scope**: Solarch Codebase (`/Users/jay/Downloads/solarch`)  
**Methodology**: Inversion & Failure Mode Analysis (Working backward from 6-month production failures)  

---

## 1. CORE-CLIENT AUTH/TOKEN MODEL

### (a) Actual Code Findings
* **Dual Auth Subsystems & Asymmetric Protocols**:
  * **Superuser Auth**: Defined in [`src/apis/admin_auth.ts`](file:///Users/jay/Downloads/solarch/src/apis/admin_auth.ts#L81-L85). Issued payload is `{ id: row.id, type: 'admin' }`. Refresh endpoint `POST /api/admins/refresh` ([line 95](file:///Users/jay/Downloads/solarch/src/apis/admin_auth.ts#L95)) reads the old token exclusively from the `Authorization: Bearer <token>` HTTP header ([line 97](file:///Users/jay/Downloads/solarch/src/apis/admin_auth.ts#L97)) and revokes using tag `'admin_refresh'`.
  * **Record User Auth**: Defined in [`src/apis/record_auth.ts`](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L134-L138). Issued payload is `{ id: record.id, type: 'auth', collectionId: collection.id }`. Refresh endpoint `POST /api/collections/:collectionIdOrName/refresh` ([line 367](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L367)) reads the old token from the request **JSON body** `{ token: string }` ([line 369](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L369)), NOT from the `Authorization` header, and revokes using tag `'refresh'`.
* **Rigid Token Revocation Window**:
  * In both refresh endpoints, [`app.revokeToken(token, tag, id, 5)`](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L384) invalidates the old JWT after a strict 5-second window. In mobile/desktop SDKs with poor network connectivity, retried requests during token refresh cause instant session invalidation.
* **Single-Origin & Single-Platform Assumptions**:
  * CORS config in [`src/apis/middlewares_cors.ts`](file:///Users/jay/Downloads/solarch/src/apis/middlewares_cors.ts#L5-L14) relies on `process.env.CORS_ALLOWED_ORIGINS` or defaults to `origin: false` in production ([line 13](file:///Users/jay/Downloads/solarch/src/apis/middlewares_cors.ts#L13)).
  * Admin frontend in [`admin/src/App.tsx`](file:///Users/jay/Downloads/solarch/admin/src/App.tsx#L21) hardcodes session persistence to `localStorage.getItem('tb_admin_auth')`, which does not exist in non-browser environments like React Native or Node.js agent runners.

### (b) Failure Plausibility: YES
The assumed failure is highly plausible. Extracting a uniform `core-client` will immediately fail because Superuser and Record user auth flows use contradictory transport semantics (HTTP Header vs. JSON Body), incompatible payload schemas (`collectionId` required for record users, absent for superusers), and brittle 5-second token revocation windows that break under mobile or desktop network jitter.

### (c) Smallest Concrete Mitigation
Standardize both refresh endpoints in `admin_auth.ts` and `record_auth.ts` to accept tokens from either the `Authorization` header or JSON body, unify the token payload structure across identities, and make the token revocation grace window configurable in `BaseAppConfig`.

---

## 2. REALTIME / SUBSCRIPTION BROKER AT MULTI-CLIENT SCALE

### (a) Actual Code Findings
* **In-Memory Volatile State**:
  * [`src/tools/subscriptions/broker.ts`](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L15-L18) initializes state as raw process memory maps: `private clients: Map<string, Client>` and `private channels: Map<string, Set<string>>`.
* **Zero Resource Quotas**:
  * Neither `addClient()` ([broker.ts:19](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L19)) nor `subscribe()` ([broker.ts:36](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L36)) enforces any limit on the number of open connections or channels per IP/user.
* **Zero Message Persistence or Replay**:
  * In [`src/apis/realtime.ts`](file:///Users/jay/Downloads/solarch/src/apis/realtime.ts#L238-L260), `broadcastRecordEvent()` immediately serializes and sends events to connected sockets via `broker.send()`. No message log, sequence IDs, or offset buffers exist. When a connection drops or Solarch restarts, missed events are permanently lost.
* **Single-Instance Lock-In**:
  * [`src/apis/realtime.ts`](file:///Users/jay/Downloads/solarch/src/apis/realtime.ts#L10) instantiates a single process-local broker instance (`const broker = new Broker()`). It cannot communicate with other process instances via Redis or IPC.

### (b) Failure Plausibility: YES
The assumed failure is guaranteed if scaled. Connecting multiple SDK client types (Electron, Tauri, React Native, Agent, Web) against a single instance will trigger unbounded memory growth. Server restarts or transient network drops will silently drop events without recovery options, and horizontal scaling is impossible without rewriting the broker.

### (c) Smallest Concrete Mitigation
Add explicit connection and channel limits per client in `Broker`, implement monotonic event sequence numbers with an in-memory ring buffer (e.g., last 1000 events) for reconnect replay, and extract `Broker` behind an interface allowing a Redis Pub/Sub adapter.

---

## 3. SQLITE AS THE FOUNDATION FOR "DISTRIBUTED"

### (a) Actual Code Findings
* **Single-Node Local Driver**:
  * [`src/tools/database/sqlite-driver.ts`](file:///Users/jay/Downloads/solarch/src/tools/database/sqlite-driver.ts#L43-L50) initializes SQLite using local file bindings `new Database(path.join(dataDir, 'data.db'))` via `better-sqlite3` with `journal_mode = WAL`.
* **Zero Replication / Sync Primitives**:
  * A codebase-wide search across `src/` for `sync`, `replicate`, `conflict`, `crdt`, or `wal_stream` confirms **zero synchronization or replication code exists**.
  * There is no change data capture (CDC) log table, vector clock, delta stream, or conflict resolution handler anywhere in the system.

### (b) Failure Plausibility: YES
The assumed failure is an absolute architectural limitation today. SQLite is strictly single-node and file-locked on disk. If desktop SDKs (Electron/Tauri) or mobile SDKs (React Native) run local SQLite instances, Solarch provides no protocol or engine to sync state back to a central server.

### (c) Smallest Concrete Mitigation
Explicitly scope local desktop/mobile SDKs to operate strictly as online HTTP/WS API clients, OR create a system audit table (`_changes` with auto-incrementing sequence IDs and timestamps) in `data.db` to allow clients to fetch delta updates.

---

## 4. JSVM SANDBOX AS THE AGENT EXECUTION BACKEND

### (a) Actual Code Findings
* **Subprocess Spawning Overhead**:
  * [`src/tools/jsvm/deno_sandbox.ts`](file:///Users/jay/Downloads/solarch/src/tools/jsvm/deno_sandbox.ts#L158) executes sandbox requests by spawning a new OS process via `spawn(DENO_BINARY, args)` for *every single call*.
* **Code Injection Payload Mechanics**:
  * [`src/tools/jsvm/deno_sandbox.ts`](file:///Users/jay/Downloads/solarch/src/tools/jsvm/deno_sandbox.ts#L131-L134) embeds input code and context by regex-replacing the worker script text (`workerScript.replace(/^async function readStdin()...`) with Base64 payload strings prior to piping to Deno stdin.
* **Silent Unsafe Fallback**:
  * [`src/tools/jsvm/jsvm.ts`](file:///Users/jay/Downloads/solarch/src/tools/jsvm/jsvm.ts#L46-L49) logs a warning if `JSVM_SANDBOX_MODE=isolated` but Deno is not found, and **silently falls back to Node `vm.Script` execution**, which lacks process isolation against prototype pollution or heap contamination.
* **OS-Level Sandboxing Verification**:
  * [`src/tools/jsvm/deno_sandbox.ts`](file:///Users/jay/Downloads/solarch/src/tools/jsvm/deno_sandbox.ts#L136-L148) passes strict flags `--deny-net`, `--deny-read`, `--deny-write`, `--deny-env`, `--deny-run`, `--deny-ffi`, `--deny-hrtime`, and `--v8-flags=--max-old-space-size=64`. When Deno is present, process isolation is strong.

### (b) Failure Plausibility: PARTIALLY
The OS-level Deno flags provide genuine process security against host filesystem/network compromises. However, (1) spawning a new process per invocation introduces 100ms–300ms latency overhead per call, choking high-frequency AI agent loops, and (2) the silent fallback to Node `vm` in `jsvm.ts` introduces a severe vulnerability if Deno is missing in production environments.

### (c) Smallest Concrete Mitigation
Throw a hard fatal exception (never silently fall back to Node `vm`) when executing untrusted code if Deno is missing, and stream payloads into Deno worker processes via standard `stdin` rather than regex string replacement of source scripts.

---

## 5. MCP SERVER AUTH / BLAST RADIUS

### (a) Actual Code Findings
* **Binary Identity Model**:
  * [`src/apis/middlewares_auth.ts`](file:///Users/jay/Downloads/solarch/src/apis/middlewares_auth.ts#L36-L74) recognizes only two authorization identities:
    1. `isAdmin: true` (Superuser): Absolute unrestricted database & schema access.
    2. `record: PBRecord` (Collection User): Restricted strictly to a single user record within one specific collection.
* **No Service Accounts or Scoped API Keys**:
  * [`src/core/auth_models.ts`](file:///Users/jay/Downloads/solarch/src/core/auth_models.ts) defines models for `MFA`, `OTP`, `AuthOrigin`, and `ExternalAuth`, but has **no concept of API keys, service accounts, or granular permission scopes**.
* **Superuser Enforcement on Schema Routes**:
  * [`src/apis/collection.ts`](file:///Users/jay/Downloads/solarch/src/apis/collection.ts) protects all DDL collection operations using `requireSuperuserAuth(app)` ([middlewares_auth.ts:86](file:///Users/jay/Downloads/solarch/src/apis/middlewares_auth.ts#L86)).
  * Connecting an MCP server requires granting full Superuser rights, enabling an autonomous agent to drop tables, delete collections, or overwrite system settings without restriction.

### (b) Failure Plausibility: YES
The assumed failure is a direct vulnerability today. Because scoped API keys do not exist, an MCP server must execute with full Superuser privileges. A hallucinating or compromised AI agent will have unrestricted permission to wipe databases or corrupt collection definitions.

### (c) Smallest Concrete Mitigation
Implement a `_apiKeys` table containing scoped access tokens with explicit permission arrays (e.g., `["read:collections", "write:records:posts"]`, `deny:schema_drop`), and check key permissions within `middlewares_auth.ts`.

---

## 6. SCHEMA_SYNC UNDER CONCURRENT/AUTOMATED WRITES

### (a) Actual Code Findings
* **Un-Transactional DDL Sync**:
  * [`src/core/schema_sync.ts`](file:///Users/jay/Downloads/solarch/src/core/schema_sync.ts#L13-L58) executes `syncRecordTableSchema()` by fetching `PRAGMA table_info` ([line 28](file:///Users/jay/Downloads/solarch/src/core/schema_sync.ts#L28)) and iterating over missing columns issuing un-transactional `db.exec(ALTER TABLE ... ADD COLUMN ...)` calls ([line 42](file:///Users/jay/Downloads/solarch/src/core/schema_sync.ts#L42)).
* **Zero Locking or Schema Mutex**:
  * No in-memory or database-level lock protects schema synchronization against concurrent execution.
* **Zero Versioning / Optimistic Concurrency**:
  * [`src/core/collection.ts`](file:///Users/jay/Downloads/solarch/src/core/collection.ts) does not track a schema version counter or ETag.
  * If the AI schema generator and a CMS template import execute schema modifications simultaneously, both read stale column lists and issue conflicting `ALTER TABLE` statements, corrupting `_collections` JSON metadata relative to SQLite physical table schemas.

### (b) Failure Plausibility: YES
Concurrent automated writes to collection schemas will trigger race conditions, causing `_collections` metadata to desynchronize from actual SQLite table columns (`PRAGMA table_info`).

### (c) Smallest Concrete Mitigation
Wrap `syncRecordTableSchema()` and `save(collection)` inside a SQLite transaction secured by an in-memory schema mutex or an optimistic version lock (`version` field on `Collection`).

---

## 7. VERSIONING AND BREAKING CHANGES ACROSS SDKS

### (a) Actual Code Findings
* **Unversioned API Routes**:
  * [`src/apis/serve.ts`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts#L84-L101) mounts all routes directly under unversioned prefixes: `/api/health`, `/api/collections`, `/api/admins/...`, `/api/realtime`.
  * No API versioning headers (`Accept-Version`, `X-API-Version`) or path prefixes (`/api/v1/`) exist.
* **Missing Contract Verification Tests**:
  * Inspection of `src/apis/__tests__/` reveals tests for individual route logic, but **no OpenAPI or JSON-Schema contract validation tests** exist to detect breaking changes to response shapes across releases.

### (b) Failure Plausibility: YES
Releasing multiple SDKs against unversioned REST API endpoints guarantees that any backend field rename or structural adjustment will silently break client SDKs in production.

### (c) Smallest Concrete Mitigation
Prefix all API endpoints with `/api/v1/` in `serve.ts` and add an automated Vitest contract test that validates API responses against frozen JSON schemas.

---

## 8. GENERAL INVERSION SWEEP (ROOT CAUSE OF SYSTEMIC FAILURE)

### Primary Root Cause
**Coupling In-Memory Process State to a Monolithic Single-Node Architecture.**

### Concrete Code Evidence
1. **Stateful In-Memory Caches**: [`src/core/base.ts:31-32`](file:///Users/jay/Downloads/solarch/src/core/base.ts#L31-L32) maintains `private _collectionCache = new Map<string, Collection>()`. In multi-instance or local-client deployments, mutations on one node leave other nodes with stale caches.
2. **Process-Local Realtime Broker**: [`src/tools/subscriptions/broker.ts:15-18`](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L15-L18) maintains WebSocket subscriber handles in local Node.js process memory.
3. **Single-Node SQLite Storage**: [`src/tools/database/sqlite-driver.ts:43-44`](file:///Users/jay/Downloads/solarch/src/tools/database/sqlite-driver.ts#L43-L44) binds directly to a single `data.db` file without replication, CDC, or multi-writer support.

### Architectural Conclusion
Building a distributed ecosystem of 5 SDKs (Electron, Tauri, React Native, Agent, MCP) on top of a backend core designed strictly around in-memory single-process state creates an unresolvable mismatch. The SDK ecosystem effort will collapse the moment clients require offline synchronization, horizontal scaling, or isolated service authentication.

Viewed admin_auth.ts:1-150
Viewed record_auth.ts:1-150
Viewed record_auth.ts:151-300
Viewed record_auth.ts:301-450
Viewed middlewares_cors.ts:1-28
Viewed middlewares_auth.ts:1-113
Viewed broker.ts:1-89
Viewed realtime.ts:1-273
Viewed deno_sandbox.ts:1-301
Viewed deno_worker.ts:1-234
Viewed jsvm_sandbox.test.ts:1-100
Viewed auth_models.ts:1-193
Viewed schema_sync.ts:1-247
Edited Post%20MVP%20scoping.md
Viewed Post%20MVP%20scoping.md:1-50

The architectural red-teaming report has been written to [Post MVP scoping.md](file:///Users/jay/Downloads/solarch/Post%20MVP%20scoping.md) in the root of the workspace.

---

### Executive Summary of Findings

1. **Core-Client Auth/Token Model** (`Plausible: YES`):
   * Superuser refresh ([src/apis/admin_auth.ts:95](file:///Users/jay/Downloads/solarch/src/apis/admin_auth.ts#L95)) reads old tokens from `Authorization: Bearer` headers, while Record User refresh ([src/apis/record_auth.ts:367](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L367)) expects a JSON body `{ token: string }`.
   * Rigid 5-second revocation windows ([src/apis/record_auth.ts:384](file:///Users/jay/Downloads/solarch/src/apis/record_auth.ts#L384)) break mobile/desktop SDK retries during low connectivity.
2. **Realtime / Subscription Broker** (`Plausible: YES`):
   * `Broker` ([src/tools/subscriptions/broker.ts:15-18](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L15-L18)) stores subscriptions in process-local `Map` objects with zero connection/channel limits. Events are pushed synchronously with zero message logging or sequence replay capabilities ([src/apis/realtime.ts:238-260](file:///Users/jay/Downloads/solarch/src/apis/realtime.ts#L238-L260)).
3. **SQLite as Distributed Foundation** (`Plausible: YES`):
   * Codebase relies strictly on single-node C-bindings via `better-sqlite3` ([src/tools/database/sqlite-driver.ts:43-50](file:///Users/jay/Downloads/solarch/src/tools/database/sqlite-driver.ts#L43-L50)). Zero replication, WAL streaming, or CRDT/sync primitives exist anywhere in the repository.
4. **JSVM Sandbox as Agent Execution Backend** (`Plausible: PARTIALLY`):
   * OS-level Deno flags (`--deny-net`, `--deny-read`, etc.) provide strong process security ([src/tools/jsvm/deno_sandbox.ts:136-148](file:///Users/jay/Downloads/solarch/src/tools/jsvm/deno_sandbox.ts#L136-L148)). However, spawning a process per invocation ([deno_sandbox.ts:158](file:///Users/jay/Downloads/solarch/src/tools/jsvm/deno_sandbox.ts#L158)) creates latency bottlenecks, and missing Deno binaries trigger a silent fallback to insecure Node `vm.Script` execution ([src/tools/jsvm/jsvm.ts:46-49](file:///Users/jay/Downloads/solarch/src/tools/jsvm/jsvm.ts#L46-L49)).
5. **MCP Server Auth Blast Radius** (`Plausible: YES`):
   * Authorization context ([src/apis/middlewares_auth.ts:36-74](file:///Users/jay/Downloads/solarch/src/apis/middlewares_auth.ts#L36-L74)) recognizes only `isAdmin: true` (Superuser) vs. single collection `record`. No service accounts or scoped API keys exist, forcing the MCP server to execute with full destructive Superuser rights.
6. **Schema Sync Under Concurrent Writes** (`Plausible: YES`):
   * Schema synchronization ([src/core/schema_sync.ts:13-58](file:///Users/jay/Downloads/solarch/src/core/schema_sync.ts#L13-L58)) executes un-transactional, un-locked `ALTER TABLE` DDL queries. Concurrent automated schema changes (e.g. AI generator + CMS import) will desynchronize `_collections` JSON metadata from SQLite table structures (`PRAGMA table_info`).
7. **Versioning & Breaking Changes** (`Plausible: YES`):
   * All Express endpoints ([src/apis/serve.ts:84-101](file:///Users/jay/Downloads/solarch/src/apis/serve.ts#L84-L101)) are mounted without version prefixes (`/api/v1/`), and no automated contract/schema payload tests exist in Vitest to detect breaking changes before release.
8. **Root Cause of Systemic Failure**:
   * **Coupling In-Memory Process State to Monolithic Single-Node Storage**: Process-local collection caches ([src/core/base.ts:31-32](file:///Users/jay/Downloads/solarch/src/core/base.ts#L31-L32)), process-local pub/sub brokers ([src/tools/subscriptions/broker.ts:15-18](file:///Users/jay/Downloads/solarch/src/tools/subscriptions/broker.ts#L15-L18)), and non-replicated SQLite files prevent multi-instance horizontal scaling or offline local-first SDK syncing.

The complete red-teaming report with line-level code citations and mitigations is stored in [Post MVP scoping.md](file:///Users/jay/Downloads/solarch/Post%20MVP%20scoping.md).