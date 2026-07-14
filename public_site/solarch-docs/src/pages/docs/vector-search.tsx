import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'

export default function VectorSearch() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Vector Search</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Store embedding vectors alongside your records and search by cosine similarity. Built on
        the <code className="text-primary">vector</code> field type with a custom SQLite function.
      </p>

      <MermaidDiagram
        caption="Vector search pipeline"
        children={`flowchart LR
    A[Raw Text] --> B[Embedding Model]
    B --> C[Vector 1536-d]
    C --> D[SQLite fts5_vos]
    E[Query Text] --> F[Query Embedding]
    F --> G[Vector Search]
    D --> G
    G --> H[Top-K Results]
    style B fill:#1a6fff,color:#fff
    style G fill:#1a6fff,color:#fff`}
      />

      <DocSection id="setup" title="Setup">
        <p className="text-theme-secondary">
          Create a collection with a <code className="text-primary">vector</code> field. Set the
          dimensions to match your embedding model (e.g. 1536 for OpenAI, 768 for sentence-transformers).
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "name": "documents",
    "type": "base",
    "fields": [
      {"name": "title", "type": "text"},
      {"name": "embedding", "type": "vector", "dimensions": 1536}
    ]
  }'`} />
      </DocSection>

      <DocSection id="inserting-vectors" title="Inserting Vectors">
        <p className="text-theme-secondary">
          Patch a record with an embedding array. The vector field stores the array as a binary
          blob for fast similarity search.
        </p>

        <CodeBlock lang="bash" code={`curl -X PATCH http://localhost:8090/api/collections/documents/records/RECORD_ID \\
  -H "Content-Type: application/json" \\
  -d '{
    "embedding": [0.1, 0.2, 0.3, 0.4, 0.5, ...]
  }'`} />
      </DocSection>

      <MermaidDiagram
        caption="Cosine similarity search flow"
        children={`flowchart LR
    A[Query Text] --> B[Embedding Model]
    B --> C[Query Vector]
    D[(SQLite Vectors)] --> E[cosineSimilarity]
    C --> E
    E --> F[Score 0-1]
    F --> G{Above threshold}
    G -->|Yes| H[Include in Results]
    G -->|No| I[Filter Out]
    H --> J[Sort by Score]
    J --> K[Return Top-K]
    style E fill:#1a6fff,color:#fff
    style K fill:#1a6fff,color:#fff`}
      />

      <DocSection id="search-api" title="Search API">
        <p className="text-theme-secondary">
          Perform a cosine similarity search against stored vectors. Results are ranked by
          similarity score and filtered by the optional <code className="text-primary">minSimilarity</code>{' '}
          threshold.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/documents/vector-search \\
  -H "Content-Type: application/json" \\
  -d '{
    "field": "embedding",
    "vector": [0.1, 0.2, 0.3, ...],
    "limit": 10,
    "minSimilarity": 0.8
  }'`} />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { param: 'field', desc: 'Name of the vector field to search' },
            { param: 'vector', desc: 'Query embedding array (must match dimensions)' },
            { param: 'limit', desc: 'Max results (default: 20)' },
            { param: 'minSimilarity', desc: 'Minimum cosine similarity (0–1)' },
          ].map((p) => (
            <div key={p.param} className="rounded-lg border border-theme bg-theme-surface px-3 py-2">
              <code className="text-xs text-primary">{p.param}</code>
              <p className="mt-0.5 text-xs text-theme-tertiary">{p.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="sql-function" title="SQL Function">
        <p className="text-theme-secondary">
          Under the hood, Solarch registers a custom SQLite function called{' '}
          <code className="text-primary">cosineSimilarity(a, b)</code> that computes the cosine
          similarity between two vector blobs. You can use it directly in view collections or raw
          SQL queries.
        </p>

        <CodeBlock lang="sql" code={`SELECT *, cosineSimilarity(embedding, :query) AS score
FROM documents
WHERE score > 0.8
ORDER BY score DESC
LIMIT 10`} />
      </DocSection>
    </article>
  )
}
