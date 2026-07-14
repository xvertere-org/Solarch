import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { Database, Lock, Eye } from 'lucide-react'

export default function Collections() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Collections & Records</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Collections are the backbone of Solarch. They define your data schema, access rules,
        and relationships. Every collection automatically syncs to SQLite tables.
      </p>

      <MermaidDiagram
        caption="Collection and record lifecycle"
        children={`flowchart TD
    A[Define Collection] --> B[Schema Sync]
    B --> C[SQLite Table Created]
    C --> D[API Endpoints Active]
    D --> E{CRUD Operation}
    E -->|Create| F[Validate Fields]
    E -->|Read| G[Apply API Rules]
    E -->|Update| H[Check Update Rule]
    E -->|Delete| I[Check Delete Rule]
    F --> J[Insert Record]
    G --> K[Return Filtered Data]
    H --> L[Patch Record]
    I --> M[Remove Record]
    J --> N[Trigger Hooks]
    L --> N
    M --> N
    N --> O[Realtime Broadcast]
    style A fill:#1a6fff,color:#fff
    style O fill:#1a6fff,color:#fff`}
      />

      <DocSection id="collection-types" title="Collection Types">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Database,
              title: 'base',
              desc: 'Standard data collection. Stores records with custom fields. Use for posts, products, orders — any entity.',
            },
            {
              icon: Lock,
              title: 'auth',
              desc: 'User accounts with built-in auth fields: email, password, verified, tokenKey. Supports all auth strategies.',
            },
            {
              icon: Eye,
              title: 'view',
              desc: 'Read-only SQL view. Define a SELECT query and expose it as a collection. Great for reports and aggregations.',
            },
          ].map((t) => (
            <div
              key={t.title}
              className="rounded-xl border border-theme bg-theme-surface p-5"
            >
              <t.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-heading text-sm font-semibold text-theme">
                {t.title}
              </h3>
              <p className="text-xs leading-relaxed text-theme-tertiary">{t.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="field-types" title="Field Types">
        <p className="mb-4 text-theme-secondary">
          Solarch ships with 14 field types. Each maps to an appropriate SQLite column type.
        </p>

        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Type</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Description</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Special Options</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'text', desc: 'Plain text string', opts: 'max, min' },
                { type: 'number', desc: 'Integer or float', opts: 'max, min' },
                { type: 'email', desc: 'Valid email address', opts: '—' },
                { type: 'url', desc: 'Valid URL', opts: '—' },
                { type: 'bool', desc: 'True / false', opts: 'default' },
                { type: 'date', desc: 'ISO 8601 datetime', opts: '—' },
                { type: 'select', desc: 'Single or multi-select', opts: 'values[], maxSelect' },
                { type: 'file', desc: 'Uploaded file(s)', opts: 'maxSelect, maxSize' },
                { type: 'relation', desc: 'Link to another collection', opts: 'collectionId, maxSelect' },
                { type: 'json', desc: 'Structured JSON data', opts: '—' },
                { type: 'editor', desc: 'Rich text / markdown', opts: '—' },
                { type: 'autodate', desc: 'Auto-set created / updated', opts: '—' },
                { type: 'geoPoint', desc: 'Latitude & longitude', opts: '—' },
                { type: 'vector', desc: 'Embedding vector array', opts: 'dimensions' },
              ].map((f, idx) => (
                <tr
                  key={f.type}
                  className={`transition-colors hover:bg-theme-muted ${
                    idx !== 13 ? 'border-b border-theme' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-theme-surface px-1.5 py-0.5 text-xs text-primary">{f.type}</code>
                  </td>
                  <td className="px-4 py-2.5 text-theme-secondary">{f.desc}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{f.opts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="api-rules" title="API Rules">
        <p className="text-theme-secondary">
          Every collection defines five API rules that control who can list, view, create, update,
          and delete records. Rules use Solarch's filter expression syntax.
        </p>

        <MermaidDiagram
          caption="API rule evaluation flow"
          children={`flowchart TD
    A[Incoming Request] --> B{Authenticated?}
    B -->|Yes| C[Load request auth macros]
    B -->|No| D[Skip Auth Macros]
    C --> E[Parse API Rule]
    D --> E
    E --> F[Evaluate Filter]
    F -->|True| G[Allow Operation]
    F -->|False| H[Deny 403]
    G --> I[Execute Handler]
    style G fill:#1a6fff,color:#fff
    style H fill:#ef4444,color:#fff`}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { rule: 'listRule', desc: 'Who can list records' },
            { rule: 'viewRule', desc: 'Who can view a single record' },
            { rule: 'createRule', desc: 'Who can create records' },
            { rule: 'updateRule', desc: 'Who can update records' },
            { rule: 'deleteRule', desc: 'Who can delete records' },
          ].map((r) => (
            <div
              key={r.rule}
              className="rounded-lg border border-theme bg-theme-surface px-3 py-2.5"
            >
              <code className="text-xs text-primary">{r.rule}</code>
              <p className="mt-0.5 text-xs text-theme-tertiary">{r.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">@request Macros</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Macros let you write rules that depend on the current request context. Use them to restrict
          access based on who is logged in, what HTTP method is being used, or what data is being sent.
          For example, <code className="text-primary">@request.auth.id</code> resolves to the ID of the
          currently authenticated user, so a rule like <code className="text-primary">author = @request.auth.id</code>{' '}
          guarantees users can only update their own posts.
        </p>
        <CodeBlock lang="bash" code={`@request.auth.id       # Current user's ID
@request.auth.email    # Current user's email
@request.method        # HTTP method (GET, POST, etc.)
@request.data.title     # Field value from the request body`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Field Modifiers</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Modifiers transform field values during rule evaluation. Attach them to a field name with a
          colon. For example, <code className="text-primary">title:lower ~ "hello"</code> compares the
          lowercased title against the string, making the match case-insensitive.
        </p>
        <CodeBlock lang="bash" code={`:lower     # Lowercase value
:upper     # Uppercase value
:length    # String length
:isset     # Check if field exists
:each      # Apply to each array item
:excerpt   # Truncated text snippet
:trim      # Remove whitespace
:abs       # Absolute value`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Functions</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Built-in functions extend what you can express in rules. <code className="text-primary">geoDistance</code>{' '}
          calculates the Haversine distance between two lat/lng pairs in kilometers, useful for
          location-based filtering. <code className="text-primary">strftime</code> formats dates using
          SQLite's date formatting syntax.
        </p>
        <CodeBlock lang="bash" code={`geoDistance(lat1, lon1, lat2, lon2)   # Haversine distance in km
strftime(format, date)                 # SQLite date formatting`} />
      </DocSection>

      <DocSection id="create-collection" title="Create a Collection">
        <p className="text-theme-secondary">
          Collections are created via the Admin API. The schema sync engine automatically creates
          the corresponding SQLite table.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "name": "posts",
    "type": "base",
    "fields": [
      {"name": "title", "type": "text", "required": true},
      {"name": "body", "type": "editor"},
      {"name": "published", "type": "bool"},
      {"name": "tags", "type": "select", "values": ["tech", "life", "news"], "maxSelect": 3}
    ],
    "listRule": "published = true || @request.auth.id != \\"\\"",
    "createRule": "@request.auth.id != \\"\\"",
    "updateRule": "author = @request.auth.id",
    "deleteRule": "author = @request.auth.id"
  }'`} />
      </DocSection>

      <DocSection id="crud-records" title="CRUD Records">
        <p className="text-theme-secondary">
          Records are the rows inside a collection. The CRUD endpoints follow standard REST conventions
          but respect your collection's API rules, so a user may be allowed to create a record yet
          forbidden from deleting it.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">List with Filter, Sort, Pagination</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Use the list endpoint to query records. <code className="text-primary">filter</code> accepts
          Solarch's filter expression syntax. <code className="text-primary">sort</code> uses field
          names; prefix with <code className="text-primary">-</code> for descending order. Results are
          paginated with <code className="text-primary">page</code> and <code className="text-primary">perPage</code>.
          The response envelope includes <code className="text-primary">items</code>,{' '}
          <code className="text-primary">totalItems</code>, and <code className="text-primary">totalPages</code>.
        </p>
        <CodeBlock lang="bash" code={`curl "http://localhost:8090/api/collections/posts/records?filter=published=true&sort=-created&page=1&perPage=20"`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Get Single Record</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Fetch a specific record by its ID. The response includes every field value and any
          auto-generated timestamps. Use <code className="text-primary">?expand=author</code> to inline
          related records without a second request.
        </p>
        <CodeBlock lang="bash" code={`curl http://localhost:8090/api/collections/posts/records/RECORD_ID`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Create</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Send a JSON body matching your collection schema. Required fields must be present or the
          request returns a 400 validation error. The response is the newly created record with its
          generated ID and timestamps.
        </p>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/posts/records \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Hello","body":"World","published":true}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Update (PATCH)</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          PATCH updates only the fields you send. Omitting a field leaves its current value untouched.
          For array fields, use <code className="text-primary">+fieldName</code> to append and{' '}
          <code className="text-primary">fieldName-</code> to remove items.
        </p>
        <CodeBlock lang="bash" code={`curl -X PATCH http://localhost:8090/api/collections/posts/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Updated"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Delete</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Permanently removes the record and its associated files. This action cannot be undone unless
          you have a backup. The response is an empty 204 on success.
        </p>
        <CodeBlock lang="bash" code={`curl -X DELETE http://localhost:8090/api/collections/posts/records/RECORD_ID`} />
      </DocSection>

      <DocSection id="filter-syntax" title="Filter Syntax">
        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Operator</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Meaning</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                { op: '=', meaning: 'Equal', ex: 'status = "published"' },
                { op: '!=', meaning: 'Not equal', ex: 'status != "draft"' },
                { op: '>', meaning: 'Greater than', ex: 'price > 100' },
                { op: '<', meaning: 'Less than', ex: 'price < 500' },
                { op: '~', meaning: 'Like / contains', ex: 'title ~ "hello"' },
                { op: '%', meaning: 'Starts with', ex: 'name % "John"' },
                { op: '@', meaning: 'In array', ex: 'tags @ "tech"' },
                { op: '?=', meaning: 'Any equal', ex: 'tags ?= "tech"' },
                { op: '?:', meaning: 'Any contains', ex: 'tags ?: "te"' },
                { op: '?~', meaning: 'Any like', ex: 'tags ?~ "te"' },
              ].map((row, idx) => (
                <tr
                  key={row.op}
                  className={`transition-colors hover:bg-theme-muted ${
                    idx !== 9 ? 'border-b border-theme' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-theme-surface px-1.5 py-0.5 text-xs text-primary">{row.op}</code>
                  </td>
                  <td className="px-4 py-2.5 text-theme-secondary">{row.meaning}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-theme-tertiary">
          Combine with <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">&&</code> and{' '}
          <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">||</code> for complex logic:
        </p>
        <CodeBlock lang="bash" code={`filter=(status="published" && created>"2024-01-01") || author="USER_ID"`} />
      </DocSection>

      <DocSection id="array-modifiers" title="Array Modifiers">
        <p className="text-theme-secondary">
          Append or remove items from select and relation arrays without fetching the full record.
        </p>

        <h3 className="mb-2 mt-4 font-heading text-sm font-semibold text-theme-secondary">Append</h3>
        <CodeBlock lang="bash" code={`curl -X PATCH http://localhost:8090/api/collections/posts/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{"+tags": "tech"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Remove</h3>
        <CodeBlock lang="bash" code={`curl -X PATCH http://localhost:8090/api/collections/posts/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{"tags-": "life"}'`} />
      </DocSection>

      <DocSection id="view-collections" title="View Collections">
        <p className="text-theme-secondary">
          View collections are read-only SQL views. Define a SELECT query and Solarch exposes
          it as a regular collection with full filter and sort support.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "name": "published_posts",
    "type": "view",
    "viewOptions": {"query": "SELECT * FROM _r_COLLECTION_ID WHERE published = 1"}
  }'`} />
      </DocSection>

      <DocSection id="back-relations" title="Back-Relations">
        <p className="text-theme-secondary">
          Solarch auto-generates back-relation field names using the pattern{' '}
          <code className="text-primary">collection_via_fieldName</code>. Use them in filters,
          expands, or API rules.
        </p>

        <CodeBlock lang="bash" code={`# If "posts" has a relation field "author" pointing to "users",
# Solarch creates a back-relation:
#   posts_via_author

# Use in filter
filter=posts_via_author.title ~ "hello"

# Use in expand
expand=posts_via_author`} />
      </DocSection>

      <DocSection id="record-expansion" title="Record Expansion">
        <p className="text-theme-secondary">
          Fetch related records inline using the <code className="text-primary">expand</code> query
          parameter. Deep nesting is supported.
        </p>

        <CodeBlock lang="bash" code={`# Expand the author relation
curl "http://localhost:8090/api/collections/posts/records/RECORD_ID?expand=author"

# Expand nested relations
curl "http://localhost:8090/api/collections/posts/records/RECORD_ID?expand=author,author.team"`} />
      </DocSection>
    </article>
  )
}
