---
title: "Backups & Migrations"
description: "Manage database migration scripts and automated zip backup archives."
slug: "features/backups-migrations"
---

# Backups & Migrations

Solarch includes migration version control and live backup management ([src/core/migration.ts](../../src/core/migration.ts), [src/apis/backup.ts](../../src/apis/backup.ts)). Use migrations to track database schema changes and backups to create point-in-time archives.

---

## 1. Database Migrations

Migration files are stored in `pb_migrations/*.js`.

### Create a Migration Script

```bash
solarch migrate create add_posts_table --dir ./pb_migrations
```

This creates a file like `pb_migrations/1721900000000_add_posts_table.js`:

```javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_analytics (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        created TEXT NOT NULL
      );
    `)
  },

  async down(app) {
    const db = app.db().getDataDB()
    db.exec(`DROP TABLE IF EXISTS custom_analytics;`)
  }
}
```

### Migration CLI Commands

#### Run Pending Migrations
```bash
solarch migrate up --dir ./pb_data
```

#### Rollback Recent Migration
```bash
solarch migrate down 1 --dir ./pb_data
```

#### Check Migration Status
```bash
solarch migrate status --dir ./pb_data
```

---

## 2. Backup Management

Backups compress `pb_data` databases and uploaded storage into `.zip` archives.

### Create a Backup ([src/apis/backup.ts:L30](../../src/apis/backup.ts#L30))

```bash
curl -X POST http://localhost:8090/api/backups \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "manual_backup_v1.zip" }'
```

### List Backups ([src/apis/backup.ts:L15](../../src/apis/backup.ts#L15))

```bash
curl -X GET http://localhost:8090/api/backups \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN"
```

### Restore a Backup ([src/apis/backup.ts:L65](../../src/apis/backup.ts#L65))

```bash
curl -X POST http://localhost:8090/api/backups/manual_backup_v1.zip/restore \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN"
```

---

## 3. Automated Cron Backups ([src/apis/serve.ts:L150](../../src/apis/serve.ts#L150))

Configure automated scheduled backups using cron expressions in `app.settings()`:

```json
{
  "backups": {
    "cron": "0 2 * * *",
    "cronMaxKeep": 5
  }
}
```

This schedule creates daily backups at 02:00 UTC and automatically retains the latest 5 archives.

---

## Common Errors

### Error: `Another backup process is currently running.`
- **Cause**: Attempted to trigger a backup while an automated or manual backup stream is active ([src/apis/backup_utils.ts:L20](../../src/apis/backup_utils.ts#L20)).
- **Fix**: Wait for the active backup to finish before starting a new backup.

### Error: `Backup file not found.`
- **Cause**: Specified backup name does not exist in `pb_data/backups/` ([src/apis/backup.ts:L70](../../src/apis/backup.ts#L70)).
- **Fix**: List available backups via `GET /api/backups` to confirm exact filename.
