# Getting Started with Solarch

Welcome to **Solarch** — a lightweight, modular backend engine designed for developers who want the simplicity of SQLite with an instant upgrade path to scalable PostgreSQL.

This guide walks you through your first 10 minutes with Solarch: installing the CLI, scaffolding a project, starting the development server, exploring endpoints, and validating system health.

---

## 1. Prerequisites

- **Node.js**: `v20.0.0` or higher (`node -v`)
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **Database (optional)**: SQLite is embedded out-of-the-box with zero setup. PostgreSQL is optional.

---

## 2. Installation

Install the Solarch CLI globally via npm:

```bash
npm install -g solarch
```

Verify your installation:

```bash
solarch version
```

Output:
```text
⚡ Solarch CLI

Version:
0.19.5

Node:
v22.22.3

Platform:
darwin-arm64
```

> **Note:** You can also run Solarch directly without global installation using `npx solarch <command>`.

---

## 3. Creating Your First Project

Solarch features an interactive initialization wizard with starter templates and configuration presets.

### Interactive Creation

Run the `init` command in your terminal:

```bash
solarch init
```

The interactive wizard guides you through:
1. **Starter Template**: Minimal, API Backend, Realtime, Full SaaS, or AI Backend.
2. **Project Name**: Name of your project directory (e.g., `my-backend`).
3. **Database Provider**: SQLite (zero-config file database) or PostgreSQL.
4. **Authentication Providers**: Email/password, Google, GitHub, Discord.
5. **Security & Rate Limiting**: Enable/disable rate limiting middleware.
6. **AI Tools**: Enable/disable integrated LLM tools and vector embeddings.
7. **Review & Confirmation**: Review your architectural plan before generating files.

### Non-Interactive Creation (CLI Flags)

You can also scaffold non-interactively using CLI flags:

```bash
# REST API with SQLite
solarch init --name my-api --template api --db sqlite --yes

# SaaS Backend with PostgreSQL
solarch init --name my-saas --template saas --db postgres --db-url "postgres://user:pass@localhost:5432/mydb" --yes

# Preview scaffolding plan without writing to disk
solarch init --template realtime --dry-run
```

---

## 4. Understanding the Project Structure

A newly initialized Solarch project contains the following architecture:

```text
my-api/
├── solarch.config.ts      # Main backend configuration (port, db, auth, rate limiting)
├── .env                   # Environment secrets (JWT secret, encryption keys)
├── pb_data/               # Embedded SQLite database files (WAL mode)
│   ├── data.db
│   └── auxiliary.db
├── pb_migrations/         # Database schema migrations
│   ├── 001_create_users.js
│   └── 002_create_posts.js
└── src/
    └── hooks/             # Custom lifecycle and webhook handlers (if applicable)
```

### Key Files Explained:
- **`solarch.config.ts`**: Declarative TypeScript configuration defining port, database connections, authentication providers, and feature flags.
- **`.env`**: Cryptographically secure secrets (`SOLARCH_JWT_SECRET`, `SOLARCH_ENCRYPTION_KEY`) generated automatically during project creation.
- **`pb_migrations/`**: Plain JavaScript/TypeScript migration files with reversible `up(app)` and `down(app)` methods.
- **`pb_data/`**: Runtime storage for SQLite databases, local backups, and cache logs.

---

## 5. Starting the Development Server

Navigate into your project directory and launch the interactive development server:

```bash
cd my-api
solarch dev
```

The dev server starts with:
- **Instant Hot Reloading**: Watches `solarch.config.ts`, `.env`, migrations, and hook files.
- **Diagnostics Check**: Pre-flight environment and database health check on startup.
- **Interactive Keyboard Controls**:
  - Press <kbd>r</kbd> to restart the server.
  - Press <kbd>d</kbd> to run doctor diagnostics.
  - Press <kbd>c</kbd> to clear the console.
  - Press <kbd>q</kbd> to quit gracefully.

```text
⚡ Solarch Dev Server v0.19.5

  Local:   http://localhost:8090
  Admin:   http://localhost:8090/_/
  REST:    http://localhost:8090/api/
  Health:  http://localhost:8090/api/health

[INFO] Database connected (sqlite, WAL mode)
[INFO] 2 migration(s) ready
[INFO] Server listening on http://127.0.0.1:8090
```

---

## 6. Inspecting API Routes

To explore all automatically generated REST endpoints, authentication routes, and realtime subscriptions:

```bash
solarch routes
```

This displays a structured table of available endpoints:
- `GET /api/collections/:c/records` (List records)
- `POST /api/collections/:c/records` (Create record)
- `POST /api/collections/:c/auth-with-password` (Authenticate user)
- `GET /api/realtime` (Server-Sent Events subscriptions)
- `WS /realtime` (WebSocket subscriptions)

---

## 7. Running Diagnostics

Validate the health of your environment, configuration, database connectivity, and permissions anytime using `solarch doctor`:

```bash
solarch doctor
```

Output:
```text
⚡ Solarch Doctor Diagnostics

  ✔ Node.js Runtime: v22.22.3 (compatible: >= 20.0.0)
  ✔ Configuration File: Loaded solarch.config.ts (with .env)
  ✔ Data Directory: pb_data (read/write verified)
  ✔ Database Connectivity: Connected to sqlite (WAL mode)
  ✔ Database Migrations: 2 applied, 0 pending
  ✔ Superuser Status: 1 superuser active

Status: Healthy (6/6 checks passed)
```

---

## 8. Next Steps

Now that your Solarch backend is running:
- **Explore Starter Templates**: Read the [Templates Guide](templates.md) to learn about SaaS, Realtime, and AI architectures.
- **Scaffold Resources**: Use `solarch generate collection <name>` to create new collections. See [Development Workflow](development.md).
- **Manage Migrations**: Learn about database migrations in [Migrations Guide](migrations.md).
- **CLI Commands**: View the full command catalog in [CLI Reference](cli-reference.md).
