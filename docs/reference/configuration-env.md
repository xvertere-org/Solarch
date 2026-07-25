---
title: "Configuration & Environment Reference"
description: "Exhaustive reference of configuration settings, flags, and environment variables."
slug: "reference/configuration-env"
---

# Configuration & Environment Reference

Solarch can be configured via environment variables, constructor options, and project configuration files.

---

## 1. Environment Variables

| Variable | Type | Default | Description | Verified Source |
| :--- | :--- | :--- | :--- | :--- |
| `JWT_SECRET` | string | `""` | Primary secret key used to sign and verify authentication JWTs. Required in production. Minimum recommended length 32 characters. | [src/core/base.ts:L642](../../src/core/base.ts#L642) |
| `SOLARCH_JWT_SECRET` | string | `""` | Alias fallback for `JWT_SECRET`. | [src/core/base.ts:L620](../../src/core/base.ts#L620) |
| `SOLARCH_ENCRYPTION_KEY` | string | `"solarch-enc-salt-v1"` | Master salt used to encrypt sensitive settings in the database. | [src/tools/security/crypto.ts:L123](../../src/tools/security/crypto.ts#L123) |
| `JSVM_SANDBOX_MODE` | `"legacy"` \| `"isolated"` | `"legacy"` | Execution mode for JavaScript extension hooks and agent nodes. `isolated` uses Deno. | [src/tools/jsvm/jsvm.ts:L10](../../src/tools/jsvm/jsvm.ts#L10) |
| `JSVM_MAX_CONCURRENT` | integer | `8` | Maximum concurrent isolated Deno execution workers. | [src/tools/jsvm/deno_sandbox.ts:L5](../../src/tools/jsvm/deno_sandbox.ts#L5) |
| `JSVM_MAX_MEMORY_MB` | integer | `64` (16 - 512) | Maximum memory in megabytes allocated per Deno worker process. | [src/tools/jsvm/deno_sandbox.ts:L102](../../src/tools/jsvm/deno_sandbox.ts#L102) |
| `CORS_ALLOWED_ORIGINS` | string (CSV) | `""` | Comma-separated list of permitted origin domains for Cross-Origin Resource Sharing. | [src/apis/middlewares_cors.ts:L5](../../src/apis/middlewares_cors.ts#L5) |
| `NODE_ENV` | string | `"development"` | Application runtime environment (`development` / `production`). Controls stack trace output. | [src/apis/middlewares_cors.ts:L12](../../src/apis/middlewares_cors.ts#L12) |
| `DATABASE_URL` | string | `""` | Connection URL for PostgreSQL databases when configured in multi-database mode. | [src/cli.ts:L222](../../src/cli.ts#L222) |

---

## 2. Constructor Configuration Options ([src/solarch.ts:L20](../../src/solarch.ts#L20))

```typescript
export interface SolarchConfig {
  hideStartBanner?: boolean       // Suppress CLI startup banner output (default: false)
  defaultDev?: boolean            // Enable development mode features (default: false)
  defaultDataDir?: string         // Path to SQLite data directory (default: "./pb_data")
  defaultEncryptionEnv?: string   // Environment variable name for encryption key
  defaultQueryTimeout?: number    // Database query execution timeout in seconds (default: 30)
  dataMaxOpenConns?: number       // Maximum open connections to data.db
  dataMaxIdleConns?: number       // Maximum idle connections to data.db
  auxMaxOpenConns?: number        // Maximum open connections to aux.db
  auxMaxIdleConns?: number        // Maximum idle connections to aux.db
}
```

---

## 3. Project Configuration File (`solarch.config.ts`)

Scaffolded automatically when running `solarch init`.

```typescript
export default {
  port: 8090,
  dataDir: './pb_data',
  database: {
    type: 'sqlite', // 'sqlite' or 'postgres'
  },
  auth: {
    providers: ['email', 'google', 'github', 'discord'],
  },
  rateLimiting: {
    enabled: true,
  },
  ai: {
    enabled: false,
  },
}
```
