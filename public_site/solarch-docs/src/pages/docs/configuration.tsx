import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'

export default function Configuration() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Configuration</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch is configured via the Settings API, environment variables, and an optional
        config file. Most settings can be changed at runtime through the Admin UI.
      </p>

      <DocSection id="settings-api" title="Settings API">
        <p className="text-theme-secondary">
          Get or update application settings via the REST API. Sensitive values (SMTP password,
          S3 secret, AI API key) are encrypted at rest with AES.
        </p>

        <h3 className="mb-2 mt-4 font-heading text-sm font-semibold text-theme-secondary">Get Settings</h3>
        <CodeBlock lang="bash" code={`curl http://localhost:8090/api/settings \\
  -H "Authorization: Bearer ADMIN_TOKEN"`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Update Settings</h3>
        <CodeBlock lang="bash" code={`curl -X PATCH http://localhost:8090/api/settings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "appName": "My App",
    "appURL": "https://example.com",
    "smtp": {
      "host": "smtp.sendgrid.net",
      "port": 587,
      "username": "apikey",
      "password": "SG.xxx"
    },
    "s3": {
      "enabled": true,
      "bucket": "my-bucket",
      "region": "us-east-1",
      "accessKey": "AKIA...",
      "secret": "..."
    },
    "ai": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "sk-...",
      "model": "gpt-4o-mini"
    },
    "rateLimits": {
      "enabled": true,
      "rules": [{ "duration": 60, "requests": 100 }]
    }
  }'`} />
      </DocSection>

      <DocSection id="smtp-configuration" title="SMTP Configuration">
        <p className="text-theme-secondary">
          SMTP is used for email verification, password reset, and OTP delivery. The password
          field is encrypted at rest.
        </p>

        <CodeBlock lang="json" code={`{
  "smtp": {
    "host": "smtp.sendgrid.net",
    "port": 587,
    "username": "apikey",
    "password": "SG.xxx",
    "tls": true
  }
}`} />
      </DocSection>

      <DocSection id="s3-configuration" title="S3 Configuration">
        <p className="text-theme-secondary">
          See the <a href="/docs/file-storage/s3-configuration" className="text-primary hover:underline">File Storage</a>{' '}
          page for full S3 documentation.
        </p>

        <CodeBlock lang="json" code={`{
  "s3": {
    "enabled": true,
    "bucket": "my-bucket",
    "region": "us-east-1",
    "endpoint": "https://s3.amazonaws.com",
    "accessKey": "AKIA...",
    "secret": "...",
    "prefix": "uploads/"
  }
}`} />
      </DocSection>

      <DocSection id="ai-configuration" title="AI Configuration">
        <p className="text-theme-secondary">
          Solarch can connect to multiple LLM providers to power schema generation, rule translation,
          data seeding, and the admin chat assistant. Configure the provider once through the Settings
          API or Admin UI, then every AI feature uses the same credentials.
        </p>
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-theme-secondary">
            <strong className="text-theme">Provider:</strong> Choose between OpenAI, Anthropic, Ollama,
            or a custom OpenAI-compatible API. Ollama is great for local development because it sends
            no data to third-party servers.
          </p>
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          <code className="text-primary">baseURL</code> is only needed for Ollama or custom providers
          (e.g., <code className="text-primary">http://localhost:11434</code>).{' '}
          <code className="text-primary">temperature</code> controls creativity — lower values (0.1–0.3)
          produce more deterministic output for schema and rule generation, while higher values (0.7+)
          make the chat assistant feel more conversational. <code className="text-primary">maxTokens</code>{' '}
          caps the response length to keep latency low and costs predictable.
        </p>
        <CodeBlock lang="json" code={`{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseURL": "",
    "maxTokens": 2048,
    "temperature": 0.7
  }
}`} />
      </DocSection>

      <DocSection id="rate-limiting" title="Rate Limiting">
        <p className="text-theme-secondary">
          Configure per-window request limits. Rules are evaluated in order. The first matching
          rule wins.
        </p>

        <CodeBlock lang="json" code={`{
  "rateLimits": {
    "enabled": true,
    "rules": [
      { "duration": 60, "requests": 100 },
      { "duration": 3600, "requests": 1000 }
    ]
  }
}`} />
      </DocSection>

      <DocSection id="environment-variables" title="Environment Variables">
        <p className="text-theme-secondary">
          Environment variables are useful when you want to configure Solarch without touching
          the database or the Admin UI. They are read once at startup and override any default
          values. Use them in Docker containers, CI/CD pipelines, or deployment platforms like
          Vercel, Railway, and Fly.io where you do not have filesystem access to a config file.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Variable</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Default</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { var: 'NODE_ENV', def: 'development', desc: 'Environment mode' },
                { var: 'PORT', def: '8090', desc: 'Server port' },
                { var: 'DATA_DIR', def: './pb_data', desc: 'SQLite data directory' },
              ].map((row, idx) => (
                <tr
                  key={row.var}
                  className={`transition-colors hover:bg-theme-muted ${
                    idx !== 2 ? 'border-b border-theme' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-theme-surface px-1.5 py-0.5 text-xs text-primary">{row.var}</code>
                  </td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.def}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="architecture-diagram" title="Architecture Diagram">
        <p className="text-theme-secondary">
          Solarch is organized into modular layers that separate concerns and make the codebase
          easy to navigate. At the top level, <code className="text-primary">solarch.ts</code> is the
          main application class that wires everything together — database, settings, collections,
          hooks, and the HTTP server. <code className="text-primary">cli.ts</code> provides the command-line
          interface for starting the server, creating superusers, and running migrations.
        </p>

        <MermaidDiagram
          caption="High-level system architecture"
          children={`flowchart TB
    subgraph Client
      A[Web App]
      B[Mobile App]
      C[Admin UI /_/]
    end
    subgraph Server
      D[Express HTTP API]
      E[Auth Middleware]
      F[API Rules Engine]
      G[CRUD Handlers]
      H[Realtime Broker]
      I[JSVM Hooks]
    end
    subgraph Core
      J[Collections and Records]
      K[Schema Sync]
      L[Filter Parser]
      M[Migration Runner]
    end
    subgraph Storage
      N[SQLite data.db]
      O[SQLite auxiliary.db]
      P[Local Filesystem]
      Q[S3-compatible]
    end
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> J
    G --> H
    H --> A
    H --> B
    J --> K
    J --> L
    J --> M
    K --> N
    K --> O
    G --> P
    G --> Q
    I --> J
    style D fill:#1a6fff,color:#fff
    style N fill:#1a6fff,color:#fff`}
        />
        <p className="mt-4 text-sm text-theme-tertiary">
          The <code className="text-primary">core/</code> directory contains the heart of the system:
          collection and record models, the dual-SQLite database layer, schema synchronization,
          and the filter engine. <code className="text-primary">apis/</code> houses the Express routes
          and middleware stack. <code className="text-primary">tools/</code> contains reusable utilities
          like the OAuth2 registry, file-system drivers, the JSVM sandbox for hooks, and the cron
          scheduler. <code className="text-primary">ai/</code> is a thin abstraction over LLM providers,
          and <code className="text-primary">admin/</code> is the React/Vite single-page app served at{' '}
          <code className="text-primary">/_/</code>.
        </p>

        <CodeBlock lang="bash" code={`src/
├── solarch.ts          # Solarch class, bootstrap, JS migrations
├── cli.ts                 # CLI: serve, superuser-create, migrate
├── core/
│   ├── base.ts            # BaseApp: hooks, DB, settings, collections
│   ├── db.ts              # Dual SQLite (data.db + auxiliary.db)
│   ├── collection.ts      # Collection model (base/auth/view)
│   ├── record.ts          # Record model
│   ├── field.ts           # 14 field types including vector
│   ├── settings.ts        # AppSettings + encryption
│   ├── record_query.ts    # findById, filter, count, vectorSearch
│   ├── record_field_resolver.ts  # @request.* macros + modifiers
│   ├── record_upsert.ts   # Validation + array modifiers
│   ├── schema_sync.ts     # Auto table creation/alteration
│   ├── migration.ts       # MigrationRunner with status/rollback
│   ├── auth_models.ts     # MFA, OTP, AuthOrigin, ExternalAuth
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
│   ├── file.ts            # Upload/download with auth + tokens
│   ├── batch.ts           # Transaction-wrapped batch API
│   ├── auth_flows.ts      # Password reset, verification
│   ├── admin_auth.ts      # Admin login, refresh
│   ├── ai.ts              # AI endpoints
│   ├── backup.ts          # Backup listing/management
│   ├── logs.ts            # Log viewer
│   └── middlewares_*.ts   # CORS, gzip, rate limit, auth
├── tools/
│   ├── auth/oauth2.ts     # OAuth2 registry + providers
│   ├── filesystem/        # Local + S3 blob drivers
│   ├── jsvm/jsvm.ts       # pb_hooks/ JavaScript runner
│   ├── hook/hook.ts       # Event system with tags
│   ├── cron/cron.ts       # Job scheduler
│   ├── mailer/            # SMTP + email templates
│   ├── search/filter.ts   # Filter parser + SQL builder
│   └── security/crypto.ts # JWT, bcrypt, AES, random
└── admin/                 # React/Vite Admin UI`} />
      </DocSection>

      <DocSection id="config-loading" title="Config Loading Order">
        <p className="text-theme-secondary">
          Solarch loads configuration in a specific priority. Values set later override earlier
          ones, so environment variables always win over file-based defaults.
        </p>

        <MermaidDiagram
          caption="Configuration priority (later overrides earlier)"
          children={`flowchart LR
    A[Built-in Defaults] --> B[pb_data/settings.json]
    B --> C[.env File]
    C --> D[Environment Variables]
    D --> E[CLI Flags]
    E --> F[Runtime API]
    style A fill:#1a6fff,color:#fff
    style F fill:#1a6fff,color:#fff`}
        />

        <p className="mt-4 text-sm text-theme-tertiary">
          This means you can safely commit a <code className="text-primary">settings.json</code> with
          development defaults, then override sensitive values like API keys via environment variables
          in production. CLI flags like <code className="text-primary">--port</code> take precedence
          over everything except programmatic changes made after the server starts.
        </p>
      </DocSection>
    </article>
  )
}
