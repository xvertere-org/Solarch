# PostgreSQL + Neon Capability Matrix (DB-PG-4.5)

**Date:** 2026-08-13
**Source of truth:** `src/tools/database/capabilities.ts` (`SQLITE_CAPABILITIES`, `POSTGRES_CAPABILITIES`,
`UNSUPPORTED_CAPABILITIES`) and actual driver implementations.

## Contract capability flags

| Capability | SQLite | PostgreSQL | Neon (http) | Neon (websocket) | Gate consumer |
|---|---|---|---|---|---|
| `transactions` | true | true | **false** | true | driver `transaction()` (N/A — Neon http rejects) |
| `joins` | true | true | true | true | — |
| `indexes` | true | true | true | true | — |
| `views` | true | true | true | true | schema_sync |
| `foreignKeys` | true | true | true | true | — |
| `jsonOperations` | true | true | true | true | filter operators (`?=`, `?:`, `?~`) — SQLite via `json_each`, PG via `jsonb_array_elements_text` |
| `migrations` | true | true | true | true | migration runner |
| `vectorFunctions` | true | **false** | **false** | **false** | record_query `vectorSearch` (throws clear error on PG/Neon) |
| `explainOpcodes` | true | **false** | **false** | **false** | schema_sync view-write-validation (falls back to SELECT-prefix check) |

## Operational capability matrix (driver-level, not contract flags)

| Operation | SQLite | PostgreSQL | Neon (http) | Neon (websocket) | Mechanism |
|---|---|---|---|---|---|
| Queries (query/queryOne/execute) | yes | yes | yes | yes | contract `?` placeholders; PG/Neon translate `?` → `$n` |
| Prepared statements (sync) | yes | no | no | no | SQLite-specific `prepare()`; not on shared contract |
| Transactions | yes | yes | **no** (rejected with actionable error) | yes | dedicated pooled client; HTTP mode explicitly refuses |
| Nested transactions | no | no | n/a | no | driver throws `DATABASE_TRANSACTION_FAILED` |
| Local file backup (`backupToFile`) | yes | no | no | no | SqliteDriver-only; facade guards `'backupToFile' in driver` |
| Checkpoint (`checkpoint`) | yes | no | no | no | SqliteDriver-only; facade guards `'checkpoint' in driver` |
| Connection pooling | single connection | pg.Pool (max 10) | per-request HTTP | Pool (max 10) | pool options from config |
| Server-side database | local file | external server | Neon cloud | Neon cloud | `provider: 'postgres'` identity preserved |
| `VACUUM` | yes | yes (maintenance cmd) | n/a | yes | facade `vacuum()`; no production callers |
| Sync `Statement` (run/get/all) | yes | no | no | no | SQLite-specific |
| `lastInsertRowid` | yes | no (undefined) | no | no | never consumed by app (client TEXT UUID PKs) |
| EXPLAIN opcode validation | yes | no (plan text) | no | no | gated by `explainOpcodes` capability |
| JSON storage | TEXT + `json_each` | TEXT + `::jsonb` casts | TEXT + `::jsonb` | TEXT + `::jsonb` | dialect emits provider-specific operator SQL |
| DDL types (TEXT/REAL/INTEGER) | native | native (valid PG types) | native | native | identity mapping; `tableInfo` normalizes to uppercase |
| Filter/sort compilation | `SqliteQueryBuilder` | `PostgresQueryBuilder` | postgres | postgres | via `Dialect.compileFilter`/`buildSort` |

## Semantics notes

- `transactions` flag is declared `true` on `POSTGRES_CAPABILITIES` (websocket/TCP); Neon HTTP cannot
  honor it — the Neon HTTP strategy throws `DATABASE_TRANSACTION_FAILED` with an actionable message
  instead of silently degrading (no transaction-by-HTTP-request composition, per DB-PG-13).
- JSON storage remains `TEXT` on PostgreSQL (identical DDL strings across providers); the dialect
  applies `::jsonb` casts for filter operators (`?=`/`?:`/`?~`), avoiding schema divergence.
- `vectorFunctions`/`explainOpcodes` are the two capabilities PostgreSQL cannot provide; both have
  explicit app-layer gates (DB-PG-16) that degrade loudly, never silently.