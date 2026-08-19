---
title: "CLI & SDK Reference"
description: "Complete command-line interface syntax and TypeScript SDK reference."
slug: "reference/cli-sdk"
---

# CLI & SDK Reference

Complete technical reference for the `solarch` command-line tool, interactive Terminal UI (TUI), and TypeScript programmatic APIs.

---

## 1. CLI Reference ([src/cli.ts](../../src/cli.ts))

### CLI Overview

Solarch CLI provides a unified developer backend experience across project creation, local development, environment management, database migrations, and diagnostics.

```bash
# Launch interactive developer menu
solarch

# Display grouped command help
solarch --help

# Display detailed runtime & platform version
solarch version
```

### Command Groups & Aliases

| Group | Command | Alias | Description |
|---|---|:---:|---|
| **PROJECT** | `solarch init` | `create` | Interactive project scaffolding wizard |
| | `solarch project` | — | Local project lifecycle (paths, clean, reset) |
| **DEVELOPMENT** | `solarch dev` | — | Interactive development server with file watching & hotkeys |
| | `solarch serve` | — | Production-oriented server daemon |
| | `solarch logs` | — | View runtime application logs with filtering & streaming |
| | `solarch routes` | — | Explore REST routes, realtime subscriptions & middleware |
| | `solarch generate` | — | Scaffold collections, schema migrations & hooks |
| **CONFIGURATION** | `solarch config` | — | Application configuration management (`show`, `validate`, `set`) |
| | `solarch env` | — | Environment variable & secret management (`check`, `generate`, `show`) |
| **DATABASE** | `solarch migrate` | — | Database schema migration lifecycle (`up`, `down`, `status`, `create`) |
| **INSPECTION** | `solarch doctor` | `check` | Non-destructive diagnostic health checks |
| | `solarch status` | — | High-level operational health dashboard |
| | `solarch inspect` | `ls` | Deep structural inspection (`project`, `database`, `features`, `dependencies`) |
| | `solarch info` | `about` | Static project metadata and configuration overview |
| **ACCOUNT** | `solarch superuser` | — | Admin superuser management |

---

### Usage Syntax
```bash
solarch [command] [options]
```

### Global Options
- `--dev`: Enable development mode with verbose error logging.
- `--dir <path>`: Path to the runtime data directory (default: `./pb_data`).
- `--data-dir <path>`: Data directory alias.
- `--db <provider>`: Database provider override (`sqlite` | `postgres`).
- `--db-url <url>`: Database connection URL override.
- `--database-url <url>`: Database connection URL alias.
- `--db-driver <driver>`: Database driver (`postgres` | `neon`).
- `--db-mode <mode>`: Database connection mode (`tcp` | `http` | `websocket`).
- `--query-timeout <seconds>`: Maximum database query timeout in seconds (default: `30`).
- `--queryTimeout <seconds>`: Query timeout alias.
- `--encryptionEnv <env>`: Environment variable name holding encryption salt.

---

### Commands

#### `solarch init` / `solarch create` ([src/cmd/init/index.ts](../../src/cmd/init/index.ts))
Interactive Terminal UI (TUI) project scaffolding wizard powered by `@clack/prompts`, with automated template selection, presets, live review cards, progress spinners, and integrated doctor verification.

**Options**:
- `-y, --yes`: Accept default configuration non-interactively without prompts.
- `--name <name>`: Project directory and application name (default: `my-app`).
- `--template <name>`: Starter architecture template (`minimal`, `api`, `realtime`, `saas`, `ai`).
- `--preset <name>`: Configuration preset (`development`, `production`, `testing`).
- `--dry-run`: Output scaffolding file plan without writing changes to disk.
- `--db <provider>`: Database provider (`sqlite` | `postgres`, default: `sqlite`).
- `--db-url <url>`: PostgreSQL database connection URL.
- `--auth <providers>`: Comma-separated auth providers (`email, google, github, discord`).
- `--rate-limit <true|false>`: Enable/disable API rate limiting (default: `true`).
- `--ai <true|false>`: Enable/disable Solarch AI tools (default: `false`).
- `--force`: Force scaffolding even if the target directory already exists and is not empty.
- `--dir <path>`: Parent directory to create the project in (default: `.`).

