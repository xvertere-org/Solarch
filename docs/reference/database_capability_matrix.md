# Solarch Multi-Database Capability Matrix (DB-MONGO-3)

**Source of Truth:** `src/tools/database/capabilities.ts` (`SQLITE_CAPABILITIES`, `POSTGRES_CAPABILITIES`, `MONGODB_CAPABILITIES`) and the individual database driver implementations.

---

## 1. Core Contract Capability Flags

| Capability | SQLite | PostgreSQL | Neon (WS/TCP) | Neon (HTTP) | MongoDB | Enforcement & Consumers |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `transactions` | **true** | **true** | **true** | **false** | **true** | Driver `transaction()`; Neon HTTP throws actionable error. Mongo uses sessions. |
| `joins` | **true** | **true** | **true** | **true** | **true** | SQL joins for relational; `$lookup` / reference queries for MongoDB. |
| `indexes` | **true** | **true** | **true** | **true** | **true** | Relational `CREATE INDEX`; MongoDB `collection.createIndex()`. |
| `views` | **true** | **true** | **true** | **true** | **true** | SQL `CREATE VIEW`; MongoDB Aggregation View Pipelines. |
| `foreignKeys` | **true** | **true** | **true** | **true** | **false** | Enforced at application schema layer in Solarch. |
| `jsonOperations` | **true** | **true** | **true** | **true** | **true** | SQLite (`json_each`), PostgreSQL (`jsonb`), MongoDB (Native BSON). |
| `migrations` | **true** | **true** | **true** | **true** | **true** | Migration collection runner (`_migrations`). |
| `vectorFunctions` | **true** | **false** | **false** | **false** | **false** | SQLite-vec; PG requires `pgvector` extension; Mongo Atlas Vector. |
| `explainOpcodes` | **true** | **false** | **false** | **false** | **false** | SQLite EXPLAIN bytecode opcode parser. |

---

## 2. Operational & Physical Layer Matrix

| Operation / Feature | SQLite | PostgreSQL | Neon | MongoDB | Physical Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Data Model** | Relational Table | Relational Table | Relational Table | Document Collection | Documents inside collections |
| **Record Identity** | `id` (TEXT, PK) | `id` (VARCHAR, PK) | `id` (VARCHAR, PK) | `id` (String, Unique) | Mongo `_id` hidden; `id` is primary identifier |
| **Connection Pooling** | Single Connection | `pg.Pool` (configurable) | HTTP / WS Pool | `MongoClient` Pool | Driver-managed connection pool |
| **Transactions** | `BEGIN ... COMMIT` | `BEGIN ... COMMIT` | WS Session | `ClientSession` | Multi-document transaction with commit/rollback |
| **Filter Translation** | `SqliteQueryBuilder` | `PostgresQueryBuilder` | `PostgresQueryBuilder` | `MongoFilterCompiler` | `FilterAST` translated to native syntax/BSON |
| **Sorting & Pagination** | `LIMIT ? OFFSET ?` | `LIMIT $n OFFSET $m` | `LIMIT $n OFFSET $m` | `.skip().limit().sort()` | Stable tie-break on `id ASC` |
| **Local File Backup** | Native (`backupToFile`) | External (`pg_dump`) | External (`pg_dump`) | External (`mongodump`) | Capability check guards file-level calls |
| **Schema DDL** | `CREATE TABLE` | `CREATE TABLE` | `CREATE TABLE` | Collection bootstrap | Metadata stored in `_collections` |
| **Error Normalization** | `SQLITE_CONSTRAINT` | PG Error Codes (`23505`) | PG Error Codes | Mongo Codes (`11000`) | Canonical `DatabaseError` envelope |

---

## 3. Provider Classification Summary

- **SQLite**: Embedded, zero-configuration local single-file database.
- **PostgreSQL / Neon**: Production-grade client-server relational database with ACID guarantees and JSONB.
- **MongoDB**: Schema-flexible, high-throughput document store with native JSON/BSON persistence.
