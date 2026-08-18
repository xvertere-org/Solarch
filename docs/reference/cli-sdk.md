---
title: "CLI & SDK Reference"
description: "Complete command-line interface syntax and TypeScript SDK reference."
slug: "reference/cli-sdk"
---

# CLI & SDK Reference

Complete technical reference for the `solarch` command-line tool and TypeScript programmatic APIs.

---

## 1. CLI Reference ([src/cli.ts](../../src/cli.ts))

### Usage Syntax
```bash
solarch [command] [options]
```

### Global Options
- `--dev`: Enable development mode with verbose error logging ([src/cli.ts:L23](../../src/cli.ts#L23)).
- `--dir <path>`: Path to the data directory (default: `./pb_data`) ([src/cli.ts:L24](../../src/cli.ts#L24)).
- `--encryptionEnv <env>`: Environment variable name holding encryption salt ([src/cli.ts:L25](../../src/cli.ts#L25)).
- `--queryTimeout <seconds>`: Maximum database query timeout in seconds (default: `30`) ([src/cli.ts:L26](../../src/cli.ts#L26)).

---

### Commands

#### `solarch serve` ([src/cli.ts:L29](../../src/cli.ts#L29))
Start the HTTP server and database services.
- `--port <number>`: Port number to bind (default: `8090`).
- `--hideStartBanner`: Hide the terminal ASCII banner output.

```bash
solarch serve --port 8090 --dev
```

#### `solarch init` ([src/cli.ts](../../src/cli.ts))
Project scaffolding wizard with interactive prompts and deterministic non-interactive flags.
- `-y, --yes`: Accept default configuration without prompting (`my-app`, SQLite, email auth, rate limiting enabled, AI tools disabled).
- `--name <name>`: Project directory and app name (default: `my-app`).
- `--db <provider>`: Database provider (`sqlite` | `postgres`, default: `sqlite`).
- `--db-url <url>`: PostgreSQL database connection URL (required when `--db postgres`).
- `--auth <providers>`: Comma-separated auth providers (`email, google, github, discord`, default: `email`).
- `--rate-limit <true|false>`: Enable/disable rate limiting (default: `true`).
- `--ai <true|false>`: Enable/disable AI schema assistant (default: `false`).
- `--force`: Force scaffolding even if the target directory already exists and is non-empty.
- `--dir <path>`: Parent directory to create the project in (default: `.`).

```bash
# Interactive setup
solarch init

# Non-interactive quickstart (defaults)
solarch init -y

# Non-interactive custom project
solarch init -y --name backend --db postgres --db-url "postgres://user:pass@localhost:5432/db"
```

#### `solarch superuser-create` ([src/cli.ts:L66](../../src/cli.ts#L66))
Create a new superuser account non-interactively.

```bash
solarch superuser-create admin SecretPass123 --dir ./pb_data
```

#### `solarch migrate up` ([src/cli.ts:L86](../../src/cli.ts#L86))
Execute all pending database migration scripts.

#### `solarch migrate down [count]` ([src/cli.ts:L102](../../src/cli.ts#L102))
Rollback `count` database migration steps (default: `1`).

#### `solarch migrate status` ([src/cli.ts:L118](../../src/cli.ts#L118))
Display tabular status of applied and pending migrations.

#### `solarch migrate create <name>` ([src/cli.ts](../../src/cli.ts))
Generate a new boilerplate JavaScript migration script.

#### `solarch doctor` / `solarch check` ([src/cli.ts](../../src/cli.ts))
Run non-destructive diagnostic health checks on Node.js runtime, configuration, database connectivity, filesystem permissions, migrations state, and superusers.
- `--dir <path>`: Path to runtime data directory (default: `./pb_data`).
- `--db <provider>`: Database provider override (`sqlite` | `postgres`).
- `--db-url <url>`: Database connection string override.
- `--json`: Output report as formatted JSON (ideal for CI/CD).

```bash
# Run diagnostics in terminal
solarch doctor

# Output as JSON in CI
solarch doctor --json
```

---

## 2. TypeScript SDK Reference

### `Solarch` Class ([src/solarch.ts:L32](../../src/solarch.ts#L32))

Extends `BaseApp` to manage initialization, migration execution, and HTTP server startup.

```typescript
import { Solarch, SolarchConfig } from 'solarch'

const config: SolarchConfig = {
  defaultDev: true,
  defaultDataDir: './pb_data',
  defaultQueryTimeout: 30,
}

const app = new Solarch(config)
```

#### Class Methods
- `start(port?: number): Promise<void>`: Initialize database, apply migrations, load JS hooks, and start HTTP server ([src/solarch.ts:L55](../../src/solarch.ts#L55)).
- `bootstrap(): Promise<void>`: Initialize database connections without starting HTTP server ([src/core/base.ts:L99](../../src/core/base.ts#L99)).
- `migrate(): Promise<void>`: Run pending database migrations ([src/solarch.ts:L119](../../src/solarch.ts#L119)).
- `migrateDown(count?: number): Promise<void>`: Rollback database migrations ([src/solarch.ts:L127](../../src/solarch.ts#L127)).
- `findCollectionByNameOrId(nameOrId: string): Promise<Collection | null>`: Fetch collection model ([src/core/base.ts:L310](../../src/core/base.ts#L310)).
- `saveRecord(record: RecordModel): Promise<void>`: Validate and persist a record ([src/core/base.ts:L450](../../src/core/base.ts#L450)).
- `deleteRecord(record: RecordModel): Promise<void>`: Delete a record ([src/core/base.ts:L490](../../src/core/base.ts#L490)).

---

## Common Errors

### Error: `unknown command 'foo'`
- **Cause**: Entered an invalid CLI command name.
- **Fix**: Run `solarch --help` to list supported CLI commands.