**Built-in Architecture Templates**:
- `minimal`: Barebones Solarch setup with basic configuration and schema baseline (`001_init.js`).
- `api`: Production-ready REST backend with email auth, rate limiting, and users/posts schema (`001_create_users.js`, `002_create_posts.js`).
- `realtime`: Real-time collaborative backend with live subscriptions and event streaming hook (`001_create_events.js`, `src/hooks/realtime.ts`).
- `saas`: Full-stack SaaS architecture with organizations, OAuth, audit logs, and billing hooks (`001_create_users.js`, `002_create_organizations.js`, `003_create_audit_logs.js`, `src/hooks/billing.ts`).
- `ai`: AI-first backend with embeddings, vector search, and LLM chat completions (`001_create_vectors.js`).

**Interactive Workflow**:
1. **Intent Selection**: Choose from intent cards (`API Backend`, `SaaS Application`, `Realtime Application`, `AI Backend`, or `Custom / Minimal`).
2. **Project Name & Engine**: Configure project name, target directory, and database engine (`SQLite` or `PostgreSQL`).
3. **Template Preview Card**: Displays a formatted preview of included models, features, migrations, and hooks.
4. **Execution Spinners & Doctor Gate**: Runs deterministic secret generation, writes template migrations, and verifies zero-friction bootability with internal health checks.

```bash
# Interactive TUI wizard
solarch init

# Scaffold SaaS template with OAuth and billing hooks
solarch init --template saas --name my-saas

# Preview scaffolding plan without creating files
solarch init --template saas --dry-run

# Non-interactive quickstart with production PostgreSQL preset
solarch init -y --name backend --preset production --db-url "postgres://user:pass@localhost:5432/dbname"
```

---

#### `solarch template list` / `solarch template info` ([src/cmd/template/index.ts](../../src/cmd/template/index.ts))
Explore, inspect, and evaluate built-in starter backend architecture templates.

**Subcommands**:
- `solarch template list`: Output a catalog of all available starter templates (`minimal`, `api`, `realtime`, `saas`, `ai`).
- `solarch template info <name>`: Show full details, recommended databases, included features, migration scripts, and hooks for a given template.

**Options**:
- `--json`: Output template catalog or details as JSON.

```bash
# List all starter templates
solarch template list

# Inspect SaaS architecture in detail
solarch template info saas

# Export template catalog as JSON
solarch template list --json
```

---

#### `solarch serve` ([src/cmd/serve.ts](../../src/cmd/serve.ts))
Start the HTTP server and database services.

**Options**:
- `--port <number>`: Port number to bind (default: `8090`).
- `--hideStartBanner`: Suppress startup terminal ASCII banner.
- `--dir <path>`: Runtime data directory.
- `--db <provider>`: Database provider override.
- `--db-url <url>`: Connection URL override.

```bash
# Start server on default port 8090
solarch serve

# Start server on custom port with dev mode
solarch serve --port 3000 --dev
```

---

#### `solarch dev` ([src/cmd/dev/index.ts](../../src/cmd/dev/index.ts))
The primary local development engine for Solarch. Starts an interactive development server with automated preflight diagnostics, filesystem watching, hot reboots, and terminal hotkey controls.

> **`solarch serve` vs `solarch dev`**:
> - **`solarch serve`**: Production-oriented, static daemon process. Starts HTTP/database listeners directly without file watchers, hot reloading, or interactive hotkeys. Ideal for CI, containers, and production deployments.
> - **`solarch dev`**: Developer-centric, interactive workflow. Automatically enables `dev=true`, runs preflight `doctor` validation before boot, watches `src/`, `pb_migrations/`, and `solarch.config.*` for changes with debounced reboots, and provides keyboard controls (`r`, `l`, `d`, `q`).

