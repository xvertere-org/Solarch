# Solarch ☀️

<p align="center">
  <b>The TypeScript-First Backend-as-a-Service Platform with Developer-First CLI Tooling</b><br>
  Embedded SQLite / Scalable PostgreSQL • Auto REST CRUD • Realtime WS/SSE • Auth • Vector Search • CLI Developer Experience — one dependency, zero external services.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/solarch"><img src="https://img.shields.io/npm/v/solarch.svg?style=flat-square&color=blue" alt="npm version"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/npm/dm/solarch.svg?style=flat-square&color=orange" href="https://www.npmjs.com/package/solarch" alt="Downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License">
</p>

---

## Table of Contents

- [Quick Start](#quick-start)
- [Starter Templates](#starter-templates)
- [CLI Command Surface](#cli-command-surface)
- [Developer Workflow](#developer-workflow)
- [Features](#features)
- [Admin Dashboard](#admin-dashboard)
- [Documentation Index](#documentation-index)
- [Comparison](#comparison)
- [License](#license)

---

## Quick Start

### 1. Install Solarch CLI

```bash
npm install -g solarch
```

### 2. Scaffold a Backend in 30 Seconds

```bash
# Interactive Project Wizard
solarch init

# Or scaffold a REST API directly
solarch init --name my-api --template api --yes
```

### 3. Launch the Interactive Dev Server

```bash
cd my-api
solarch dev
```

### 4. Validate System Health

```bash
solarch doctor
```

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

## Starter Templates

Solarch includes 5 pre-configured backend architecture templates:

| Template | Command | Key Capabilities | Recommended DB |
|---|---|---|---|
| **`minimal`** | `solarch init --template minimal` | Barebones backend baseline | SQLite |
| **`api`** | `solarch init --template api` | REST CRUD, User auth, Posts schema, Rate limiting | SQLite |
| **`realtime`** | `solarch init --template realtime` | Dual-protocol SSE & WebSockets, Events hook | SQLite |
| **`saas`** | `solarch init --template saas` | Multi-tenant Orgs, OAuth2, Audit logs, Billing hooks | PostgreSQL |
| **`ai`** | `solarch init --template ai` | Vector search, Embeddings collection, LLM Chat | SQLite / Postgres |

Explore templates: `solarch template list` • `solarch template info <name>`

---

## CLI Command Surface

The Solarch CLI covers your entire backend development and operational lifecycle:

```text
solarch

PROJECT CREATION & TEMPLATES
  init                        Create a new Solarch project (interactive / presets)
  template list               Explore available starter architecture templates
  template info <name>        Inspect template features, migrations, and requirements

DEVELOPMENT & RUNTIME
  dev                         Start interactive development server (hot reload & watch)
  serve                       Start production server
  logs                        Stream runtime application logs (--follow, --level)
  routes                      Explore REST routes and realtime endpoints

RESOURCE GENERATION
  generate collection <name>  Scaffold database collection schema migration
  generate migration <name>   Scaffold new schema migration file
  generate hook <name>        Scaffold application lifecycle hook

DIAGNOSTICS & INSPECTION
  doctor                      Diagnose environment, config, database, and permissions
  status                      Show runtime health, database status, and storage
  inspect project             Show project identity and runtime metadata
  inspect database            Inspect database connection, driver, and capabilities
  inspect features            Inspect enabled auth providers and capabilities
  inspect dependencies        Inspect dependency compatibility and client SDK

CONFIGURATION & ENVIRONMENT
  config show                 Display effective resolved configuration
  config validate             Validate solarch.config.ts schema
  config set <key> <value>    Modify safe configuration values
  env check                   Validate environment variables and secrets
  env generate                Generate missing cryptographic secrets safely
  env show                    Display environment variables (masked)

DATABASE MIGRATIONS
  migrate up                  Execute pending schema migrations
  migrate down [count]        Rollback migrations
  migrate status              View migration status table
  migrate create <name>       Create a new timestamped migration file

PROJECT LIFECYCLE
  project path                Show resolved directory and configuration paths
  project clean               Remove runtime artifacts, coverage, and logs
  project reset               Reset local runtime state and re-validate

ADMINISTRATION
  superuser                   Create or manage administrator accounts
  version                     Display detailed version and platform information
```

---

## Developer Workflow

```text
  solarch init (scaffold backend)
        ↓
  solarch dev (interactive watch server with hotkeys)
        ↓
  solarch generate collection products (add schema)
        ↓
  solarch routes (verify endpoints)
        ↓
  solarch logs -f (live stream & debug)
        ↓
  solarch doctor (pre-commit health check)
```

---

## Features

| Area | Highlights |
|---|---|
| **Database** | Dual SQLite engine (`data.db` + `auxiliary.db`, WAL mode) and native PostgreSQL pool driver |
| **Auth** | Email/password, OAuth2 (GitHub/Google/Discord), email OTP, TOTP MFA — all issuing JWTs |
| **Security** | Declarative access rules with `@request.*` macros, AES-256 encrypted secrets, IP+identity rate limiting |
| **Realtime** | WebSocket & Server-Sent Events (SSE) dual-protocol room subscriptions |
| **AI & Vector Search** | Cosine similarity vector search, embedding collections, LLM chat completions |
| **Code Generators** | Boilerplate-free generators for collections, migrations, and lifecycle hooks |
| **Diagnostics** | 6-point automated doctor diagnostics for Node.js runtime, configuration, and database health |
| **Extensibility** | Sandboxed JS/TS lifecycle hooks (`src/hooks/`), migrations (`pb_migrations/`), full Express access |

---

## Admin Dashboard

Manage your Solarch server graphically with the [Solarch Dashboard](https://github.com/xvertere-org/Solarch-Dashboard):

```bash
git clone https://github.com/xvertere-org/Solarch-Dashboard.git
cd Solarch-Dashboard
npm install && npm run dev
```

Connects directly to your Solarch backend at `http://localhost:8090` for collection editing, record browsing, log inspection, and schema management.

---

## Documentation Index

- 📖 **[Getting Started](docs/getting-started.md)** — First 10 minutes guide
- 📦 **[Installation Guide](docs/installation.md)** — System requirements and install options
- 🧩 **[Starter Templates](docs/templates.md)** — Minimal, API, Realtime, SaaS, and AI blueprints
- ⚡ **[CLI Reference](docs/cli-reference.md)** — Complete command, argument, and option catalog
- ⚙️ **[Configuration Guide](docs/configuration.md)** — `solarch.config.ts` reference and validation
- 🔐 **[Environment & Secrets](docs/environment.md)** — Secret generation and security best practices
- 💻 **[Development Workflow](docs/development.md)** — Daily developer loop and hotkeys
- 🗄️ **[Database Migrations](docs/migrations.md)** — Transactional DDL and cross-database types
- 🩺 **[Troubleshooting Playbook](docs/troubleshooting.md)** — Diagnostic checks and common fixes
- 🏗️ **[Architecture & Design](docs/architecture.md)** — Internal layering and execution models
- 🚀 **[Migration Guide (v0.19.0 → v0.19.5)](docs/migration-guide.md)** — Upgrading existing projects

---

## Comparison

| Feature | Solarch ☀️ | Express + Prisma + Auth | PocketBase | Firebase / Supabase |
|---|---|---|---|---|
| Setup time | **30 sec** | 2–4 hrs | 1 min | 15–30 min |
| CLI Experience | **Interactive TUI & Dev Hub** | Basic CLI | Minimal | Complex Cloud CLI |
| Runtime | **Node.js native (TypeScript)** | Node.js | Go binary | Proprietary cloud |
| Realtime | **Built-in WS & SSE** | Manual (Socket.io) | SSE only | Cloud WebSockets |
| Database | **SQLite & PostgreSQL** | PostgreSQL / MySQL | SQLite only | PostgreSQL / NoSQL |
| Vector search | **Built-in** | Custom extension | None | Cloud extension |
| Hosting cost | **$0–5/mo** | $20+/mo | $0–5/mo | Pay-per-read/write |

---

## License

Apache 2.0 © [xvertere-org](https://github.com/xvertere-org)
