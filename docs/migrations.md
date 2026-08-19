# Database Migrations Guide

Solarch includes a lightweight, transactional schema migration engine. Migrations are stored in `pb_migrations/` as standard JavaScript/TypeScript files with reversible `up` and `down` functions.

---

## Migration File Anatomy

Each migration file exports an object with `up` and `down` methods that receive the active `app` application instance:

```javascript
// pb_migrations/1724000000000_create_articles.js
module.exports = {
  /**
   * Apply schema changes
   */
  async up(app) {
    await app.db().execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT,
        published INTEGER DEFAULT 0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)
  },

  /**
   * Revert schema changes
   */
  async down(app) {
    await app.db().execute(`DROP TABLE IF EXISTS articles`)
  }
}
```

---

## Migration Commands

### 1. Create a New Migration

Generate a timestamped blank migration file:

```bash
solarch migrate create add_user_avatar
```

This creates `pb_migrations/<timestamp>_add_user_avatar.js`.

Alternatively, use the resource generator to scaffold pre-populated table definitions:

```bash
solarch generate collection categories
```

---

### 2. Apply Pending Migrations (`solarch migrate up`)

Execute all unapplied migrations in sequential order:

```bash
solarch migrate up
```

Output:
```text
[INFO] Applying migration: 1724000000000_create_articles.js
[INFO] Migration applied successfully.
Migrations completed.
```

---

### 3. Check Migration Status (`solarch migrate status`)

Inspect which migrations have been applied and which are pending:

```bash
solarch migrate status
```

Output:
```text
┌─────────┬──────────────────────────────────────────┬───────────┐
│ (index) │ file                                     │ status    │
├─────────┼──────────────────────────────────────────┼───────────┤
│ 0       │ '001_create_users.js'                    │ 'applied' │
│ 1       │ '002_create_posts.js'                    │ 'applied' │
│ 2       │ '1724000000000_create_articles.js'       │ 'pending' │
└─────────┴──────────────────────────────────────────┴───────────┘
```

---

### 4. Rollback Migrations (`solarch migrate down`)

Revert the most recent migration:

```bash
solarch migrate down
```

To rollback multiple migrations in reverse sequential order:

```bash
solarch migrate down 3
```

Output:
```text
[INFO] Rolling back migration: 1724000000000_create_articles.js
Rolled back 1 migration(s).
```

---

## Multi-Database Compatibility

Solarch migrations execute standard SQL queries compatible with both SQLite and PostgreSQL.

### Cross-Database Types Reference:

| Logical Type | SQLite Type | PostgreSQL Type |
|---|---|---|
| ID / Primary Key | `TEXT PRIMARY KEY` | `TEXT PRIMARY KEY` / `VARCHAR(64)` |
| String / Text | `TEXT` | `TEXT` / `VARCHAR(255)` |
| Number / Integer | `INTEGER` | `INTEGER` / `BIGINT` |
| Floating Point | `REAL` | `DOUBLE PRECISION` / `REAL` |
| Boolean | `INTEGER` (0 / 1) | `BOOLEAN` |
| Timestamp | `TEXT` (ISO-8601) | `TIMESTAMPTZ` / `TEXT` |
| JSON / Payload | `TEXT` | `JSONB` / `TEXT` |

---

## Best Practices

1. **Always write reversible `down()` functions**: Ensure that every `CREATE TABLE` has a corresponding `DROP TABLE`, and every `ALTER TABLE ADD COLUMN` has a rollback path.
2. **Use Transactions**: When running complex multi-step migrations, wrap DDL statements in transactions where supported.
3. **Commit Migrations to Git**: All files in `pb_migrations/` should be tracked in version control so that teammates and CI/CD pipelines share identical schemas.
