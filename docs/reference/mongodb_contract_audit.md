# MongoDB Contract Feasibility & Architectural Audit (DB-MONGO-1)

This document represents the formal **Hard Architectural Gate (DB-MONGO-1)** evaluation for integrating MongoDB into Solarch as a first-class, provider-neutral non-relational database driver.

---

## 1. Executive Summary & Hard Gate Verdict

- **Milestone Objective:** Prove that Solarch's `DatabaseDriver` abstraction is genuinely provider-neutral by implementing document-based persistence for MongoDB without inventing fake relational/SQL abstractions or introducing application-level `if (provider === "mongodb")` branching.
- **Feasibility Verdict:** **PASS WITH ADAPTATIONS**.
- **Hard Gate Decision:** The existing `DatabaseDriver` interface can cleanly support MongoDB document persistence through driver-level query adaptation, schema virtualization, and BSON egress normalization. No breaking changes to existing SQLite or PostgreSQL contracts are required.

---

## 2. Comprehensive Contract Audit & Classification

Each interface and method of Solarch's database abstraction layer was audited against native MongoDB driver semantics:

### A. Core Driver & Lifecycle (`DatabaseDriver`)
| Method / Property | Relational (SQLite / PG) | MongoDB Semantics | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `provider` | `'sqlite' \| 'postgres'` | `'mongodb'` | **PASS** | Extended in `DatabaseProviderType`. |
| `capabilities` | Bitmask / flags | Document capabilities | **PASS** | Configured in `MONGODB_CAPABILITIES`. |
| `connect()` | Opens DB file / PG pool | `MongoClient.connect()` | **PASS** | Reuses `MongoClient` pool across requests. |
| `close()` | Closes DB / pool | `MongoClient.close()` | **PASS** | Shuts down connection pool cleanly. |
| `ping()` | `SELECT 1` | `db.command({ ping: 1 })` | **PASS** | Direct administrative command. |
| `exec(sql)` | Multi-statement DDL | Multi-collection ops | **PASS WITH ADAPTATION** | No-op for raw SQL DDL; routes index/collection creation. |

---

### B. Query & Execution (`QueryDriver`)
| Method | Current Contract | MongoDB Equivalent | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `query(sql, params)` | Returns array of `Row[]` | `collection.find().toArray()` | **PASS WITH ADAPTATION** | Template-driven translation for parameterized CRUD (`SELECT * FROM ... WHERE ... ORDER BY ... LIMIT ? OFFSET ?`). |
| `queryOne(sql, params)` | Returns `Row \| null` | `collection.findOne()` | **PASS WITH ADAPTATION** | Executes `.findOne()` or `.limit(1)` and strips BSON wrappers. |
| `execute(sql, params)` | Returns `ExecuteResult` | `insertOne`, `updateOne`, `deleteOne` | **PASS WITH ADAPTATION** | Maps `{ changes, rowsAffected, lastInsertRowid }` from Mongo write results (`modifiedCount`, `deletedCount`, `insertedId`). |

---

### C. Schema & Metadata (`SchemaDriver`)
| Method | Current Contract | MongoDB Equivalent | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `hasTable(table)` | Check table catalog | `db.listCollections({ name })` | **PASS** | Checks existence of Mongo collection. |
| `createTable(name, cols)` | `CREATE TABLE ...` | `db.createCollection(name)` | **PASS WITH ADAPTATION** | Creates collection and sets up initial unique/indexes for `id` field. |
| `dropTable(name)` | `DROP TABLE ...` | `db.collection(name).drop()` | **PASS** | Direct drop operation with `NamespaceNotFound` suppression. |
| `tableInfo(table)` | Returns `ColumnInfo[]` | Virtualized from logical schema | **PASS WITH ADAPTATION** | Returns logical fields stored in Solarch's `_collections` collection rather than inspecting dynamic documents. |
| `tableIndexes(table)` | Index list map | `collection.indexes()` | **PASS** | Maps Mongo index array to `{ [name]: columns }` record. |
| `createIndex(table, name, cols)` | `CREATE INDEX ...` | `collection.createIndex()` | **PASS** | Builds key specification (`{ [col]: 1 }`). |
| `dropIndex(name)` | `DROP INDEX ...` | `collection.dropIndex(name)` | **PASS** | Drops index by name. |
| `addColumn` / `dropColumn` | `ALTER TABLE ...` | Dynamic / Schema-flexible | **PASS WITH ADAPTATION** | No-op at physical layer; schema updates are tracked in `_collections`. |
| `dropView` / `saveView` | SQL View DDL | Aggregation View Pipeline | **PASS WITH ADAPTATION** | Supported via `db.createCollection(name, { viewOn, pipeline })`. |

---

### D. Transaction Management (`TransactionDriver`)
| Method | Current Contract | MongoDB Equivalent | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `transaction(fn)` | `BEGIN ... COMMIT / ROLLBACK` | `session.withTransaction()` | **PASS WITH ADAPTATION** | Requires replica set / mongos or standalone with feature compatibility. Managed via `ClientSession`. |

---