**Interactive Controls**:
- `r`: Trigger immediate graceful server reboot.
- `l`: Display latest captured request logs.
- `d`: Run interactive `doctor` diagnostic checks.
- `q`: Gracefully shut down HTTP listeners, flush database checkpoints, and exit.

**Options**:
- `--port <number>`: Port number to bind (default: `8090`).
- `--dir <path>`: Project directory to execute in (default: `.`).
- `--no-watch`: Disable filesystem watching.
- `--verbose`: Enable detailed debug output.

```bash
# Start development workflow
solarch dev

# Bind custom port without file watcher
solarch dev --port 3000 --no-watch
```

---

#### `solarch logs` ([src/cmd/logs/index.ts](../../src/cmd/logs/index.ts))
Provides runtime visibility by reading, filtering, and streaming application logs directly from the database and local filesystem.

**Options**:
- `-f, --follow`: Continuously stream new log entries (Ctrl+C exits cleanly).
- `--level <level>`: Filter entries by log level (`DEBUG`, `INFO`, `WARN`, `ERROR`).
- `--tail <number>`: Number of recent log lines to display (default: `50`).
- `--json`: Output logs as structured JSON array.
- `--dir <path>`: Project directory override.

```bash
# View recent logs
solarch logs

# Stream logs in real-time
solarch logs --follow

# Filter by ERROR level only
solarch logs --level error

# Output recent 100 logs as JSON
solarch logs --tail 100 --json
```

---

#### `solarch routes` ([src/cmd/routes/index.ts](../../src/cmd/routes/index.ts))
Exposes the complete API surface including REST CRUD endpoints, Auth handlers, Realtime SSE/WebSocket subscriptions, and active middleware.

**Options**:
- `--json`: Output full routing report as structured JSON.
- `--dir <path>`: Project directory override.

```bash
# Display terminal API discovery table
solarch routes

# Export routes schema as JSON
solarch routes --json
```

---

#### `solarch generate` ([src/cmd/generate/index.ts](../../src/cmd/generate/index.ts))
Developer scaffolding commands to quickly generate backend schema migrations, database collections, and lifecycle hooks with strict naming validation and overwrite safeguards.

**Subcommands**:
- `solarch generate collection <name>`: Scaffolds a new collection schema migration inside `pb_migrations/`.
- `solarch generate migration <name>`: Scaffolds a generic database migration with `up(app)` and `down(app)` handlers.
- `solarch generate hook <name>`: Scaffolds a new TypeScript lifecycle hook inside `src/hooks/`.

**Options**:
- `--force`: Overwrite existing files if they already exist.
- `--json`: Output generation result as structured JSON.
- `--dir <path>`: Project root directory override.

```bash
# Generate a new users collection migration
solarch generate collection users

# Generate a custom migration
solarch generate migration add_posts_table

# Generate an auth lifecycle hook
solarch generate hook auth
```

---

#### `solarch doctor` / `solarch check` ([src/cmd/doctor.ts](../../src/cmd/doctor.ts))
Run non-destructive diagnostic health checks on Node.js runtime compatibility, configuration files, environment variables, database connectivity, filesystem permissions, migration status, and superuser accounts.

**Options**:
- `--dir <path>`: Data directory override.
- `--db <provider>`: Database provider override.
- `--db-url <url>`: Connection string override.
- `--json`: Output report as formatted JSON (ideal for CI/CD pipelines).

**Exit Codes**:
- `0`: All systems healthy or warnings only.
- `1`: One or more fatal diagnostic checks failed.

```bash
# Terminal diagnostics
solarch doctor

# JSON report for CI/CD
solarch doctor --json
```

---

