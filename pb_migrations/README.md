# Migrations

This directory contains JavaScript migration files for Solarch.

## File Naming

Migration files should follow the naming convention:

```
<TIMESTAMP>_<name>.js
```

Example:
```
1699900000000_create_posts.js
1699900001000_add_user_roles.js
```

You can use the CLI to generate migration files:

```bash
solarch migrate create create_posts
```

## Migration File Format

Each migration file must export an object with an `up` function and optionally a `down` function:

```javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    // Your migration logic here
  },

  async down(app) {
    const db = app.db().getDataDB()
    // Rollback logic here
  }
}
```

### Available App Methods

- `app.db().getDataDB()` — Get the main SQLite database instance
- `app.db().getAuxDB()` — Get the auxiliary SQLite database instance
- `app.findCollectionByNameOrId(name)` — Find a collection
- `app.save(model)` — Save a model
- `app.settings()` — Get app settings
- `app.logger()` — Get logger

## Running Migrations

### Automatic
Migrations run automatically when the server starts.

### CLI
```bash
# Run pending migrations
solarch migrate up

# Rollback last migration
solarch migrate down

# Rollback 3 migrations
solarch migrate down 3

# Check status
solarch migrate status

# Create new migration
solarch migrate create migration_name
```

### Programmatic
```typescript
const app = new Solarch()
await app.bootstrap()

// Run all pending migrations
await app.migrate()

// Rollback last 2 migrations
await app.migrateDown(2)

// Get status
const status = app.migrationStatus()
```

## Examples

### Create a Table
```javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created TEXT,
        updated TEXT
      )
    `)
  },

  async down(app) {
    const db = app.db().getDataDB()
    db.exec('DROP TABLE IF EXISTS categories')
  }
}
```

### Insert Data
```javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    db.prepare('INSERT INTO categories (id, name, created) VALUES (?, ?, ?)')
      .run('cat1', 'General', new Date().toISOString())
  },

  async down(app) {
    const db = app.db().getDataDB()
    db.prepare('DELETE FROM categories WHERE id = ?').run('cat1')
  }
}
```

### Add a Column
```javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    db.exec('ALTER TABLE posts ADD COLUMN slug TEXT')
  },

  async down(app) {
    // SQLite doesn't support DROP COLUMN directly
    // You would need to recreate the table
  }
}
```
