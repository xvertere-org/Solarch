/**
 * Standard Built-in Template Definitions for Solarch.
 */

import { TemplateDefinition, PresetDefinition, PresetName } from './types.js'

export const MINIMAL_TEMPLATE: TemplateDefinition = {
  name: 'minimal',
  title: 'Minimal Backend',
  description: 'Barebones Solarch setup with basic configuration',
  recommendedDatabase: 'sqlite',
  features: {
    auth: ['email'],
    rateLimit: true,
    realtime: false,
    ai: false,
    storage: false,
  },
  previewIncludes: [
    'Minimal configuration',
    'Email authentication',
    'Initial migration baseline',
  ],
  migrations: [
    {
      file: '001_init.js',
      name: 'init',
      content: `module.exports = {
  async up(app) {
    // Initial schema baseline
  },

  async down(app) {
    // Rollback baseline
  }
}
`,
    },
  ],
}

export const API_TEMPLATE: TemplateDefinition = {
  name: 'api',
  title: 'API Backend',
  description: 'Production-ready REST API with users and posts collections',
  recommendedDatabase: 'sqlite',
  features: {
    auth: ['email'],
    rateLimit: true,
    realtime: false,
    ai: false,
    storage: true,
  },
  previewIncludes: [
    'REST CRUD endpoints',
    'Email authentication & password resets',
    'Users & Posts collections',
    'Rate limiting & CORS middleware',
  ],
  migrations: [
    {
      file: '001_create_users.js',
      name: 'create_users',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS users\`)
  }
}
`,
    },
    {
      file: '002_create_posts.js',
      name: 'create_posts',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        authorId TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS posts\`)
  }
}
`,
    },
  ],
}

export const REALTIME_TEMPLATE: TemplateDefinition = {
  name: 'realtime',
  title: 'Realtime Application',
  description: 'Real-time collaborative backend with live subscriptions and event streaming',
  recommendedDatabase: 'sqlite',
  features: {
    auth: ['email'],
    rateLimit: true,
    realtime: true,
    ai: false,
    storage: true,
  },
  previewIncludes: [
    'Dual-protocol WebSocket & SSE subscriptions',
    'Real-time events collection',
    'Event streaming lifecycle hook',
    'Authentication & authorization rules',
  ],
  migrations: [
    {
      file: '001_create_events.js',
      name: 'create_events',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        payload TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS events\`)
  }
}
`,
    },
  ],
  hooks: [
    {
      file: 'realtime.ts',
      name: 'realtime',
      content: `export default async function hook(ctx: any) {
  // Realtime event dispatch hook
  if (ctx.event === 'record.create' && ctx.collection === 'events') {
    // Broadcast live event notification
  }
}
`,
    },
  ],
}

export const SAAS_TEMPLATE: TemplateDefinition = {
  name: 'saas',
  title: 'SaaS Application',
  description: 'Full-stack SaaS architecture with organizations, OAuth, audit logs, and billing',
  recommendedDatabase: 'postgres',
  features: {
    auth: ['email', 'google', 'github'],
    rateLimit: true,
    realtime: true,
    ai: false,
    storage: true,
    webhooks: true,
  },
  previewIncludes: [
    'Multi-tenant Organizations & Memberships',
    'OAuth2 (Google, GitHub) + Email auth',
    'Audit logging & security tracking',
    'Billing webhook lifecycle hook',
  ],
  migrations: [
    {
      file: '001_create_users.js',
      name: 'create_users',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS users\`)
  }
}
`,
    },
    {
      file: '002_create_organizations.js',
      name: 'create_organizations',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS organizations\`)
  }
}
`,
    },
    {
      file: '003_create_audit_logs.js',
      name: 'create_audit_logs',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actorId TEXT NOT NULL,
        action TEXT NOT NULL,
        targetId TEXT,
        details TEXT,
        created TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS audit_logs\`)
  }
}
`,
    },
  ],
  hooks: [
    {
      file: 'billing.ts',
      name: 'billing',
      content: `export default async function hook(ctx: any) {
  // Billing webhook handler hook (Stripe / Paddle)
  if (ctx.path === '/api/webhooks/billing') {
    // Process subscription events
  }
}
`,
    },
  ],
  envVars: {
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
  },
}

export const AI_TEMPLATE: TemplateDefinition = {
  name: 'ai',
  title: 'AI Backend',
  description: 'AI-first backend with embeddings, vector search, and LLM chat completions',
  recommendedDatabase: 'sqlite',
  features: {
    auth: ['email'],
    rateLimit: true,
    realtime: false,
    ai: true,
    storage: true,
  },
  previewIncludes: [
    'Integrated AI completions & vector embeddings',
    'Vectors collection for semantic search',
    'AI tool definitions',
    'Prompt caching & rate limits',
  ],
  migrations: [
    {
      file: '001_create_vectors.js',
      name: 'create_vectors',
      content: `module.exports = {
  async up(app) {
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    await app.db().execute(\`DROP TABLE IF EXISTS vectors\`)
  }
}
`,
    },
  ],
  envVars: {
    OPENAI_API_KEY: '',
  },
}

export const STANDARD_TEMPLATES: Record<string, TemplateDefinition> = {
  minimal: MINIMAL_TEMPLATE,
  api: API_TEMPLATE,
  realtime: REALTIME_TEMPLATE,
  saas: SAAS_TEMPLATE,
  ai: AI_TEMPLATE,
}

export const STANDARD_PRESETS: Record<PresetName, PresetDefinition> = {
  development: {
    name: 'development',
    database: 'sqlite',
    rateLimit: true,
    ai: false,
    description: 'Local development with SQLite and fast iterations',
  },
  production: {
    name: 'production',
    database: 'postgres',
    rateLimit: true,
    ai: false,
    description: 'Hardened production defaults with PostgreSQL and security rules',
  },
  testing: {
    name: 'testing',
    database: 'sqlite',
    rateLimit: false,
    ai: false,
    description: 'Automated test environment with SQLite and disabled limits',
  },
}
