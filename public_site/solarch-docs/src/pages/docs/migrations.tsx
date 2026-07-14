import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { RotateCcw } from 'lucide-react'

export default function Migrations() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Migrations</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch supports JavaScript migrations in the <code className="text-primary">pb_migrations/</code>{' '}
        directory. Migrations run automatically on server start and can be managed via CLI or
        programmatically.
      </p>

      <MermaidDiagram
        caption="Migration lifecycle"
        children={`flowchart TD
    A[Server Start] --> B{Pending Migrations?}
    B -->|Yes| C[Run up Functions]
    C --> D[Update Migration Log]
    D --> E[Schema Sync]
    B -->|No| F[Skip]
    E --> G[Server Ready]
    F --> G
    G --> H[Developer Runs Rollback]
    H --> I[Run down Functions]
    I --> J[Revert Migration Log]
    J --> K[Schema Sync]
    style C fill:#1a6fff,color:#fff
    style I fill:#f59e0b,color:#fff`}
      />

      <DocSection id="directory-structure" title="Directory Structure">
        <CodeBlock lang="bash" code={`pb_migrations/
├── 001_create_posts.js
├── 002_add_user_roles.js
└── README.md`} />

        <p className="mt-3 text-sm text-theme-tertiary">
          Files are executed in alphanumeric order. Use a numeric prefix (001, 002, etc.) to
          maintain sequence.
        </p>
      </DocSection>

      <DocSection id="migration-file-format" title="Migration File Format">
        <p className="text-theme-secondary">
          Each migration exports an <code className="text-primary">up</code> function (required) and
          an optional <code className="text-primary">down</code> function for rollback. Both receive
          the app instance.
        </p>

        <CodeBlock lang="javascript" filename="pb_migrations/001_create_posts.js" code={`module.exports = {
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
}`} />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'up(app)', desc: 'Runs when migrating forward. Required.' },
            { label: 'down(app)', desc: 'Runs when rolling back. Optional.' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-theme bg-theme-surface px-3 py-2">
              <code className="text-xs text-primary">{item.label}</code>
              <p className="mt-0.5 text-xs text-theme-tertiary">{item.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="running-migrations" title="Running Migrations">
        <h3 className="mb-2 mt-4 font-heading text-sm font-semibold text-theme-secondary">1. Automatic</h3>
        <p className="text-sm text-theme-tertiary">
          Migrations run automatically every time the server starts. Already-applied migrations
          are skipped based on a tracking table in the auxiliary database.
        </p>

        <MermaidDiagram
          caption="Migration status tracking"
          children={`flowchart LR
    A[pb_migrations/] --> B[Read Files]
    C[_migrations Table] --> D[Read Applied]
    B --> E[Compare]
    D --> E
    E --> F[Pending List]
    F --> G[Run up]
    G --> H[Update Table]
    style G fill:#1a6fff,color:#fff
    style H fill:#1a6fff,color:#fff`}
        />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">2. CLI</h3>
        <CodeBlock lang="bash" code={`# Run all pending migrations
solarch migrate up

# Rollback the last migration
solarch migrate down

# Rollback 3 migrations
solarch migrate down 3

# Check status
solarch migrate status`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">3. Programmatic</h3>
        <CodeBlock lang="typescript" code={`const app = new Solarch()
await app.bootstrap()

// Run all pending migrations
await app.migrate()

// Rollback last 2 migrations
await app.migrateDown(2)

// Get status
const status = app.migrationStatus()
console.log(status)`} />
      </DocSection>

      <MermaidDiagram
        caption="Migration up vs down flow"
        children={`flowchart LR
    subgraph Up
      A[001_create_posts.js] --> B[up: CREATE TABLE]
      C[002_add_roles.js] --> D[up: ALTER TABLE]
    end
    subgraph Down
      D --> E[down: Revert ALTER]
      B --> F[down: DROP TABLE]
    end
    style B fill:#1a6fff,color:#fff
    style D fill:#1a6fff,color:#fff
    style E fill:#f59e0b,color:#fff
    style F fill:#f59e0b,color:#fff`}
      />

      <DocSection id="rollback" title="Rollback">
        <p className="text-theme-secondary">
          Rollback uses the <code className="text-primary">down()</code> function from each migration
          file. The <code className="text-primary">count</code> parameter controls how many
          migrations to undo.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-theme-secondary">
            Always write a <code className="text-primary">down()</code> function for migrations
            that modify schema. Data-only migrations can skip it if rollback is not needed.
          </p>
        </div>
      </DocSection>
    </article>
  )
}
