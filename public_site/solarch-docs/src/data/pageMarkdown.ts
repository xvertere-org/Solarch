import { sourceFiles, communities, hyperedges, godNodes } from './graphData'

interface PageMarkdown {
  title: string
  section: string
  description: string
  content: string
}

function graphSection(docSection: string): string {
  const sf = sourceFiles[docSection]
  if (!sf) return ''

  const relatedCommunities = communities.filter((c) =>
    sf.path.split(', ').some((p) =>
      c.keyNodes.some((n) => n.toLowerCase().includes(p.split('/').pop()?.replace('.ts', '') || ''))
    ) || c.name.toLowerCase().includes(docSection.replace('-', ' '))
  )

  return `
## Related Codebase Graph

### Key Source Files
| File | Key Functions |
|------|--------------|
${sf.path.split(', ').map((p) => `| \`${p}\` | ${sf.keyFunctions.slice(0, 3).join(', ')} |`).join('\n')}

### Knowledge Graph Communities
${relatedCommunities.slice(0, 3).map((c) => `- **${c.name}** (cohesion: ${c.cohesion}) — ${c.nodeCount} nodes: ${c.keyNodes.slice(0, 5).join(', ')}`).join('\n') || '- Core functionality extracted from compiled source graph'}

### God Nodes (Most Connected Abstractions)
${godNodes.slice(0, 4).map((n) => `- **\`${n.name}\`** — ${n.edges} edges — ${n.description}`).join('\n')}

### Hyperedges (Grouped Relationships)
${hyperedges.filter((h) => h.nodes.some((n) => n.includes(docSection.replace('-', '_')) || docSection.includes(n.split('_')[1] || ''))).map((h) => `- **${h.label}** — ${h.confidence} confidence — nodes: ${h.nodes.join(', ')}`).join('\n') || '- See full graph report for relationship clusters'}

> Graph extracted from \+45k word corpus via knowledge graph analysis.
> 1032 nodes · 2407 edges · 38 communities detected.
`
}

export const pageMarkdowns: Record<string, PageMarkdown> = {
  'getting-started': {
    title: 'Getting Started',
    section: 'getting-started',
    description: 'Get Solarch running in under 60 seconds.',
    content: `# Getting Started

## Quick Start

Choose your preferred way to run Solarch. All three methods give you the same fully-featured backend.

