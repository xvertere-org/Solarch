# Starter Templates

Solarch includes a template system with 5 pre-configured starter architectures. Rather than starting from an empty project, you can scaffold production-ready backends tailored to specific use cases.

---

## Exploring Templates via CLI

List all available templates directly from the CLI:

```bash
solarch template list
```

Inspect the architectural details, migrations, hooks, and environment requirements for any template:

```bash
solarch template info saas
```

---

## Template Catalog

### 1. Minimal (`minimal`)

The barebones Solarch foundation. Ideal for microservices, lightweight internal tools, or custom architectures.

```bash
solarch init --template minimal
```

- **Recommended Database**: SQLite
- **Features Included**:
  - Declarative configuration baseline
  - Email/Password authentication
  - Initial baseline database schema
- **Generated Structure**:
  ```text
  my-app/
  ├── solarch.config.ts
  ├── .env
  ├── pb_data/
  └── pb_migrations/
  ```
- **Best For**: Microservices, learning Solarch fundamentals, custom architectures.

---

### 2. REST API Backend (`api`)

Production-ready REST API backend with user management, relational collections, and security middleware.

```bash
solarch init --template api
```

- **Recommended Database**: SQLite (or PostgreSQL for multi-instance scaling)
- **Features Included**:
  - Full REST CRUD API endpoints
  - Email authentication & password reset endpoints
  - `users` and `posts` relational collections
  - Rate limiting & CORS middleware
- **Generated Migrations**:
  - `001_create_users.js`: User accounts with email and password hashing
  - `002_create_posts.js`: Content posts with author relationships
- **Best For**: Mobile app backends, CRUD services, Headless CMS integration, JAMstack websites.

---

### 3. Realtime Backend (`realtime`)

Real-time collaborative backend with live event streaming and dual-protocol subscription support.

```bash
solarch init --template realtime
```

- **Recommended Database**: SQLite
- **Features Included**:
  - Dual-protocol subscriptions: Server-Sent Events (SSE) & WebSockets
  - `events` collection for real-time message brokering
  - Event streaming lifecycle hook in `src/hooks/events.ts`
  - Granular authentication & authorization rules
- **Generated Migrations & Hooks**:
  - `pb_migrations/001_create_events.js`: Real-time event log table
  - `src/hooks/events.ts`: Event lifecycle broadcaster
- **Best For**: Live chat apps, collaboration boards, IoT data ingestion, real-time dashboards.

---

### 4. Full SaaS Platform (`saas`)

Enterprise-grade SaaS architecture with multi-tenancy, OAuth2 social login, security audit logging, and billing webhooks.

```bash
solarch init --template saas --db postgres --db-url "postgres://solarch:pass@localhost:5432/saas_db"
```

- **Recommended Database**: PostgreSQL
- **Features Included**:
  - Multi-tenant `organizations` & member role associations
  - Social authentication (Google, GitHub) + Email auth
  - Security audit logging with actor and target tracking
  - Stripe/Paddle billing webhook handler hook
  - Auto-generated `docker-compose.yml` for local PostgreSQL
- **Generated Migrations & Hooks**:
  - `pb_migrations/001_create_users.js`: Multi-tenant user schema
  - `pb_migrations/002_create_organizations.js`: Organizations & plans table
  - `pb_migrations/003_create_audit_logs.js`: Audit logging table
  - `src/hooks/billing.ts`: Stripe / Paddle billing webhook receiver
  - `docker-compose.yml`: Local PostgreSQL 16 container
- **Required Environment Variables**:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GITHUB_CLIENT_ID`
- **Best For**: B2B SaaS platforms, multi-tenant web applications, subscription-based products.

---

### 5. AI Backend (`ai`)

AI-first backend with integrated embeddings, semantic vector search, prompt caching, and LLM chat completions.

```bash
solarch init --template ai
```

- **Recommended Database**: SQLite (with vector extensions) or PostgreSQL (pgvector)
- **Features Included**:
  - Integrated AI chat completions endpoint (`POST /api/ai/chat`)
  - `vectors` collection for high-dimensional semantic indexing
  - Vector similarity search endpoint (`POST /api/collections/:c/vector-search`)
  - AI tool definitions & prompt caching
- **Generated Migrations**:
  - `pb_migrations/001_create_vectors.js`: Vector embeddings collection
- **Required Environment Variables**:
  - `OPENAI_API_KEY` (or custom provider endpoint)
- **Best For**: RAG applications, semantic search engines, AI agent backends, intelligent chatbots.

---

## Template Comparison Matrix

| Template | Auth Providers | Realtime | AI / Vectors | Rate Limiting | Migrations | Recommended DB |
|---|---|---|---|---|---|---|
| **`minimal`** | Email | — | — | Default | Baseline | SQLite |
| **`api`** | Email | — | — | Enabled | 2 files | SQLite |
| **`realtime`**| Email | WS + SSE | — | Enabled | 1 file + hook | SQLite |
| **`saas`** | Email, Google, GitHub | Enabled | — | Enabled | 3 files + hook | PostgreSQL |
| **`ai`** | Email | — | Vectors + Chat | Enabled | 1 file | SQLite / Postgres |

---

## Dry-Run Mode

To preview the files and migrations that any template will scaffold before writing to disk:

```bash
solarch init --template saas --dry-run
```

Output:
```text
⚡ Solarch Project Preview (Dry Run)

Will create:

my-app/
  ├── solarch.config.ts
  ├── .env
  ├── pb_data/
  ├── pb_migrations/
  ├── pb_migrations/001_create_users.js
  ├── pb_migrations/002_create_organizations.js
  ├── pb_migrations/003_create_audit_logs.js
  ├── src/hooks/
  ├── src/hooks/billing.ts
  └── docker-compose.yml

No files created.
```
