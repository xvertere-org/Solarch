# Solarch Cloudflare D1 Edge Contract (`EDGE-CONTRACT.md`)

This document defines the architecture, capability model, and execution semantics for the native Cloudflare D1 database driver.

---

## 1. D1 Architecture Overview

Cloudflare D1 provides serverless SQLite on Cloudflare's Edge network. The `D1DatabaseDriver` implements Solarch's standard `DatabaseDriver` interface, translating operations to the native D1 binding (`D1Database`).

```text
Solarch Core / App
        │
  DatabaseDriver
        │
 ┌──────┴───────────────────────────┐
 │                                  │
 │         D1DatabaseDriver         │
 │   (src/tools/database/d1/)       │
 │                                  │
 └──────────────────┬───────────────┘
                    │
                    ▼
          Cloudflare D1 Binding
```

---

## 2. Capability Matrix

| Capability | Supported | Notes |
| :--- | :---: | :--- |
| `joins` | **true** | Standard SQLite join execution supported by D1 engine |
| `indexes` | **true** | Standard SQLite index creation / management |
| `views` | **true** | Standard SQLite view creation and queries |
| `foreignKeys` | **true** | SQLite foreign key constraint enforcement |
| `jsonOperations` | **true** | SQLite `json_extract`, `json_each`, `json_array` |
| `migrations` | **true** | Executed via D1 batch execution |
| `vectorFunctions` | **false** | D1 native vector indexing is distinct from SQLite vector extensions |
| `explainOpcodes` | **false** | Not exposed in D1 HTTP/worker binding |
| `transactions` | **false\*** | Arbitrary interactive multi-roundtrip transactions are not supported over HTTP/worker boundaries; atomic multi-statement operations are executed via `d1.batch()` |

---

## 3. Query & Execution Semantics

1. **Prepared Statements**:
   - `d1.prepare(sql).bind(...params).all()` for `query()`
   - `d1.prepare(sql).bind(...params).first()` for `queryOne()`
   - `d1.prepare(sql).bind(...params).run()` for `execute()`
2. **Batch Operations**:
   - Multiple statements batched sequentially inside `d1.batch([...statements])` ensuring all-or-nothing atomicity.
3. **Error Normalization**:
   - D1 error codes mapped to canonical `DatabaseError` (`DUPLICATE_KEY`, `FOREIGN_KEY_VIOLATION`, `SYNTAX_ERROR`).