#### `solarch info` ([src/cmd/info.ts](../../src/cmd/info.ts))
Display static project metadata, Solarch version, database provider, authentication providers, and enabled feature flags without starting runtime services. Guarantees zero leakage of secrets, encryption keys, or database passwords.

**Options**:
- `--dir <path>`: Project root directory (default: `.`).
- `--json`: Output report as JSON.

```bash
# Terminal overview
solarch info

# JSON metadata export
solarch info --json
```

---

#### `solarch status` ([src/cmd/status.ts](../../src/cmd/status.ts))
Provide a runtime health overview of the project environment, configuration validity, database connectivity, pending migrations, and superuser accounts by leveraging the core doctor diagnostics engine.

**Options**:
- `--dir <path>`: Project root directory (default: `.`).
- `--json`: Output status report as JSON.

```bash
# Runtime status check
solarch status

# Scriptable JSON output
solarch status --json
```

---

#### `solarch superuser` ([src/cmd/superuser.ts](../../src/cmd/superuser.ts))
Create a superuser administrator account interactively with masked password input.

```bash
solarch superuser
```

#### `solarch superuser-create` ([src/cmd/superuser.ts](../../src/cmd/superuser.ts))
Create a superuser account non-interactively via positional arguments.

```bash
solarch superuser-create admin@example.com SecretPassword123 --dir ./pb_data
```

---

#### `solarch migrate` ([src/cmd/migrate.ts](../../src/cmd/migrate.ts))
Database schema migration lifecycle commands.

- `solarch migrate up`: Apply all pending database migration scripts.
- `solarch migrate down [count]`: Roll back `count` database migrations (default: `1`).
- `solarch migrate status`: Display tabular view of applied vs pending migrations.
- `solarch migrate create <name>`: Scaffold a new boilerplate JavaScript migration script in `./pb_migrations`.

```bash
# Apply pending migrations
solarch migrate up

# Check migration status
solarch migrate status

# Create a new migration
solarch migrate create add_users_table
```

---

#### `solarch env` ([src/cmd/env/index.ts](../../src/cmd/env/index.ts))
Comprehensive environment and secret management suite ensuring zero leakage of secrets, encryption keys, and credentials.

##### `solarch env check` ([src/cmd/env/check.ts](../../src/cmd/env/check.ts))
Validate project environment configuration, verifying that required JWT secrets, encryption keys, database connections, and active OAuth/AI credentials exist and meet format/length requirements.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output validation results as JSON.

```bash
# Validate local environment
solarch env check

# Validate in CI pipeline
solarch env check --json
```

##### `solarch env generate` ([src/cmd/env/generate.ts](../../src/cmd/env/generate.ts))
Generate missing cryptographic secrets (`SOLARCH_JWT_SECRET`, `JWT_SECRET`, `SOLARCH_ENCRYPTION_KEY`) using 256-bit cryptographic entropy. Preserves existing values unless `--force` is specified.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--force`: Force regeneration of existing secrets (prompts confirmation in interactive TTY).
- `-y, --yes`: Skip confirmation when using `--force`.
- `--json`: Output operation result as JSON.

```bash
# Safely generate missing secrets
solarch env generate

# Regenerate all secrets (e.g. for key rotation)
solarch env generate --force -y
```

##### `solarch env show` ([src/cmd/env/show.ts](../../src/cmd/env/show.ts))
Display the project's environment variables with complete redaction/masking of sensitive tokens, secrets, encryption keys, and database passwords.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output environment as masked JSON.

```bash
# Inspect masked environment variables
solarch env show

