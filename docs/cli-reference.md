# Solarch CLI Reference

Complete reference manual for the Solarch command-line interface.

---

## Global Options

The following flags apply to the root `solarch` program or can be used across subcommands:

| Option | Type | Default | Description |
|---|---|---|---|
| `-h, --help` | Flag | — | Display help information for any command |
| `-V, --version` | Flag | — | Output version number |
| `--dir <path>` | String | `./pb_data` / `.` | Target project or data directory |
| `--db <provider>` | String | `sqlite` | Database provider (`sqlite` \| `postgres`) |
| `--db-url <url>` | String | — | Database connection string |
| `--db-driver <driver>` | String | — | Database driver (`postgres` \| `neon`) |
| `--db-mode <mode>` | String | — | Driver connection mode (`tcp` \| `http` \| `websocket`) |
| `--query-timeout <seconds>` | Integer | `30` | Query execution timeout in seconds |
| `--dev` | Flag | `false` | Enable developer mode |

---

## Command Catalog

```text
solarch
├── init                      Create a new Solarch project
├── template
│   ├── list                  List starter templates
│   └── info <name>           Inspect a starter template
├── dev                       Start interactive development server
├── serve                     Start production server
├── logs                      Stream runtime application logs
├── routes                    Explore REST routes and realtime endpoints
├── generate
│   ├── collection <name>     Scaffold database collection migration
│   ├── migration <name>      Scaffold schema migration file
│   └── hook <name>           Scaffold application lifecycle hook
├── config
│   ├── show                  Display effective resolved configuration
│   ├── validate              Validate configuration before starting server
│   └── set <key> <value>     Modify safe configuration values
├── env
│   ├── check                 Validate environment secrets
│   ├── generate              Generate missing environment secrets
│   └── show                  Display environment variables safely
├── migrate
│   ├── up                    Run pending migrations
│   ├── down [count]          Rollback migrations
│   ├── status                Show migration table status
│   └── create <name>         Create new migration file
├── doctor                    Diagnose environment and database health
├── status                    Show runtime health and database status
├── inspect
│   ├── project               Show project identity and runtime metadata
│   ├── database              Inspect database connection and capabilities
│   ├── features              Inspect enabled features and authentication
│   └── dependencies          Inspect dependency compatibility
├── project
│   ├── path                  Display resolved project directory paths
│   ├── clean                 Remove runtime data and caches
│   └── reset                 Reset local runtime state and re-validate
├── superuser                 Manage superuser accounts
└── version                   Display detailed runtime and platform information
```

---

## 1. Project Creation & Templates

### `solarch init` (alias: `solarch create`)
Create a new Solarch project with interactive prompts or CLI flags.

**Usage:**
```bash
solarch init [options]
```

**Options:**
- `-y, --yes`: Accept defaults without prompting
- `--name <name>`: Project name (default: `my-app`)
- `--template <template>`: Starter template (`minimal`, `api`, `realtime`, `saas`, `ai`)
- `--preset <preset>`: Configuration preset (`development`, `production`, `testing`)
- `--dry-run`: Preview scaffolding plan without writing to disk
- `--db <provider>`: Database provider (`sqlite` \| `postgres`)
- `--db-url <url>`: Database connection URL (required for PostgreSQL)
- `--auth <providers>`: Comma-separated auth providers (`email`, `google`, `github`, `discord`)
- `--rate-limit <true|false>`: Enable/disable rate limiting (default: `true`)
- `--ai <true|false>`: Enable/disable AI tools (default: `false`)
- `--force`: Force scaffolding even if target directory is not empty
- `--dir <path>`: Parent directory to create project in

**Examples:**
```bash
solarch init
solarch init --name my-api --template api --yes
solarch init --template saas --db postgres --db-url "postgres://user:pass@localhost:5432/mydb" --yes
solarch init --template ai --dry-run
```

---

### `solarch template list`
List all available starter backend architecture templates.

**Usage:**
```bash
solarch template list [options]
```

**Options:**
- `--json`: Output template catalog as JSON

