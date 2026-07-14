import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import { Info, ExternalLink } from 'lucide-react'

const TORQUE_URL = 'https://trytorque.vercel.app'

export default function TorquePage() {
  return (
    <article>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-heading text-4xl font-bold text-theme">Torque</h1>
        <a
          href={TORQUE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Open Torque <ExternalLink className="size-3" />
        </a>
      </div>

      <DocSection id="overview" title="Overview">
        <p className="mb-4 text-theme-secondary">
          Torque is a visual workflow canvas for building AI agent pipelines. Drag nodes, connect them,
          configure every parameter, and export the pipeline into your Solarch backend — where it becomes a
          runnable service with API endpoints, execution history, and full observability.
        </p>

        <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm text-theme-secondary">
            <strong className="text-theme">Try it now:</strong>{' '}
            <a href={TORQUE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:brightness-110">
              torque.vercel.app
            </a>{' '}
            — no login required. Drag nodes onto the canvas, configure them in the right panel, and export to
            your Solarch instance via the API.
          </div>
        </div>

        <h3 className="mb-3 mt-6 font-heading text-lg font-bold text-theme">Quick Start</h3>

        <div className="overflow-hidden rounded-xl border border-theme bg-theme-surface">
          <div className="flex items-center justify-between border-b border-theme px-4 py-2">
            <span className="text-xs font-medium text-theme-tertiary">TERMINAL</span>
          </div>
          <CodeBlock
            code={`cd torque
npm install
cp .env.example .env  # set NEXT_PUBLIC_SOLARCH_URL
npm run dev           # → http://localhost:3000`}
            lang="bash"
            filename="terminal"
          />
        </div>

        <p className="mt-4 text-theme-secondary">
          Point <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SOLARCH_URL</code> to your running
          Solarch instance (default <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">http://localhost:8090</code>).
          The canvas fetches available node types from Solarch, or falls back to 48 built-in defaults.
        </p>
      </DocSection>

      <DocSection id="node-types" title="Node Types (48)">
        <p className="mb-4 text-theme-secondary">
          Torque ships with 48 node types across 6 categories. Each node exposes a configuration
          form rendered automatically from its schema.
        </p>

        {[
          {
            cat: 'Triggers',
            color: 'text-amber-400',
            nodes: [
              ['Webhook', 'Receive HTTP requests (GET, POST, PUT, PATCH, DELETE)'],
              ['Schedule', 'Cron-triggered execution'],
              ['Form Submit', 'Triggered when a Solarch collection record is created'],
              ['Email Received', 'Trigger on incoming email via IMAP polling'],
              ['DB Watcher', 'Realtime subscription to collection changes'],
              ['Custom Event', 'Named event fired from another workflow or external system'],
            ],
          },
          {
            cat: 'AI',
            color: 'text-purple-400',
            nodes: [
              ['LLM Chat', 'Send prompts to Claude, GPT-4o, or GPT-4.1 with system prompts, temperature, and token limits'],
              ['Vision', 'Analyze images with vision-capable LLMs'],
              ['Tool-Using Agent', 'LLM with function-calling — define tools it can invoke'],
              ['Embeddings', 'Generate vector embeddings (OpenAI text-embedding-3)'],
              ['Classifier', 'Classify input into predefined categories'],
              ['Extractor', 'Extract structured JSON from unstructured text'],
              ['Translate', 'Translate text between languages'],
              ['Summarize', 'Generate concise summaries (concise, detailed, bullet-points, TL;DR, executive)'],
              ['RAG Search', 'Semantic search over vector embeddings'],
              ['Generate Image', 'Image generation via DALL-E 3 or Stable Diffusion'],
              ['Transcribe Audio', 'Speech-to-text via Whisper'],
            ],
          },
          {
            cat: 'Data',
            color: 'text-blue-400',
            nodes: [
              ['Get / List / Create / Update / Delete Record', 'Full PocketBase CRUD with filter, sort, pagination, and expand'],
              ['Parse JSON', 'Parse a JSON string into an object'],
              ['Transform', 'Template-based data transformation with {{variable}} interpolation'],
              ['Filter Array', 'Filter items by condition expression'],
              ['Aggregate', 'Sum, avg, count, min, max, group-by on arrays'],
              ['Merge Data', 'Merge multiple inputs into a single object or array (3 inputs)'],
              ['Split Array', 'Chunk or individual item output'],
              ['Sort Data', 'Sort by field, asc/desc'],
              ['Deduplicate', 'Remove duplicates by key field'],
            ],
          },
          {
            cat: 'Actions',
            color: 'text-green-400',
            nodes: [
              ['HTTP Request', 'Full HTTP client with method, headers, body, timeout, retry'],
              ['GraphQL Query', 'Execute queries/mutations against a GraphQL endpoint'],
              ['Send Email', 'SMTP or PocketBase mailer with CC/BCC'],
              ['Push Notification', 'Multi-channel push (web, mobile, email, urgent)'],
              ['Slack / Discord', 'Post messages via webhooks'],
              ['Send SMS (Twilio)', 'Send SMS in E.164 format'],
              ['GitHub Action', 'Dispatch workflow, create issue, or PR comment'],
              ['Notion — Create Page', 'Create pages in a Notion database'],
              ['File Upload', 'Upload to Solarch file storage'],
              ['Send Webhook', 'Outgoing webhook to any URL'],
              ['Generate PDF', 'HTML-to-PDF generation'],
            ],
          },
          {
            cat: 'Logic',
            color: 'text-red-400',
            nodes: [
              ['Condition', 'True/false branching with expression'],
              ['Switch', 'Multi-branch routing by value matching (5 outputs)'],
              ['For Each', 'Iterate over arrays (sequential, parallel, batch modes)'],
              ['Delay', 'Pause execution with optional jitter'],
              ['Custom Code', 'Execute JavaScript snippets'],
              ['Retry', 'Wrap branches with retry + exponential backoff'],
              ['Try / Catch', 'Graceful error handling split-path'],
              ['Parallel', 'Execute branches concurrently with timeout control'],
              ['Throttle', 'Rate-limit downstream execution'],
              ['Deduplicate Events', 'Prevent duplicate processing within a time window'],
            ],
          },
          {
            cat: 'Output',
            color: 'text-gray-400',
            nodes: [
              ['Log Output', 'Log data to execution log (debug, info, warn, error)'],
              ['Webhook Response', 'HTTP response back to webhook caller'],
              ['Export CSV', 'Export data array as CSV file'],
              ['Save to Collection', 'Persist data to a Solarch collection'],
              ['Return Data', 'Return data from the workflow execution'],
              ['Slack Webhook (Block Kit)', 'Rich Slack messages via Block Kit JSON'],
            ],
          },
        ].map(({ cat, color, nodes }) => (
          <div key={cat} className="mb-6">
            <h3 className={`mb-2 font-heading text-base font-bold ${color}`}>{cat}</h3>
            <div className="overflow-hidden rounded-xl border border-theme">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-theme bg-theme-surface">
                    <th className="px-4 py-2 font-heading font-semibold text-theme-tertiary w-[200px]">Node</th>
                    <th className="px-4 py-2 font-heading font-semibold text-theme-tertiary">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(([name, desc], i) => (
                    <tr key={i} className="border-b border-theme last:border-0">
                      <td className="px-4 py-2 font-medium text-theme">{name}</td>
                      <td className="px-4 py-2 text-xs text-theme-secondary">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </DocSection>

      <DocSection id="multi-handle" title="Multi-Handle Connections">
        <p className="mb-4 text-theme-secondary">
          Many nodes expose multiple connection handles (ports) for fine-grained wiring:
        </p>
        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Node</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Handles</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['LLM Chat', '← Prompt (left), ← Memory (top), ← Tools (bottom), Response → (right), Stream → (bottom)'],
                ['HTTP Request', '← Input (left), ← Config (top), Response → (right), Error → (bottom)'],
                ['Condition', '← Input (left), True → (right), False → (bottom)'],
                ['Switch', '← Input (left), Cases 1-3 → (right/bottom), Default → (right)'],
                ['For Each', '← Array (left), Each Item → (right), Complete → (bottom)'],
                ['Try / Catch', '← Try (left), Success → (right), Error → (bottom)'],
                ['Retry', '← Input (left), Result → (right), Exhausted → (bottom)'],
                ['Merge', '← Source A/B/C (left/top/bottom), Merged → (right)'],
              ].map(([name, handles], i) => (
                <tr key={i} className="border-b border-theme last:border-0">
                  <td className="px-4 py-2 font-medium text-theme">{name}</td>
                  <td className="px-4 py-2 text-xs text-theme-secondary font-mono">{handles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="exporting" title="Exporting Workflows">
        <p className="mb-4 text-theme-secondary">
          Click the <strong className="text-theme">Export</strong> button in the Torque top bar
          to register the workflow with your Solarch instance via{' '}
          <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">POST /api/agents/workflows/register</code>.
          If Solarch is not reachable, the workflow downloads as a JSON file.
        </p>

        <div className="overflow-hidden rounded-xl border border-theme bg-theme-surface">
          <div className="flex items-center justify-between border-b border-theme px-4 py-2">
            <span className="text-xs font-medium text-theme-tertiary">JSON</span>
          </div>
          <CodeBlock
            code={`{
  "workflowId": "customer-support-agent",
  "name": "Customer Support Agent",
  "nodes": [
    { "id": "n1", "type": "webhook", "config": { "method": "POST" } },
    { "id": "n2", "type": "classify", "config": { "categories": "billing\\ntechnical\\ngeneral" } },
    { "id": "n3", "type": "llm", "config": { "model": "claude-sonnet-4-20250514", "systemPrompt": "You are..." } },
    { "id": "n4", "type": "save_record", "config": { "collection": "tickets" } }
  ],
  "edges": [
    { "id": "e1", "from": "n1", "to": "n2", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e2", "from": "n2", "to": "n3", "sourceHandle": "case_0", "targetHandle": "prompt" },
    { "id": "e3", "from": "n3", "to": "n4", "sourceHandle": "response", "targetHandle": "input" }
  ]
}`}
            lang="json"
            filename="workflow.json"
          />
        </div>
      </DocSection>

      <DocSection id="api-endpoints" title="API Endpoints">
        <p className="mb-4 text-theme-secondary">
          Once exported, workflows are managed and executed through the Solarch agent API:
        </p>

        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Method</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Endpoint</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['GET', '/api/agents/nodes', 'List all registered node types'],
                ['POST', '/api/agents/workflows/register', 'Register or update a workflow'],
                ['GET', '/api/agents/workflows', 'List all registered workflows'],
                ['GET', '/api/agents/workflows/:id', 'Get workflow definition'],
                ['DELETE', '/api/agents/workflows/:id', 'Delete a workflow'],
                ['POST', '/api/agents/workflows/:id/execute', 'Execute a workflow'],
                ['GET', '/api/agents/workflows/:id/execute/stream', 'SSE-streamed execution'],
                ['GET', '/api/agents/workflows/:id/executions', 'Execution history'],
                ['GET', '/api/agents/executions/:id', 'Single execution detail'],
              ].map(([method, path, desc], i) => (
                <tr key={i} className="border-b border-theme last:border-0">
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      method === 'GET' ? 'bg-green-500/10 text-green-400' :
                      method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                      method === 'DELETE' ? 'bg-red-500/10 text-red-400' : ''
                    }`}>{method}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-theme">{path}</td>
                  <td className="px-4 py-2 text-xs text-theme-secondary">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>
    </article>
  )
}