### E. Dialect & Filter Compilation (`Dialect`)
| Method | Current Contract | MongoDB Equivalent | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `getDialect()` | `'sqlite' \| 'postgres'` | `'mongodb'` | **PASS** | Identifies driver dialect. |
| `compileFilter(ast)` | Compiles AST to SQL `WHERE` | Compiles AST to Mongo Filter Doc | **PASS** | Direct AST-to-BSON mapping (`$eq`, `$gt`, `$in`, `$and`, `$or`). |
| `buildSort(sort)` | SQL `ORDER BY ...` | Mongo Sort Spec `{ field: 1/-1 }` | **PASS** | Translates `+field` / `-field` to Mongo sort object. |
| `escapeField(field)` | SQL quotes (`"field"`) | BSON field identifier | **PASS** | Sanitizes field name without SQL quotes. |

---

### F. Backup Operations (`DatabaseBackupDriver`)
| Method | Current Contract | MongoDB Equivalent | Classification | Architectural Adaptation Required |
| :--- | :--- | :--- | :---: | :--- |
| `checkpoint(target)` | SQLite WAL checkpoint | Not applicable | **UNSUPPORTED** | Handled via capability check (`backupToFile: false`); no fake checkpointing. |
| `backupToFile(path)` | Direct file copy / stream | `mongodump` / Atlas snapshot | **UNSUPPORTED** | Capability-reported as unsupported at driver file level; routes to external CLI tooling. |

---

## 3. Physical Storage & Record Identity Strategy

1. **Collection Mapping**:
   - System Collections: `_collections`, `_admins`, `_superusers`, `_logs`, `_params`, `_migrations`.
   - Application Record Collections: `_r_<collection_id>` (consistent with Solarch's existing physical separation).
2. **Record Identity (`id` vs `_id`)**:
   - Every document maintains Solarch's canonical 15-character string `id`.
   - A unique index `{ id: 1 }` is maintained on every application collection.
   - On insert, `_id` is generated by MongoDB internally (or mapped to `id`), but **`_id` is completely stripped during egress normalization**. The public REST API and SDK contracts only ever see `id`.

---

## 4. Query Compilation Architecture

Solarch does not need an elaborate SQL-to-Mongo string parser. Solarch already parses filters and sorts into a structured AST (`FilterAST`) using `src/tools/search/filter.ts`.

### Translation Pipeline:
```text
Client Filter: "status = 'active' && (views > 100 || featured = true)"
      │
      ▼
parseFilter(filterStr) ──► FilterAST
      │
      ▼
MongoFilterCompiler.compile(ast)
      │
      ▼
BSON Query: {
  $and: [
    { status: { $eq: "active" } },
    {
      $or: [
        { views: { $gt: 100 } },
        { featured: { $eq: true } }
      ]
    }
  ]
}
```

---

## 5. Security & Operator Injection Defense

- **Vulnerability Vector**: Client JSON bodies containing `$gt`, `$ne`, `$where`, `$regex`, or prototype pollution keys (`__proto__`, `$expr`).
- **Defensive Invariant**:
  1. Client filters are **always** parsed through `parseFilter()`. Arbitrary MongoDB query objects are never accepted from HTTP bodies or query params.
  2. The AST compiler strictly enforces whitelist mapping for operators (`=`, `!=`, `>`, `<`, `>=`, `<=`, `~`, `in`, `&&`, `||`).
  3. Field names are validated against `validateIdentifier` to prevent property traversal attacks.

---

## 6. Error Normalization Matrix

| MongoDB Error Code | Native Error | Solarch `DatabaseErrorCode` |
| :--- | :--- | :--- |
| `11000` / `11001` | Duplicate Key Violation | `UNIQUE_VIOLATION` (maps to `400 VALIDATION_FAILED`) |
| `50` / `ExceededTimeLimit` | MaxTimeMSExpired / Timeout | `QUERY_TIMEOUT` |
| `13` / `Unauthorized` | AuthenticationFailed | `DATABASE_UNAVAILABLE` |
| `26` / `NamespaceNotFound` | Collection / DB missing | Handled gracefully as empty result / false |
| `112` / `WriteConflict` | Transaction write conflict | `TRANSACTION_FAILED` (retryable: true) |

---

## 7. Capability Matrix Updates

| Capability | SQLite | PostgreSQL | Neon | MongoDB |
| :--- | :---: | :---: | :---: | :---: |
| **CRUD** | ✓ | ✓ | ✓ | **✓** |
| **Transactions** | ✓ | ✓ | ✓ | **✓** (Replica set / Session) |
| **Indexes** | ✓ | ✓ | ✓ | **✓** |
| **Views** | ✓ | ✓ | ✓ | **✓** (Aggregation pipeline) |
| **JSON Operations** | ✓ | ✓ | ✓ | **✓** (Native BSON) |
| **Migrations** | ✓ | ✓ | ✓ | **✓** (Schema metadata) |
| **Local File Backup** | ✓ | — | — | **—** (Uses `mongodump`) |
| **SQL Dialect** | ✓ | ✓ | ✓ | **—** (Native Document AST) |
| **Vector Search** | — | Extension (`pgvector`) | Extension | **Atlas Search / Vector** |

---

## 8. Hard Gate Conclusion

The feasibility audit is **COMPLETE and PASSES**. 
The abstraction cleanly supports MongoDB without compromising relational drivers or leaking document-specific constructs.

**Approved to proceed to Phase DB-MONGO-2 (Physical Model & Storage Implementation).**
