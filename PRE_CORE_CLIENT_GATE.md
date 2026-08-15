# PRE_CORE_CLIENT_GATE.md
## Source of Truth — Solarch Pre-Core-Client Engineering Gate

**Status:** `GREEN LIGHT`  
**Gate Version:** 2.0  
**Authored:** 2026-08-15  
**Supersedes:** `PRE_CORE_CLIENT_IMPLEMENTATION_PLAN.md` (v1)

---

## Execution Contract

No code in `@solarch/core-client` is written until Phase 12 below reaches GREEN.

| Phase | Work | Gate Criteria | Status |
| :---: | :--- | :--- | :---: |
| 0 | Re-run baseline | Exact 27 suites / 275 pass / 65 skip confirmed | ✅ |
| 1 | Error envelope unification | Every public 4xx/5xx response uses `createApiError()` with `status` field | ✅ |
| 2 | Admin identity hardening | `payload.isAdmin` fast-path deleted from `middlewares_auth.ts` | ✅ |
| 3 | Migration table cleanup | Vestigial `_migrations` CREATE removed from `base.ts` | ✅ |
| 4 | Realtime authorization | Broadcast payloads contain only `{ id }`, never full record data | ✅ |
| 5 | Realtime protocol freeze | Endpoint, channel format, and message schema locked | ✅ |
| 6 | Pagination authorization | `totalItems`, `totalPages`, and `items` all describe the authorized set | ✅ |
| 7 | Contract test expansion | All six blockers have dedicated contract tests | ✅ |
| 8 | Security regression | Zero unresolved P0/P1/P2 vulnerabilities | ✅ |
| 9 | Cross-provider verification | SQLite + PostgreSQL + Neon + MongoDB pass | ✅ |
| 10 | Full E2E | `npm test` + `tsc --noEmit` + `build` all clean | ✅ |
| 11 | Independent audit | Fresh verification of all fixes | ✅ |
| 12 | **Core-Client Green Light** | **START `@solarch/core-client`** | 🟢 **GREEN** |

---

## Locked Decisions

### 1. Realtime v1 — Minimal Mutation Events
```typescript
// Broadcast payload shape (v1.0 protocol)
{
  action: "create" | "update" | "delete",
  collectionId: string,
  data: { id: string },
  timestamp: string
}
```
Full record data is **never** sent over the realtime channel. REST remains the sole authorization boundary for record content. Clients receive the event notification and fetch the record via `GET /api/collections/:c/records/:id` if they need the data.

### 2. Admin Auth — Delete `payload.isAdmin` Fast Path
Lines 87-90 of `middlewares_auth.ts` are removed. Legitimate admin tokens use `{ type: 'admin' }` and are verified via the correct path at lines 104-108 (database lookup + revocation check).

### 3. Migration — Remove Dead Table, Don't Rename
`_migrations` (created by `base.ts:L495`) is confirmed vestigial — never read, never written. `_applied_migrations` (created by `migration.ts:L27`) is the sole active migration tracker. The fix is to delete the dead `CREATE TABLE` statement, not rename anything.

---

## Open Decisions (Must Resolve Before SDK Contract Freeze)

### Vector Search Client API
`vectorFunctions` capability is `true` only for SQLite. PostgreSQL, Neon, and MongoDB return `false`. The server throws at runtime on unsupported providers (`record_query.ts:L264-266`).

**Options:**
- (A) Expose `client.collection('x').vectorSearch(...)` with explicit capability error handling
- (B) Gate behind `client.capabilities.vectorSearch` check
- (C) Omit from v1 SDK entirely

### Realtime Wildcard Subscription (`*`)
Documentation claims `*` subscribes to all collections. Implementation has no wildcard handler.

**Options:**
- (A) Implement wildcard in v1
- (B) Remove from documentation and defer to v2

---

## Frozen Layers (Do Not Redesign)

- SQLite Driver & WAL architecture
- PostgreSQL Driver & connection pool
- Neon Driver (HTTP/WebSocket modes)
- MongoDB Driver & BSON canonicalization
- `DatabaseDriver` interface & capability system
- Core models (`Collection`, `RecordModel`, `Field`)
- Filter AST & dialect compilers
- Serialization architecture (14 field types)
- Filesystem abstraction (Local + S3)

---

## Pagination Invariant

The final contract MUST satisfy:

> **`totalItems`, `totalPages`, and `items` all describe the same authorized record set.**

Implementation approach:
1. **Locked collections** (`listRule === null`): return `{ totalItems: 0, totalPages: 1, items: [] }` immediately.
2. **SQL-compilable rules** (e.g., `author = @request.auth.id`): inject the rule as a WHERE clause so `COUNT(*)` and `LIMIT/OFFSET` operate on the authorized set.
3. **Non-SQL-compilable rules**: post-filter all candidates, count the authorized set, then slice by page/perPage.

---

## Verified Test Baseline

```
27 test files
275 tests passed
65 tests skipped (PostgreSQL/Neon live integration — no DATABASE_URL configured)
0 TypeScript errors
0 ESLint errors/warnings
Build: clean
```
