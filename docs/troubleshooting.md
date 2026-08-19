# Troubleshooting & Diagnostics Playbook

This playbook provides solutions to common development, database, configuration, and environment issues encountered when working with Solarch.

---

## 1. Primary Diagnostic: `solarch doctor`

Whenever you encounter unexpected behavior, run the built-in diagnostic tool first:

```bash
solarch doctor
```

The doctor engine performs 6 automated health checks:

| Check ID | Component | What It Validates |
|---|---|---|
| `node_runtime` | Node.js | Runtime version compatibility (`>= 20.0.0`) |
| `config_file` | Configuration | Existence and parse validity of `solarch.config.ts` |
| `data_directory` | Filesystem | Read and write permissions on `pb_data/` directory |
| `database_connectivity` | Database | Active SQLite WAL connection or PostgreSQL pool handshake |
| `migrations` | Schema | Applied vs pending migrations in `pb_migrations/` |
| `superuser` | Admin Accounts | Presence of at least one active superuser account |

---

## 2. Common Issues & Solutions

### Port Collision (`EADDRINUSE: address already in use :::8090`)

**Symptom**: Server fails to start with `Error: listen EADDRINUSE: address already in use :::8090`.

**Solutions**:
1. Specify an alternative port:
   ```bash
   solarch dev --port 8091
   ```
2. Or update `solarch.config.ts`:
   ```typescript
   export default {
     port: 8091,
   }
   ```
3. Or identify and terminate the process holding port 8090:
   ```bash
   lsof -i :8090
   kill -9 <PID>
   ```

---

### Database Locked / SQLite Busy (`SQLITE_BUSY: database is locked`)

**Symptom**: SQLite queries fail under concurrent write load.

**Solutions**:
1. Solarch enables **Write-Ahead Logging (WAL)** mode automatically. Ensure no external processes or GUI viewers have opened the `.db` file with an exclusive lock.
2. Check file permissions on `pb_data/`:
   ```bash
   chmod -R 755 ./pb_data
   ```
3. If running in multi-instance production, migrate to PostgreSQL:
   ```bash
   solarch config set database.type postgres
   ```

---

### PostgreSQL Connection Failure (`ECONNREFUSED` / `password authentication failed`)

**Symptom**: PostgreSQL handshake fails when starting server or running migrations.

**Solutions**:
1. Test your connection string with doctor:
   ```bash
   solarch doctor --db postgres --db-url "postgres://user:pass@localhost:5432/dbname"
   ```
2. Verify that your PostgreSQL server is active:
   ```bash
   # If using Docker Compose (e.g. SaaS template)
   docker-compose up -d postgres
   ```
3. Ensure `DATABASE_URL` in `.env` is correctly formatted:
   ```dotenv
   DATABASE_URL=postgres://solarch:password@localhost:5432/solarch_db
   ```

---

### Missing Environment Secrets Warning

**Symptom**: `solarch doctor` reports `Missing required secret: SOLARCH_JWT_SECRET`.

**Solution**:
Run the automatic secret generator to populate missing cryptographic keys safely:
```bash
solarch env generate
```

---

### Unapplied Migrations Warning

**Symptom**: `solarch status` or `solarch doctor` indicates `X pending migrations`.

**Solution**:
Apply the pending schema migrations:
```bash
solarch migrate up
```

---

### Superuser Account Not Configured

**Symptom**: `solarch doctor` warns: `No superuser account exists`.

**Solution**:
Create an administrator account using the interactive command:
```bash
solarch superuser
```
Or shorthand:
```bash
solarch superuser-create admin@example.com MySecretPassword123!
```

---

### Corrupted Local State

**Symptom**: Development database is in an inconsistent state during local testing.

**Solution**:
Reset your local development state:
```bash
solarch project reset --yes
```
This clears `pb_data/`, regenerates fresh databases, and re-applies all migrations.