**Examples:**
```bash
solarch template list
solarch template list --json
```

---

### `solarch template info <name>`
Inspect detailed schema, migrations, hooks, and requirements for a specific template.

**Usage:**
```bash
solarch template info <name> [options]
```

**Options:**
- `--json`: Output template metadata as JSON

**Examples:**
```bash
solarch template info saas
solarch template info realtime --json
```

---

## 2. Development & Server

### `solarch dev`
Start the interactive development server with file watching, hot reloading, and keyboard controls.

**Usage:**
```bash
solarch dev [options]
```

**Options:**
- `--port <number>`: Server port (default: `8090`)
- `--dir <path>`: Project root directory
- `--no-watch`: Disable filesystem watcher
- `--verbose`: Enable verbose logging

**Keyboard Controls:**
- <kbd>r</kbd>: Restart development server
- <kbd>d</kbd>: Run doctor diagnostics
- <kbd>c</kbd>: Clear terminal output
- <kbd>q</kbd>: Gracefully exit

**Examples:**
```bash
solarch dev
solarch dev --port 3000 --verbose
solarch dev --dir ./my-api
```

---

### `solarch serve`
Start the production server without development watcher.

**Usage:**
```bash
solarch serve [options]
```

**Options:**
- `--port <number>`: Server port (default: `8090`)
- `--dir <path>`: Data directory (default: `./pb_data`)
- `--hideStartBanner`: Suppress startup banner
- `--db <provider>`: Database provider override
- `--db-url <url>`: Database connection URL override

**Examples:**
```bash
solarch serve
solarch serve --port 8080 --hideStartBanner
```

---

### `solarch logs`
View and stream runtime application logs with log-level filtering.

**Usage:**
```bash
solarch logs [options]
```

**Options:**
- `-f, --follow`: Continuously stream logs (tail mode)
- `--level <level>`: Filter by level (`DEBUG`, `INFO`, `WARN`, `ERROR`)
- `--tail <number>`: Number of recent lines to display (default: `50`)
- `--dir <path>`: Project root directory
- `--json`: Output log entries as JSON array

**Examples:**
```bash
solarch logs
solarch logs --follow --level ERROR
solarch logs --tail 100 --json
```

---

### `solarch routes`
Explore registered REST routes, realtime subscriptions, and active middleware.

**Usage:**
```bash
solarch routes [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--json`: Output routes report as JSON

**Examples:**
```bash
solarch routes
solarch routes --json
```

---

## 3. Resource Generators

### `solarch generate collection <name>`
Scaffold a new database collection schema migration.

**Usage:**
```bash
solarch generate collection <name> [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--force`: Force overwrite existing migration file
- `--json`: Output generation result as JSON

**Examples:**
```bash
solarch generate collection products
solarch generate collection orders --force
```

---

### `solarch generate migration <name>`
Scaffold a new blank database schema migration file.

**Usage:**
```bash
solarch generate migration <name> [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--force`: Force overwrite existing migration file
- `--json`: Output generation result as JSON

**Examples:**
```bash
solarch generate migration add_indexes
solarch generate migration alter_users_table
```

---

### `solarch generate hook <name>`
Scaffold a new application lifecycle hook file in `src/hooks/`.

**Usage:**
```bash
solarch generate hook <name> [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--force`: Force overwrite existing hook file
- `--json`: Output generation result as JSON

**Examples:**
```bash
solarch generate hook stripe_webhook
solarch generate hook audit_tracker
```

---

## 4. Diagnostics & Inspection

### `solarch doctor` (alias: `solarch check`)
Run deep diagnostics across Node.js runtime, config, database connectivity, and permissions.

**Usage:**
```bash
solarch doctor [options]
```

**Options:**
- `--dir <path>`: Project or data directory to check
- `--json`: Output diagnostic report as JSON

**Examples:**
```bash
solarch doctor
solarch doctor --dir ~/projects/my-api --json
```

---

### `solarch status`
Display runtime health, database connection state, applied migrations, and admin status.

**Usage:**
```bash
solarch status [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--json`: Output status as JSON

