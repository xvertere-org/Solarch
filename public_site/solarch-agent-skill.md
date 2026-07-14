---
name: solarch
description: "Solarch — a TypeScript backend-as-a-service with SQLite, auth, realtime, file storage, AI tools, vector search, and Admin UI. Use when a user wants to build a backend, scaffold a BaaS, add auth/CRUD/realtime to a project, deploy a PocketBase-like backend in TypeScript, or needs help with Solarch CLI commands, API usage, or deployment. TRIGGER when: code imports `solarch`; user asks to create, deploy, or manage a backend; user mentions PocketBase, BaaS, SQLite backend, auth backend, realtime backend, or Solarch itself; project needs authentication, file uploads, realtime subscriptions, or an admin panel. SKIP: non-TypeScript projects, Go/Python/other language backends, general database questions not involving Solarch."
license: Apache-2.0
---

# Solarch Agent Skill

This skill helps you build, deploy, and manage backends with **Solarch** — a TypeScript BaaS with SQLite, auth, realtime, file storage, AI tools, and vector search.

## Quick Start

```bash
npm install -g solarch
mkdir my-app && cd my-app
solarch serve --dev --port 8090
```

This starts a full backend at `http://localhost:8090` with REST API, Admin UI at `/_/`, and WebSocket realtime.

## CLI Commands

| Command | Description |
|---------|-------------|
| `solarch serve` | Start the server (--port, --dir, --dev) |
| `solarch superuser-create <email> <password>` | Create admin account |
| `solarch migrate up` | Run pending migrations |
| `solarch migrate down [count]` | Rollback migrations |
| `solarch migrate status` | Show migration status |
| `solarch migrate create <name>` | Create a new migration file |

## Key Features

### Authentication
- Email/password auth via `/api/collections/:collection/auth-with-password`
- OAuth2 (GitHub, Google, Discord, Facebook) via `/api/collections/:collection/auth-with-oauth2`
- OTP (one-time password) via `/api/collections/:collection/auth-with-otp`
- MFA/TOTP setup and verification
- JWT tokens with refresh, impersonation, and revocation
- Password reset, email verification, email change flows

### Collections & Records
- Base, Auth, and View collection types
- 14 field types: text, number, email, url, bool, date, select, file, relation, json, editor, autodate, geoPoint, vector
- API rules per operation (list, view, create, update, delete) using `@request.*` macro syntax
- Filter syntax: `field = 'value'`, `field ~ 'substring'`, `field > 10`, `field ?= 'array-element'`, `(field1 = 'a' || field2 = 'b')`
- Sort, pagination, field selection, record expansion
- Batch API (`/api/batch`) with atomic transactions

### File Storage
- Upload via `POST /api/collections/:c/records/:r/files` (multipart)
- Serve via `GET /api/collections/:c/records/:r/:filename`
- Protected file tokens via `POST /api/files/token`
- Thumbnail generation (100x100, 300x300, 500x500) via sharp
- S3 storage driver (configured in Admin UI settings)

### Realtime
- WebSocket at `ws://host:port/api/realtime`
- SSE (Server-Sent Events) at `GET /api/realtime` with `Accept: text/event-stream`
- Subscribe/unsubscribe to channels via `POST /api/realtime`
- Record change events: `collections.{collectionId}.records`

### AI Tools
- Schema generator: generate collection schemas from natural language
- Rule generator: generate API rules from descriptions
- Data seeder: generate mock data for collections
- Chat assistant: conversational AI for managing your backend
- Supported providers: OpenAI, Anthropic, Ollama

### Vector Search
- Cosine similarity via SQL `vector_cosine_similarity()` function
- `POST /api/collections/:c/vector-search` with query vector and limit
- Best for semantic search over stored embeddings

### Admin UI
- Built React/Vite SPA at `/_/`
- Manage collections, records, settings, logs, backups
- AI Assistant panel for schema generation and management

### Migrations
- JavaScript migration files in `pb_migrations/`
- `up()` and `down()` functions per migration
- Auto-applied on server start, or manually via CLI

### JavaScript Hooks
- Files in `pb_hooks/` with `.js` extension
- Events: `onBootstrap`, `onServe`, `onRecordCreate`, `onRecordUpdate`, `onRecordDelete`, `onCollectionCreate`, `onCollectionUpdate`, `onCollectionDelete`
- Globals: `$app` (settings, db, logger, etc.), console, setTimeout, fetch
- Timeout: 5 seconds per hook

### Backups
- Create: `POST /api/backups` with optional name
- List: `GET /api/backups`
- Upload: `POST /api/backups/upload` (multipart zip)
- Restore: `POST /api/backups/:key/restore`
- Delete: `DELETE /api/backups/:key`
- Includes data.db, auxiliary.db, and storage files

## SDK Usage (Client-Side)

```typescript
import Solarch from 'solarch/client'

const pb = new Solarch('http://localhost:8090')

// Auth
const auth = await pb.collection('users').authWithPassword('email@example.com', 'password')

// CRUD
const records = await pb.collection('posts').getList(1, 20, { filter: 'status = "published"' })
const record = await pb.collection('posts').create({ title: 'Hello', content: 'World' })
await pb.collection('posts').update(record.id, { title: 'Updated' })
await pb.collection('posts').delete(record.id)

// Realtime (WebSocket)
pb.collection('posts').subscribe('*', (event) => {
  console.log('Post changed:', event.action, event.record)
})

// File upload
const formData = new FormData()
formData.append('files', fileInput.files[0])
await pb.collection('posts').update(recordId, formData)
```

## Environment Variables

| Env Var | Purpose |
|---------|---------|
| `JWT_SECRET` or `SOLARCH_JWT_SECRET` | JWT signing secret (min 32 chars) |
| `SOLARCH_ENCRYPTION_KEY` | Encryption salt for settings secrets |
| `SOLARCH_DATA_DIR` | Data directory (default: `./pb_data`) |

## Deployment

### Docker
```bash
docker compose up -d
```

### Manual (Node.js 20+)
```bash
npm install -g solarch
solarch serve --port 8090 --dir ./pb_data
```

### Programmatic
```typescript
import { Solarch } from 'solarch'

const app = new Solarch({ defaultDev: true })
await app.start(8090)
```

## Common API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check (with DB connectivity) |
| GET | /api/collections | List all collections |
| POST | /api/collections | Create a collection |
| GET | /api/collections/:c/records | List records (with filter, sort, page) |
| POST | /api/collections/:c/records | Create a record |
| PATCH | /api/collections/:c/records/:r | Update a record |
| DELETE | /api/collections/:c/records/:r | Delete a record |
| POST | /api/collections/:c/auth-with-password | Auth with email/password |
| POST | /api/batch | Batch operations (transactional) |

## Architecture

- **Express** server with middleware: helmet, CORS, rate limiting, auth token loading
- **SQLite** via better-sqlite3 with WAL mode — dual database design (data.db + auxiliary.db)
- **WebSocket** realtime via ws library, SSE fallback
- **Zod** for schema validation on settings and configuration
- **Commander** for CLI parsing