# Output masked variables as JSON
solarch env show --json
```

---

#### `solarch config` ([src/cmd/config/index.ts](../../src/cmd/config/index.ts))
Configuration management suite for inspecting resolved settings, pre-flight validation, and safe configuration updates.

> **`solarch env` vs `solarch config`**:
> - **`solarch env`**: Manages sensitive secrets, cryptographic keys, and environment variables stored in `.env` (e.g. `SOLARCH_JWT_SECRET`, `SOLARCH_ENCRYPTION_KEY`, OAuth secrets).
> - **`solarch config`**: Manages non-sensitive architectural project settings stored in `solarch.config.ts`, `solarch.config.js`, or `solarch.config.json` (e.g. `port`, `database.type`, `auth.providers`, `features.ai`).

##### `solarch config show` ([src/cmd/config/show.ts](../../src/cmd/config/show.ts))
Display effective resolved configuration across CLI flags, environment variables, configuration files, and defaults with zero secret leakage.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output resolved configuration as JSON.

```bash
# Terminal overview
solarch config show

# JSON format for tooling
solarch config show --json
```

##### `solarch config validate` ([src/cmd/config/validate.ts](../../src/cmd/config/validate.ts))
Perform comprehensive pre-flight validation across configuration syntax, database connectivity, required fields, and security secrets before booting the runtime server.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output validation report as JSON.

```bash
# Validate configuration health
solarch config validate

# CI/CD validation
solarch config validate --json
```

##### `solarch config set <key> <value>` ([src/cmd/config/set.ts](../../src/cmd/config/set.ts))
Safely modify non-sensitive configuration values in JSON configuration files (`solarch.config.json`). Rejects attempts to write secret values (which belong to `solarch env`) and provides exact file guidance for TypeScript configurations.

**Allowed fields**:
- `port` / `runtime.port`
- `database.type` / `database.url`
- `auth.providers`
- `features.ai` / `ai.enabled`
- `features.rateLimiting` / `rateLimiting.enabled`

```bash
# Change runtime port
solarch config set port 9000

# Enable AI features
solarch config set features.ai true

# Configure auth providers
solarch config set auth.providers "email,google,github"
```

---

#### `solarch inspect` ([src/cmd/inspect/index.ts](../../src/cmd/inspect/index.ts))
Local developer diagnostic and inspection suite giving developers complete read-only understanding of their project identity, database setup, enabled features, and runtime dependency compatibility.

> **`solarch inspect` vs `solarch doctor` vs `solarch status`**:
> - **`solarch inspect`**: Deep, structural, read-only inspection of project identity, database capabilities, enabled feature flags, and dependency versions.
> - **`solarch doctor`**: Comprehensive diagnostic health check identifying fatal issues, warnings, and permission failures.
> - **`solarch status`**: Quick operational health summary (node, config, database, migrations, superusers).

##### `solarch inspect project` ([src/cmd/inspect/project.ts](../../src/cmd/inspect/project.ts))
Show project name, Solarch version, active configuration file format, Node runtime, platform, and environment without exposing secrets.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output report as JSON.

```bash
solarch inspect project
solarch inspect project --json
```

##### `solarch inspect database` ([src/cmd/inspect/database.ts](../../src/cmd/inspect/database.ts))
Inspect database provider (`sqlite`, `postgres`, `mongodb`), storage location, connection status, database host/name, and engine capabilities (`transactions`, `migrations`, `wal`, `pooling`, `backups`).

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output report as JSON.

```bash
solarch inspect database
solarch inspect database --json
```

##### `solarch inspect features` ([src/cmd/inspect/features.ts](../../src/cmd/inspect/features.ts))
Inspect active Solarch features including authentication providers (`email`, `google`, `github`, `discord`), storage driver, realtime subsystem, AI tools, JavaScript hooks, and rate limiting.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output report as JSON.

```bash
solarch inspect features
solarch inspect features --json
```

##### `solarch inspect dependencies` ([src/cmd/inspect/dependencies.ts](../../src/cmd/inspect/dependencies.ts))
Inspect runtime dependency compatibility across Node.js runtime, Solarch core version, database drivers, and `@solarch/core-client` availability.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output report as JSON.

```bash
solarch inspect dependencies
solarch inspect dependencies --json
```

---

#### `solarch project` ([src/cmd/project/index.ts](../../src/cmd/project/index.ts))
Local project lifecycle management suite for inspecting resolved project paths, safe cleanup of runtime artifacts, and local database state resets.

> **`solarch project clean` vs `solarch project reset` vs `solarch migrate`**:
> - **`solarch project clean`**: Non-destructive cache and artifact cleanup. Deletes generated artifacts (`coverage/`, `.tmp/`, `logs/`, and optionally `pb_data/`), but strictly preserves `.env`, configuration files, migrations, and source code.
> - **`solarch project reset`**: Wipes local database state (`pb_data/`), recreates a fresh runtime data directory, and runs `doctor` validation checks to guarantee project readiness.
> - **`solarch migrate`**: Manages schema evolution and migrations forward/backward (`up`, `down`, `status`, `create`) without deleting unrelated runtime artifacts.

##### `solarch project path` ([src/cmd/project/path.ts](../../src/cmd/project/path.ts))
Display resolved project directory and core locations (configuration file, `pb_data`, `pb_migrations`).

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `--json`: Output paths as JSON.

```bash
solarch project path
solarch project path --json
```

##### `solarch project clean` ([src/cmd/project/clean.ts](../../src/cmd/project/clean.ts))
Safely purge temporary artifacts (`pb_data/`, `coverage/`, `.tmp/`, `logs/`, `.turbo/`). Strictly preserves source code, configuration files, environment secrets (`.env`), and migration scripts (`pb_migrations/`).

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `-y, --yes`: Skip interactive confirmation prompt.
- `--json`: Output cleanup report as JSON.

```bash
# Interactive cleanup
solarch project clean

