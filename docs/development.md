# Developer Workflow & Daily Loop

This guide outlines the optimal day-to-day development workflow using the Solarch CLI tooling ecosystem.

---

## The Solarch Development Loop

```text
  solarch init (or git clone)
        ↓
  solarch dev (interactive watch server)
        ↓
  solarch generate collection / migration / hook
        ↓
  solarch routes (inspect endpoints)
        ↓
  solarch logs (live stream & debug)
        ↓
  solarch migrate up (apply schema changes)
        ↓
  solarch doctor (pre-commit health check)
```

---

## 1. Starting the Development Server

The `solarch dev` command is your primary development hub:

```bash
solarch dev
```

### Features:
- **Intelligent File Watching**: Automatically monitors `solarch.config.ts`, `.env`, `pb_migrations/*.js`, and `src/hooks/*.ts`.
- **Zero-Downtime Reloads**: Reloads routes and configuration without dropping SQLite database connections.
- **Interactive Keyboard Shortcuts**:
  - <kbd>r</kbd> — Trigger a manual server restart
  - <kbd>d</kbd> — Run doctor diagnostics inline
  - <kbd>c</kbd> — Clear console output
  - <kbd>q</kbd> — Gracefully stop the server

---

## 2. Generating Backend Resources

Solarch provides code generators to scaffold boilerplate-free database schemas and application hooks.

### Scaffold a Collection Migration

Create a new database collection migration:

```bash
solarch generate collection products
```

Generated file (`pb_migrations/<timestamp>_create_products.js`):
```javascript
module.exports = {
  async up(app) {
    await app.db().execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0.0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)
  },

  async down(app) {
    await app.db().execute(`DROP TABLE IF EXISTS products`)
  }
}
```

### Scaffold a Lifecycle Hook

Create an event handler or webhook processor:

```bash
solarch generate hook stripe_webhook
```

Generated file (`src/hooks/stripe_webhook.ts`):
```typescript
export default async function hook(ctx: any) {
  // Custom hook logic
  if (ctx.path === '/api/webhooks/stripe') {
    // Process webhook event
  }
}
```

---

## 3. Applying Database Migrations

Apply your new schema changes immediately:

```bash
solarch migrate up
```

Check migration status:

```bash
solarch migrate status
```

---

## 4. Inspecting Endpoints & Routing

To verify that your newly scaffolded collections and hooks have registered their HTTP endpoints:

```bash
solarch routes
```

This prints all active REST routes, auth endpoints, realtime event streams, and middleware chains.

---

## 5. Streaming and Debugging Logs

Monitor real-time server traffic, database queries, and error stack traces in a separate terminal:

```bash
# Stream all logs
solarch logs --follow

# Filter to ERROR logs only
solarch logs --follow --level ERROR

# View the last 100 log entries
solarch logs --tail 100
```

---

## 6. Pre-Commit Quality & Health Checks

Before committing code or deploying to production, run a comprehensive diagnostic check:

```bash
solarch doctor
```

And inspect your project identity and dependency matrix:

```bash
solarch inspect project
solarch inspect database
```

---

## 7. Cleaning & Resetting Local State

When you want to reset temporary test data, remove cache files, or start with a clean database state:

```bash
# Clean temporary files, logs, and test coverage
solarch project clean --yes

# Reset local database state and re-verify project health
solarch project reset --yes
```
