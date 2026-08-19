# Configuration Guide

Solarch uses a declarative TypeScript/JavaScript configuration file (`solarch.config.ts` or `solarch.config.js`) located at the root of your project.

---

## Example Configuration

```typescript
// solarch.config.ts
export default {
  // Server runtime options
  port: 8090,
  dataDir: './pb_data',

  // Database provider and connection
  database: {
    type: 'sqlite', // 'sqlite' | 'postgres'
    url: process.env.DATABASE_URL,
  },

  // Authentication configuration
  auth: {
    providers: ['email', 'google', 'github'],
  },

  // Feature flags & middleware
  rateLimiting: {
    enabled: true,
  },

  // AI tools & Vector search
  ai: {
    enabled: false,
  },
}
```

---

## Configuration Schema Reference

### 1. Runtime Settings

| Field | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `8090` | Port number the HTTP/WebSocket server listens on. Overridable via `--port` or `PORT` env var. |
| `dataDir` | `string` | `'./pb_data'` | Path to directory where SQLite databases, uploads, and runtime caches are stored. |

### 2. Database (`database`)

| Field | Type | Default | Description |
|---|---|---|---|
| `database.type` | `'sqlite' \| 'postgres'` | `'sqlite'` | Database backend engine. |
| `database.url` | `string` | `undefined` | Connection URL for PostgreSQL (e.g., `postgres://user:pass@host:5432/dbname`). |

### 3. Authentication (`auth`)

| Field | Type | Default | Description |
|---|---|---|---|
| `auth.providers` | `string[]` | `['email']` | Enabled authentication strategies: `'email'`, `'google'`, `'github'`, `'discord'`. |

### 4. Rate Limiting (`rateLimiting`)

| Field | Type | Default | Description |
|---|---|---|---|
| `rateLimiting.enabled` | `boolean` | `true` | Enable built-in request rate limiting middleware across all REST and Auth endpoints. |

### 5. AI Capabilities (`ai`)

| Field | Type | Default | Description |
|---|---|---|---|
| `ai.enabled` | `boolean` | `false` | Enable vector search endpoints, embedding indexes, and LLM chat completions. |

---

## Managing Configuration via CLI

### Inspect Effective Configuration (`solarch config show`)

View the resolved configuration with all environment overrides and defaults applied:

```bash
solarch config show
```

Output:
```text
⚡ Resolved Configuration

Project:
  Name:     my-api
  Dir:      /Users/jay/projects/my-api
  Config:   solarch.config.ts

Runtime:
  Port:     8090
  Data Dir: ./pb_data
  Dev Mode: false

Database:
  Provider: SQLite (sqlite)
  Driver:   sqlite
  Mode:     local

Auth:
  Providers: email

Features:
  Rate Limiting: enabled
  AI Tools:      disabled
```

For JSON output (ideal for CI/CD scripting):

```bash
solarch config show --json
```

---

### Validate Configuration (`solarch config validate`)

Verify syntax and type validity before deploying or starting servers:

```bash
solarch config validate
```

Output:
```text
⚡ Configuration Validation

  ✔ File: solarch.config.ts loaded
  ✔ Syntax: Valid TypeScript/JavaScript
  ✔ Schema: All required fields match runtime specification
  ✔ Database: Configuration matches driver requirements

Status: Configuration is valid.
```

---

### Update Configuration from CLI (`solarch config set`)

Modify configuration values directly from your terminal:

```bash
# Update server port
solarch config set port 3000

# Disable rate limiting
solarch config set rateLimiting.enabled false

# Add OAuth provider
solarch config set auth.providers '["email", "google", "github"]'
```