### Global CLI
\`\`\`bash
npm install -g solarch
solarch init my-backend
cd my-backend
solarch serve --dev --port 8090
\`\`\`

### Programmatic
\`\`\`typescript
import { createServer } from 'solarch'

const app = createServer({
  port: 8090,
  dataDir: './pb_data',
  dev: true,
})

app.start().then(() => {
  console.log('Server running at http://localhost:8090')
})
\`\`\`

### Docker
\`\`\`bash
docker pull solarch/solarch:latest
docker run -p 8090:8090 \\
  -v $(pwd)/pb_data:/app/pb_data \\
  solarch/solarch:latest
\`\`\`

## Installation

**Requirements:** Node.js >= 20.0.0. Solarch is tested on Node 20, 22, and the latest LTS.

| Method | Command |
|--------|---------|
| npm (global) | \`npm install -g solarch\` |
| yarn (global) | \`yarn global add solarch\` |
| pnpm (global) | \`pnpm add -g solarch\` |
| npx (no install) | \`npx solarch serve --dev\` |
| Docker | \`docker pull solarch/solarch:latest\` |

## CLI Commands

### solarch serve
Start the Solarch server. Use \`--dev\` for development with hot reload and verbose logging.

\`\`\`bash
solarch serve --dev --port 8090 --dir ./pb_data
\`\`\`

| Flag | Description |
|------|-------------|
| --port | Server port (default: 8090) |
| --dev | Enable dev mode + hot reload |
| --dir | Data directory path |

### solarch superuser-create
Create the first admin superuser account interactively.

### solarch migrate
Manage database migrations.

\`\`\`bash
solarch migrate up
solarch migrate down
solarch migrate status
\`\`\`

## First Steps

1. **Install Solarch globally** — \`npm install -g solarch\`
2. **Start the server** — \`solarch serve --dev --port 8090\`
3. **Create a superuser** — \`solarch superuser-create\`
4. **Open the Admin UI** — \`http://localhost:8090/_/\`
5. **Create your first collection** using the Admin UI or CLI

## Project Structure

\`\`\`
my-backend/
├── pb_data/           # SQLite database + uploaded files
├── pb_public/         # Static files served at /
├── pb_migrations/     # Auto-generated migration files
├── pb_hooks/          # JavaScript hook files
├── collections/       # Collection schema definitions
└── solarch.config.ts
\`\`\`
${graphSection('getting-started')}
`,
  },

  'authentication': {
    title: 'Authentication',
    section: 'authentication',
    description: 'Four authentication strategies with JWT tokens and automatic refresh.',
    content: `# Authentication

Solarch supports four authentication strategies, all operating on auth-type collections: Email/Password, OAuth2, OTP, and MFA/TOTP. Every strategy uses JWT tokens with automatic refresh.

## Email / Password

The default auth strategy. Passwords are hashed with bcrypt.

### Login
\`\`\`bash
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \\
  -H "Content-Type: application/json" \\
  -d '{"identity":"test@example.com","password":"secret123"}'
\`\`\`

### Refresh Token
\`\`\`bash
curl -X POST http://localhost:8090/api/collections/users/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"token":"YOUR_JWT_TOKEN"}'
\`\`\`

### Password Reset
\`\`\`bash
# Request reset
curl -X POST http://localhost:8090/api/collections/users/request-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}'

# Confirm reset
curl -X POST http://localhost:8090/api/collections/users/confirm-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"token":"RESET_TOKEN","password":"newsecret123"}'
\`\`\`

## OAuth2

Built-in providers: GitHub, Google, Discord, Facebook. The registry is extensible.

\`\`\`bash
curl -X POST http://localhost:8090/api/collections/users/auth-with-oauth2 \\
  -H "Content-Type: application/json" \\
  -d '{"provider":"github","code":"OAUTH_CODE"}'
\`\`\`

## OTP (One-Time Password)

Email-based 6-digit codes for passwordless login.

\`\`\`bash
# Request OTP
curl -X POST http://localhost:8090/api/collections/users/request-otp \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}'

# Login with OTP
curl -X POST http://localhost:8090/api/collections/users/auth-with-otp \\
  -H "Content-Type: application/json" \\
  -d '{"otpId":"OTP_ID","password":"123456"}'
\`\`\`

## MFA / TOTP

Time-based One-Time Password for multi-factor authentication.

\`\`\`bash
# Setup MFA
curl -X POST http://localhost:8090/api/collections/users/mfa/setup \\
  -H "Authorization: Bearer AUTH_TOKEN"

# Verify MFA Code
curl -X POST http://localhost:8090/api/collections/users/mfa/verify \\
  -H "Authorization: Bearer AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"123456"}'
\`\`\`

## Admin Authentication

Admin accounts are separate from user collections with their own endpoints.

\`\`\`bash
# Admin login
curl -X POST http://localhost:8090/api/admins/auth-with-password \\
  -H "Content-Type: application/json" \\
  -d '{"identity":"admin@example.com","password":"secret123"}'
\`\`\`

## JWT Token Structure

Access tokens expire after 15 minutes. Use the refresh endpoint to obtain a new access token without re-authenticating.
${graphSection('authentication')}
`,
  },

  'collections': {
    title: 'Collections & Records',
    section: 'collections',
    description: 'Collections define data schema, access rules, and relationships.',
    content: `# Collections & Records

Collections are the backbone of Solarch. They define your data schema, access rules, and relationships. Every collection automatically syncs to SQLite tables.

## Collection Types

| Type | Description |
|------|-------------|
| base | Standard data collection (posts, products, orders) |
| auth | User accounts with built-in auth fields |
| view | Read-only SQL view for reports and aggregations |

## Field Types

Solarch ships with 14 field types:

| Type | Description | Special Options |
|------|-------------|-----------------|
| text | Plain text string | max, min |
| number | Integer or float | max, min |
| email | Valid email address | — |
| url | Valid URL | — |
| bool | True / false | default |
| date | ISO 8601 datetime | — |
| select | Single or multi-select | values[], maxSelect |
| file | Uploaded file(s) | maxSelect, maxSize |
| relation | Link to another collection | collectionId, maxSelect |
| json | Structured JSON data | — |
| editor | Rich text / markdown | — |
| autodate | Auto-set created / updated | — |
| geoPoint | Latitude & longitude | — |
| vector | Embedding vector array | dimensions |

## API Rules

Every collection defines five API rules:

| Rule | Description |
|------|-------------|
| listRule | Who can list records |
| viewRule | Who can view a single record |
| createRule | Who can create records |
| updateRule | Who can update records |
| deleteRule | Who can delete records |

### @request Macros
\`\`\`
@request.auth.id       # Current user's ID
@request.auth.email    # Current user's email
@request.method        # HTTP method
@request.data.title     # Field value from request body
\`\`\`

### Field Modifiers
\`\`\`
:lower     # Lowercase value
:upper     # Uppercase value
:length    # String length
:isset     # Check if field exists
:each      # Apply to each array item
:excerpt   # Truncated text snippet
:trim      # Remove whitespace
:abs       # Absolute value
\`\`\`

## CRUD Records

### List with Filter, Sort, Pagination
\`\`\`bash
curl "http://localhost:8090/api/collections/posts/records?filter=published=true&sort=-created&page=1&perPage=20"
\`\`\`

### Get Single Record
\`\`\`bash
curl http://localhost:8090/api/collections/posts/records/RECORD_ID
\`\`\`

### Create
\`\`\`bash
curl -X POST http://localhost:8090/api/collections/posts/records \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Hello","body":"World","published":true}'
\`\`\`

### Update (PATCH)
\`\`\`bash
curl -X PATCH http://localhost:8090/api/collections/posts/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Updated"}'
\`\`\`

### Delete
\`\`\`bash
curl -X DELETE http://localhost:8090/api/collections/posts/records/RECORD_ID
\`\`\`

## Filter Syntax

| Operator | Meaning | Example |
|----------|---------|---------|
| = | Equal | status = "published" |
| != | Not equal | status != "draft" |
| > | Greater than | price > 100 |
| < | Less than | price < 500 |
| ~ | Like / contains | title ~ "hello" |
| % | Starts with | name % "John" |
| @ | In array | tags @ "tech" |
| ?= | Any equal | tags ?= "tech" |
| ?: | Any contains | tags ?: "te" |
| ?~ | Any like | tags ?~ "te" |

Combine with \`&&\` and \`||\` for complex logic.

## Array Modifiers

Append or remove items without fetching the full record:

\`\`\`bash
# Append
curl -X PATCH ... -d '{"+tags": "tech"}'

# Remove
curl -X PATCH ... -d '{"tags-": "life"}'
\`\`\`

## View Collections

Read-only SQL views exposed as collections:

\`\`\`bash
curl -X POST http://localhost:8090/api/collections \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "name": "published_posts",
    "type": "view",
    "viewOptions": {"query": "SELECT * FROM _r_COLLECTION_ID WHERE published = 1"}
  }'
\`\`\`

## Back-Relations

Solarch auto-generates back-relation field names: \`collection_via_fieldName\`
${graphSection('collections')}
`,
  },

  'ai-tools': {
    title: 'AI Tools',
    section: 'ai-tools',
    description: 'Built-in AI tools powered by OpenAI, Anthropic, Ollama, or any OpenAI-compatible API.',
    content: `# AI Tools

Solarch has built-in AI tools powered by OpenAI, Anthropic, Ollama, or any OpenAI-compatible API.

## Supported Providers

| Provider | Config Fields | Model Example |
|----------|--------------|---------------|
| OpenAI | provider, apiKey, model | gpt-4o-mini |
| Anthropic | provider, apiKey, model | claude-3-haiku |
| Ollama | provider, baseURL | llama3.1 |
| Custom | provider, baseURL, apiKey | — |

## Configuration

API keys are encrypted at rest with AES.

\`\`\`json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseURL": "",
    "maxTokens": 2048,
    "temperature": 0.7
  }
}
\`\`\`

## Schema Generator

Describe what you want in plain English:

\`\`\`bash
curl -X POST http://localhost:8090/api/ai/generate-collection \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"description":"A blog post with title, content, tags, and author relation"}'
\`\`\`

## Rule Generator

Turn plain-English security requirements into filter expressions:

\`\`\`bash
curl -X POST http://localhost:8090/api/ai/generate-rule \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "update",
    "description": "Only the record owner can update"
  }'
\`\`\`

## Data Seeder

Generate realistic seed data:

\`\`\`bash
curl -X POST http://localhost:8090/api/ai/seed \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "products",
    "count": 10,
    "constraints": "Tech gadgets, prices between $10-$500"
  }'
\`\`\`

## Chat Assistant

Browser-based AI assistant at \`/_/#/ai\`. Supports streaming via SSE.

\`\`\`bash
curl -X POST http://localhost:8090/api/ai/chat \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What collections do I have?"}'
\`\`\`
${graphSection('ai-tools')}
`,
  },

  'vector-search': {
    title: 'Vector Search',
    section: 'vector-search',
    description: 'Store embedding vectors and search by cosine similarity.',
    content: `# Vector Search

Store embedding vectors alongside your records and search by cosine similarity. Built on the \`vector\` field type with a custom SQLite function.

## Setup

Create a collection with a \`vector\` field. Set dimensions to match your embedding model (1536 for OpenAI, 768 for sentence-transformers).

\`\`\`bash
curl -X POST http://localhost:8090/api/collections \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "name": "documents",
    "type": "base",
    "fields": [
      {"name": "title", "type": "text"},
      {"name": "embedding", "type": "vector", "dimensions": 1536}
    ]
  }'
\`\`\`

## Inserting Vectors

\`\`\`bash
curl -X PATCH http://localhost:8090/api/collections/documents/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{"embedding": [0.1, 0.2, 0.3, 0.4, 0.5, ...]}'
\`\`\`

## Search API

\`\`\`bash
curl -X POST http://localhost:8090/api/collections/documents/vector-search \\
  -H "Content-Type: application/json" \\
  -d '{
    "field": "embedding",
    "vector": [0.1, 0.2, 0.3, ...],
    "limit": 10,
    "minSimilarity": 0.8
  }'
\`\`\`

| Param | Description |
|-------|-------------|
| field | Name of the vector field to search |
| vector | Query embedding array (must match dimensions) |
| limit | Max results (default: 20) |
| minSimilarity | Minimum cosine similarity (0–1) |

## SQL Function

Under the hood: \`cosineSimilarity(a, b)\` — a custom SQLite function.

\`\`\`sql
SELECT *, cosineSimilarity(embedding, :query) AS score
FROM documents
WHERE score > 0.8
ORDER BY score DESC
LIMIT 10
\`\`\`
${graphSection('vector-search')}
`,
  },

  'file-storage': {
    title: 'File Storage',
    section: 'file-storage',
    description: 'File uploads, serving, and storage with local and S3-compatible backends.',
    content: `# File Storage

Solarch handles file uploads, serving, and storage with support for local filesystem and S3-compatible backends. Automatic thumbnail generation is included.

## Upload

\`\`\`bash
curl -X POST http://localhost:8090/api/collections/posts/records/RECORD_ID/files \\
  -F "files=@image.png" \\
  -F "files=@document.pdf"
\`\`\`

## Serve Files

\`\`\`
GET /api/files/:collection/:recordId/:filename
GET /api/files/:collection/:recordId/:filename?thumb=100x100
GET /api/files/:collection/:recordId/:filename?download=1
\`\`\`

## Protected File Tokens

Generate time-limited signed tokens for files behind view rules.

\`\`\`bash
# Generate Token
curl -X POST http://localhost:8090/api/files/token \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"collection":"posts","recordId":"RECORD_ID","filename":"image.png"}'

# Use Token
curl http://localhost:8090/api/files/posts/RECORD_ID/image.png?token=SIGNED_JWT
\`\`\`

## S3 Configuration

Supports AWS S3, MinIO, DigitalOcean Spaces, and any S3-compatible service.

\`\`\`json
{
  "s3": {
    "enabled": true,
    "bucket": "my-bucket",
    "region": "us-east-1",
    "endpoint": "https://s3.amazonaws.com",
    "accessKey": "AKIA...",
    "secret": "...",
    "prefix": "uploads/"
  }
}
\`\`\`

## Thumbnail Generation

Thumbnails generated automatically via \`sharp\`. Supported: JPEG, PNG, WebP, AVIF.

\`\`\`
GET /api/files/posts/RECORD_ID/photo.jpg?thumb=300x300
\`\`\`

## Storage Drivers

| Driver | Description |
|--------|-------------|
| Local Filesystem | Stores in pb_data/storage/. Fast for single-node. |
| S3-Compatible | AWS S3, MinIO, DO Spaces, Wasabi, Cloudflare R2. |
${graphSection('file-storage')}
`,
  },

  'realtime': {
    title: 'Realtime',
    section: 'realtime',
    description: 'SSE and WebSocket with per-channel subscriptions.',
    content: `# Realtime

Solarch supports two realtime strategies: Server-Sent Events (SSE) and WebSocket. Both use a subscription broker that routes record changes to connected clients.

## WebSocket

\`\`\`javascript
const ws = new WebSocket('ws://localhost:8090/api/realtime')

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['collections.posts.records']
  }))
}

ws.onmessage = (e) => {
  const data = JSON.parse(e.data)
  console.log(data.event, data.record)
  // data.event = 'create' | 'update' | 'delete'
}
\`\`\`

Annotated flow:
1. **Connect** — Open WebSocket to \`/api/realtime\`
2. **Subscribe** — Send subscribe message with channels
3. **Handle** — Listen for create, update, delete events
4. **Unsubscribe** — Send unsubscribe message

## Server-Sent Events (SSE)

\`\`\`javascript
const es = new EventSource('http://localhost:8090/api/realtime')

es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  console.log(data.event, data.record)
}
\`\`\`

## Subscription Channels

\`\`\`
collections.posts.records           # All posts changes
collections.posts.records:RECORD_ID  # Specific post only
collections.users.records             # All users changes
\`\`\`

## Disconnect Cleanup

Subscriptions are automatically cleaned up when a client disconnects. The broker removes stale subscriptions on a periodic heartbeat check.
${graphSection('realtime')}
`,
  },

  'migrations': {
    title: 'Migrations',
    section: 'migrations',
    description: 'JavaScript migrations in pb_migrations/ directory.',
    content: `# Migrations

Solarch supports JavaScript migrations in the \`pb_migrations/\` directory. Migrations run automatically on server start and can be managed via CLI or programmatically.

## Directory Structure

\`\`\`
pb_migrations/
├── 001_create_posts.js
├── 002_add_user_roles.js
└── README.md
\`\`\`

## Migration File Format

Each migration exports an \`up\` function (required) and optional \`down\` function:

\`\`\`javascript
module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    db.exec(\`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        created TEXT,
        updated TEXT
      )
    \`)
  },

  async down(app) {
    const db = app.db().getDataDB()
    db.exec(\`DROP TABLE IF EXISTS posts\`)
  }
}
\`\`\`

## Running Migrations

### Automatic
Migrations run automatically every time the server starts. Already-applied migrations are skipped.

### CLI
\`\`\`bash
solarch migrate up
solarch migrate down
solarch migrate down 3
solarch migrate status
\`\`\`

### Programmatic
\`\`\`typescript
const app = new Solarch()
await app.bootstrap()

await app.migrate()
await app.migrateDown(2)
const status = app.migrationStatus()
\`\`\`

## Rollback

Rollback uses the \`down()\` function. The \`count\` parameter controls how many to undo.
${graphSection('migrations')}
`,
  },

  'javascript-hooks': {
    title: 'JavaScript Hooks',
    section: 'javascript-hooks',
    description: 'Drop .js files into pb_hooks/ to extend behavior.',
    content: `# JavaScript Hooks

Drop \`.js\` files into a \`pb_hooks/\` directory. They run in a sandboxed Node VM on server start.

## Available Hook Events

| Hook | When it fires | Event object |
|------|---------------|--------------|
| onBootstrap | After app bootstraps | app |
| onServe | After server starts | app, server |
| onRecordCreate | After record created | app, record, collection |
| onRecordUpdate | After record updated | app, record, collection |
| onRecordDelete | After record deleted | app, record, collection |

## Available Globals

| Global | Description |
|--------|-------------|
| $app | App proxy: settings(), db(), findCollectionByNameOrId() |
| console | Standard console.log / error / warn |
| require | Limited require for built-in modules |
| Buffer | Node.js Buffer for binary data |
| JSON | Standard JSON parse / stringify |
| Date | Standard Date object |

## Examples

### Log on Create
\`\`\`javascript
onRecordCreate('posts', (e) => {
  console.log('New post created:', e.record.get('title'))
})
\`\`\`

### Validate on Update
\`\`\`javascript
onRecordUpdate('products', (e) => {
  const price = e.record.get('price')
  if (price < 0) {
    throw new Error('Price cannot be negative')
  }
})
\`\`\`

### Notify on Delete
\`\`\`javascript
onRecordDelete('orders', (e) => {
  const orderId = e.record.get('id')
  const mailer = $app.mailer()
  mailer.send({
    to: 'admin@example.com',
    subject: 'Order deleted',
    text: 'Order ' + orderId + ' was deleted.'
  })
})
\`\`\`

## Sandbox Limitations

- No ES modules — use \`module.exports\`
- No top-level await
- No filesystem or network access outside $app helpers
- Hooks are loaded once at server startup
${graphSection('javascript-hooks')}
`,
  },

  'api-reference': {
    title: 'API Reference',
    section: 'api-reference',
    description: 'Complete HTTP API reference for Solarch.',
    content: `# API Reference

Complete reference for the Solarch HTTP API. All endpoints return JSON and use standard HTTP status codes.

## Base URL

| Environment | URL |
|-------------|-----|
| Development | \`http://localhost:8090\` |
| Production | \`https://your-domain.com\` |

## Authentication

Pass your token in the \`Authorization\` header:

\`\`\`
Authorization: Bearer USER_JWT_TOKEN
Authorization: Bearer ADMIN_JWT_TOKEN
\`\`\`

## Collections

| Method | Endpoint | Auth / Rule | Description |
|--------|----------|-------------|-------------|
| GET | /api/collections | Admin | List all collections |
| GET | /api/collections/:id | Admin | Get collection by ID |
| POST | /api/collections | Admin | Create collection |
| PATCH | /api/collections/:id | Admin | Update collection |
| DELETE | /api/collections/:id | Admin | Delete collection |

## Records

| Method | Endpoint | Auth / Rule | Description |
|--------|----------|-------------|-------------|
| GET | /api/collections/:c/records | List rule | List with filter/sort |
| GET | /api/collections/:c/records/:id | View rule | Get single record |
| POST | /api/collections/:c/records | Create rule | Create record |
| PATCH | /api/collections/:c/records/:id | Update rule | Update record |
| DELETE | /api/collections/:c/records/:id | Delete rule | Delete record |
| POST | /api/collections/:c/vector-search | List rule | Vector similarity search |

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/collections/:c/auth-with-password | — | Login with email/password |
| POST | /api/collections/:c/auth-with-oauth2 | — | Login with OAuth2 |
| POST | /api/collections/:c/auth-with-otp | — | Login with OTP |
| POST | /api/collections/:c/request-otp | — | Request OTP code |
| POST | /api/collections/:c/refresh | — | Refresh JWT token |
| POST | /api/collections/:c/mfa/setup | Bearer | Setup TOTP MFA |
| POST | /api/collections/:c/mfa/verify | Bearer | Verify TOTP code |
| GET | /api/collections/:c/methods | — | List auth methods |
| GET | /api/collections/:c/external-auths | Bearer | List linked OAuth accounts |

## Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/admins/auth-with-password | — | Admin login |
| POST | /api/admins/refresh | Bearer | Refresh admin token |
| POST | /api/admins/request-password-reset | — | Request password reset |
| POST | /api/admins/confirm-password-reset | — | Confirm password reset |

## Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/files/token | Bearer | Generate protected file token |
| GET | /api/files/:c/:recordId/:filename | View rule / Token | Download file |
| POST | /api/collections/:c/records/:id/files | Update rule | Upload files |
| DELETE | /api/collections/:c/records/:id/files/:filename | Update rule | Delete file |

## Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/batch | Bearer | Batch operations (transaction-wrapped) |
| GET/POST | /api/realtime | — | Realtime SSE endpoint |
| GET | /api/health | — | Health check |
| GET | /api/logs | Admin | Request logs |
| GET/POST | /api/backups | Admin | Backup management |
| GET/PATCH | /api/settings | Admin | App settings |
| POST | /api/ai/* | Admin | AI tools (schema, rule, seed, chat) |
${graphSection('api-reference')}
`,
  },

  'configuration': {
    title: 'Configuration',
    section: 'configuration',
    description: 'Configure Solarch via Settings API, environment variables, and config file.',
    content: `# Configuration

Solarch is configured via the Settings API, environment variables, and an optional config file. Most settings can be changed at runtime through the Admin UI.

## Settings API

Sensitive values (SMTP password, S3 secret, AI API key) are encrypted at rest with AES.

### Get Settings
\`\`\`bash
curl http://localhost:8090/api/settings \\
  -H "Authorization: Bearer ADMIN_TOKEN"
\`\`\`

### Update Settings
\`\`\`bash
curl -X PATCH http://localhost:8090/api/settings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "appName": "My App",
    "appURL": "https://example.com",
    "smtp": { "host": "smtp.sendgrid.net", "port": 587, "username": "apikey", "password": "SG.xxx" },
    "s3": { "enabled": true, "bucket": "my-bucket", "region": "us-east-1", "accessKey": "AKIA...", "secret": "..." },
    "ai": { "enabled": true, "provider": "openai", "apiKey": "sk-...", "model": "gpt-4o-mini" },
    "rateLimits": { "enabled": true, "rules": [{ "duration": 60, "requests": 100 }] }
  }'
\`\`\`

## SMTP Configuration

\`\`\`json
{
  "smtp": {
    "host": "smtp.sendgrid.net",
    "port": 587,
    "username": "apikey",
    "password": "SG.xxx",
    "tls": true
  }
}
\`\`\`

## S3 Configuration

See File Storage page for full S3 documentation.

## AI Configuration

\`\`\`json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseURL": "",
    "maxTokens": 2048,
    "temperature": 0.7
  }
}
\`\`\`

## Rate Limiting

\`\`\`json
{
  "rateLimits": {
    "enabled": true,
    "rules": [
      { "duration": 60, "requests": 100 },
      { "duration": 3600, "requests": 1000 }
    ]
  }
}
\`\`\`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment mode |
| PORT | 8090 | Server port |
| DATA_DIR | ./pb_data | SQLite data directory |

## Architecture Diagram

\`\`\`
src/
├── solarch.ts          # Solarch class, bootstrap, JS migrations
├── cli.ts                 # CLI: serve, superuser-create, migrate
├── core/
│   ├── base.ts            # BaseApp: hooks, DB, settings, collections
│   ├── db.ts              # Dual SQLite (data.db + auxiliary.db)
│   ├── collection.ts      # Collection model
│   ├── record.ts          # Record model
│   ├── field.ts           # 14 field types
│   ├── settings.ts        # AppSettings + encryption
│   ├── record_query.ts    # findById, filter, count, vectorSearch
│   ├── record_field_resolver.ts  # @request.* macros
│   ├── record_upsert.ts   # Validation + array modifiers
│   ├── schema_sync.ts     # Auto table creation/alteration
│   ├── migration.ts       # MigrationRunner
│   ├── auth_models.ts     # MFA, OTP, AuthOrigin
│   └── auth_queries.ts    # Auth DB queries
├── ai/
│   ├── provider.ts        # LLM abstraction
│   └── service.ts         # Schema gen, rule gen, seed, chat
├── apis/
│   ├── serve.ts           # Express server + middleware
│   ├── record_auth.ts     # Auth endpoints
│   ├── record_crud.ts     # Record CRUD + vector search
│   ├── collection.ts      # Collection management
│   ├── settings.ts        # Settings CRUD
│   ├── realtime.ts        # SSE + WebSocket broker
│   ├── file.ts            # Upload/download
│   ├── batch.ts           # Transaction-wrapped batch API
│   ├── auth_flows.ts      # Password reset, verification
│   ├── admin_auth.ts      # Admin login, refresh
│   ├── ai.ts              # AI endpoints
│   ├── backup.ts          # Backup listing
│   ├── logs.ts            # Log viewer
│   └── middlewares_*.ts   # CORS, gzip, rate limit, auth
├── tools/
│   ├── auth/oauth2.ts     # OAuth2 registry
│   ├── filesystem/        # Local + S3 blob drivers
│   ├── jsvm/jsvm.ts       # pb_hooks/ runner
│   ├── hook/hook.ts       # Event system
│   ├── cron/cron.ts       # Job scheduler
│   ├── mailer/            # SMTP + templates
│   ├── search/filter.ts   # Filter parser + SQL builder
│   └── security/crypto.ts # JWT, bcrypt, AES
└── admin/                 # React/Vite Admin UI
\`\`\`
${graphSection('configuration')}
`,
  },
}

export function getMarkdownForSection(section: string): string | undefined {
  return pageMarkdowns[section]?.content
}

export function getPageMarkdown(section: string): PageMarkdown | undefined {
  return pageMarkdowns[section]
}