# Scripted/CI cleanup
solarch project clean --yes
```

##### `solarch project reset` ([src/cmd/project/reset.ts](../../src/cmd/project/reset.ts))
Wipe local runtime database state (`pb_data/`), recreate fresh data storage, and run internal `doctor` diagnostics.

**Options**:
- `--dir <path>`: Target project directory (default: `.`).
- `-y, --yes`: Skip interactive confirmation prompt.
- `--json`: Output reset report as JSON.

```bash
# Interactive reset
solarch project reset

# Scripted/CI reset
solarch project reset --yes
```

---

## 2. TypeScript SDK Reference

### `Solarch` Class ([src/solarch.ts](../../src/solarch.ts))

Extends `BaseApp` to manage initialization, migration execution, and HTTP server lifecycle.

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
- `bootstrap(): Promise<void>`: Initialize database connections and validate secrets without starting HTTP server ([src/core/base.ts:L99](../../src/core/base.ts#L99)).
- `migrate(): Promise<void>`: Run pending database migrations ([src/solarch.ts:L119](../../src/solarch.ts#L119)).
- `migrateDown(count?: number): Promise<void>`: Roll back database migrations ([src/solarch.ts:L127](../../src/solarch.ts#L127)).
- `findCollectionByNameOrId(nameOrId: string): Promise<Collection | null>`: Fetch collection model ([src/core/base.ts:L310](../../src/core/base.ts#L310)).
- `saveRecord(record: RecordModel): Promise<void>`: Validate and persist a record ([src/core/base.ts:L450](../../src/core/base.ts#L450)).
- `deleteRecord(record: RecordModel): Promise<void>`: Delete a record ([src/core/base.ts:L490](../../src/core/base.ts#L490)).

---

## 3. Exit Codes & CI Invariants

| Exit Code | Meaning | Context |
|:---:|---|---|
| `0` | Success / Clean Exit | Normal command completion, user cancellation (`Ctrl+C`), healthy doctor diagnostics. |
| `1` | Error / Diagnostic Failure | Fatal pre-flight error, failed doctor check, migration failure, invalid credentials. |

### CI Compatibility
- All interactive commands (`solarch init`, `solarch superuser`) automatically detect `CI=true` or non-TTY stdin and bypass interactive prompt loops in favor of deterministic flags and exit codes.
- `solarch init -y` is guaranteed never to block in automated pipelines.