**Examples:**
```bash
solarch status
solarch status --json
```

---

### `solarch info` (alias: `solarch about`)
Display static project metadata, version information, and configuration summary.

**Usage:**
```bash
solarch info [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--json`: Output info as JSON

**Examples:**
```bash
solarch info
```

---

### `solarch inspect project`
Inspect project identity, environment mode, configuration paths, and platform metadata.

**Usage:**
```bash
solarch inspect project [options]
```

**Options:**
- `--dir <path>`: Project root directory
- `--json`: Output inspection as JSON

---

### `solarch inspect database`
Inspect database configuration, active driver, connection parameters, and capabilities.

**Usage:**
```bash
solarch inspect database [options]
```

---

### `solarch inspect features`
Inspect enabled authentication providers, rate limiting, and AI capabilities.

**Usage:**
```bash
solarch inspect features [options]
```

---

### `solarch inspect dependencies`
Inspect runtime dependency compatibility and `@solarch/core-client` version.

**Usage:**
```bash
solarch inspect dependencies [options]
```

---

## 5. Configuration & Environment

### `solarch config show`
Display the fully resolved application configuration merged with environment variables.

**Usage:**
```bash
solarch config show [options]
```

---

### `solarch config validate`
Validate `solarch.config.ts` against the runtime schema.

**Usage:**
```bash
solarch config validate [options]
```

---

### `solarch config set <key> <value>`
Modify safe configuration parameters directly from the CLI.

**Usage:**
```bash
solarch config set <key> <value> [options]
```

**Examples:**
```bash
solarch config set port 3000
solarch config set rateLimiting.enabled false
```

---

### `solarch env check`
Validate `.env` file for required cryptographic secrets.

**Usage:**
```bash
solarch env check [options]
```

---

### `solarch env generate`
Safely generate missing cryptographic secrets without overwriting existing keys.

**Usage:**
```bash
solarch env generate [options]
```

**Options:**
- `--force`: Force regeneration of existing secrets
- `-y, --yes`: Skip confirmation prompt in force mode
- `--dir <path>`: Project root directory

---

### `solarch env show`
Display environment configuration safely with masked secrets.

**Usage:**
```bash
solarch env show [options]
```

---

## 6. Database Migrations

### `solarch migrate up`
Run all pending schema migrations.

**Usage:**
```bash
solarch migrate up [options]
```

---

### `solarch migrate down [count]`
Rollback applied migrations.

**Usage:**
```bash
solarch migrate down [count] [options]
```

**Examples:**
```bash
solarch migrate down
solarch migrate down 3
```

---

### `solarch migrate status`
Show status of applied and pending migrations.

**Usage:**
```bash
solarch migrate status [options]
```

---

### `solarch migrate create <name>`
Create a new timestamped migration file in `pb_migrations/`.

**Usage:**
```bash
solarch migrate create <name> [options]
```

**Examples:**
```bash
solarch migrate create add_user_roles
```

---

## 7. Project Lifecycle

### `solarch project path`
Display absolute file paths for project root, configuration, database, and migrations.

**Usage:**
```bash
solarch project path [options]
```

---

### `solarch project clean`
Remove temporary runtime artifacts (`coverage/`, `.tmp/`, log files).

**Usage:**
```bash
solarch project clean [options]
```

**Options:**
- `-y, --yes`: Skip confirmation prompt

---

### `solarch project reset`
Reset local runtime state (`pb_data/`) and re-validate project health.

**Usage:**
```bash
solarch project reset [options]
```

**Options:**
- `-y, --yes`: Skip confirmation prompt

---

## 8. Administration

### `solarch superuser`
Create a superuser administrator account with interactive prompts.

**Usage:**
```bash
solarch superuser [options]
```

**Options:**
- `--email <email>`: Superuser email address
- `--password <password>`: Superuser password

---

### `solarch superuser-create [email] [password]`
Create a superuser account directly via arguments.

**Usage:**
```bash
solarch superuser-create admin@solarch.dev MySecurePassword123!
```
