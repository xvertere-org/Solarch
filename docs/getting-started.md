---
title: "Getting Started"
description: "Install, configure, and start Solarch BaaS in under 5 minutes."
slug: "getting-started"
---

# Getting Started

Solarch is a TypeScript Backend-as-a-Service (BaaS) providing SQLite database storage, authentication, file storage, realtime subscriptions, JS hooks, and AI features in a single binary or NPM package. Use it to launch backends for web and mobile applications quickly without managing complex cloud infrastructure.

## Requirements

- **Node.js**: `v20.0.0` or higher ([package.json:L76](../package.json#L76))
- **Operating System**: macOS, Linux, or Windows

---

## Step 1: Install Solarch

Choose one of three installation methods depending on your workflow.

### Option A: Global CLI (Recommended for development)

```bash
npm install -g solarch
```

### Option B: Local Library (For TypeScript/Node integration)

```bash
npm install solarch
```

### Option C: Docker Container

```dockerfile
FROM node:20-alpine
RUN npm install -g solarch
EXPOSE 8090
CMD ["solarch", "serve", "--port", "8090"]
```

---

## Step 2: Initialize a Project

Use the `init` command to scaffold a project directory with default directories and configuration files.

```bash
solarch init --dir ./my-app
```

### Interactive Prompts

```text
⚡ Solarch Project Initializer

? Project name [my-app]: my-app
? Database (sqlite / postgres) [sqlite]: sqlite
? Auth providers (email, google, github, discord) [email]: email
? Enable rate limiting (y/n) [y]: y
? Enable AI tools (y/n) [n]: n
```

### Verification
Check that `my-app` was created containing:
- `pb_data/`: SQLite data directory ([src/cli.ts:L208](../src/cli.ts#L208))
- `pb_migrations/`: Database migrations directory ([src/cli.ts:L209](../src/cli.ts#L209))
- `.env`: Environment variables ([src/cli.ts:L229](../src/cli.ts#L229))
- `solarch.config.ts`: Main project config ([src/cli.ts:L242](../src/cli.ts#L242))

---

## Step 3: Create a Superuser Account

Before serving requests, create an administrative superuser account.

```bash
solarch superuser-create admin SecretPassword123 --dir ./pb_data
```

### Expected Terminal Output
```text
Superuser admin created successfully.
```

---

## Step 4: Start the Server

Start the Solarch server on port `8090`.

```bash
solarch serve --port 8090 --dev --dir ./pb_data
```

### Expected Terminal Output
```text
Solarch v0.15.6
Server started at http://localhost:8090
- REST API: http://localhost:8090/api/
- Admin UI: http://localhost:8090/_/
```

---

## Step 5: Make Your First API Call

Verify that the server is operational by requesting server health status.

```bash
curl -X GET http://localhost:8090/api/health
```

### Expected Output
```json
{
  "code": 200,
  "message": "API is healthy",
  "data": {
    "canRead": true,
    "canWrite": true
  }
}
```

---

## Programmatic Usage Example

You can also run Solarch directly within your Node.js/TypeScript code:

```typescript
import { Solarch } from 'solarch'

const app = new Solarch({
  defaultDev: true,
  defaultDataDir: './pb_data',
})

async function main() {
  await app.start(8090)
  console.log('Solarch server started programmatically')
}

main().catch(console.error)
```

---

## Common Errors

### Error: `DATABASE_URL is required for PostgreSQL`
- **Cause**: Selected `postgres` database during `solarch init` without providing a `DATABASE_URL` ([src/cli.ts:L188](../src/cli.ts#L188)).
- **Fix**: Provide a valid connection string like `postgres://user:password@localhost:5432/dbname` or press Enter to accept `sqlite`.

### Error: `port in use` / `EADDRINUSE`
- **Cause**: Port `8090` is occupied by another process.
- **Fix**: Specify an alternate port using `--port 8095` ([src/cli.ts:L31](../src/cli.ts#L31)).
