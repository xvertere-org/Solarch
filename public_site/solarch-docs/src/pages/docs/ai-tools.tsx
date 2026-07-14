import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { Bot } from 'lucide-react'

export default function AITools() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">AI Tools</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch has built-in AI tools powered by OpenAI, Anthropic, Ollama, or any
        OpenAI-compatible API. Generate schemas from descriptions, write access rules in plain
        English, seed realistic data, and chat with an admin assistant.
      </p>

      <MermaidDiagram
        caption="AI tools request flow"
        children={`flowchart TD
    A[Admin UI / API Call] --> B[AI Tools Endpoint]
    B --> C{Choose Provider}
    C -->|OpenAI| D[gpt-4o-mini]
    C -->|Anthropic| E[claude-3-haiku]
    C -->|Ollama| F[llama3.1 local]
    C -->|Custom| G[Any OpenAI-compat]
    D --> H[Return Result]
    E --> H
    F --> H
    G --> H
    H --> I[Seed / Translate / Chat / RAG]
    style B fill:#1a6fff,color:#fff
    style H fill:#1a6fff,color:#fff`}
      />

      <DocSection id="supported-providers" title="Supported Providers">
        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Provider</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Config Fields</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Model Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                { provider: 'OpenAI', config: 'provider, apiKey, model', model: 'gpt-4o-mini' },
                { provider: 'Anthropic', config: 'provider, apiKey, model', model: 'claude-3-haiku' },
                { provider: 'Ollama', config: 'provider, baseURL', model: 'llama3.1' },
                { provider: 'Custom', config: 'provider, baseURL, apiKey', model: '—' },
              ].map((row, idx) => (
                <tr
                  key={row.provider}
                  className={`transition-colors hover:bg-theme-muted ${
                    idx !== 3 ? 'border-b border-theme' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-theme-secondary">{row.provider}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.config}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="configuration" title="Configuration">
        <p className="text-theme-secondary">
          Configure AI in your settings via the Admin UI or PATCH the settings API. API keys are
          encrypted at rest with AES.
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

      <MermaidDiagram
        caption="AI schema generation pipeline"
        children={`flowchart LR
    A[Plain Text Description] --> B[AI Tools Endpoint]
    B --> C{Provider}
    C --> D[LLM Prompt]
    D --> E[Generate Schema JSON]
    E --> F[Validate Against Schema]
    F -->|Valid| G[Return Collection Config]
    F -->|Invalid| H[Retry / Error]
    style G fill:#1a6fff,color:#fff
    style H fill:#ef4444,color:#fff`}
      />

      <DocSection id="schema-generator" title="Schema Generator">
        <p className="text-theme-secondary">
          Describe what you want in plain English and get a fully-formed collection schema with
          fields, rules, and relations.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/ai/generate-collection \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"description":"A blog post with title, content, tags, and author relation"}'`} />

        <p className="mt-3 text-sm text-theme-tertiary">Example response:</p>
        <CodeBlock lang="json" code={`{
  "name": "posts",
  "type": "base",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "content", "type": "editor", "required": true },
    { "name": "tags", "type": "select", "maxSelect": 10, "values": [] },
    { "name": "author", "type": "relation", "maxSelect": 1 }
  ],
  "listRule": "published = true || @request.auth.id != \\"\\"",
  "createRule": "@request.auth.id != \\"\\"",
  "updateRule": "author = @request.auth.id"
}`} />
      </DocSection>

      <DocSection id="rule-generator" title="Rule Generator">
        <p className="text-theme-secondary">
          Turn plain-English security requirements into Solarch filter expressions.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/ai/generate-rule \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "update",
    "description": "Only the record owner can update"
  }'`} />

        <p className="mt-3 text-sm text-theme-tertiary">Example response:</p>
        <CodeBlock lang="json" code={`{
  "rule": "author = @request.auth.id"
}`} />
      </DocSection>

      <DocSection id="data-seeder" title="Data Seeder">
        <p className="text-theme-secondary">
          Generate realistic seed data for any collection using constraints like price ranges,
          locales, or product categories.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/ai/seed \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collectionName": "products",
    "count": 10,
    "constraints": "Tech gadgets, prices between $10-$500"
  }'`} />
      </DocSection>

      <MermaidDiagram
        caption="AI chat assistant request flow"
        children={`sequenceDiagram
    participant User
    participant AdminUI
    participant API
    participant LLM
    User->>AdminUI: Type question
    AdminUI->>API: POST /api/ai/chat
    API->>API: Build context
    API->>LLM: Send prompt
    LLM-->>API: Stream response
    API-->>AdminUI: SSE chunks
    AdminUI-->>User: Display answer`}
      />

      <DocSection id="chat-assistant" title="Chat Assistant">
        <p className="text-theme-secondary">
          A browser-based AI assistant is built into the Admin UI at{' '}
          <code className="text-primary">/_/#/ai</code>. You can also use the API directly.
        </p>

        <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-theme-secondary">
            The chat UI supports streaming responses via SSE. Ask questions like
            "What collections do I have?" or "Create a todo app with users and tasks."
          </p>
        </div>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/ai/chat \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What collections do I have?"}'`} />
      </DocSection>
    </article>
  )
}
