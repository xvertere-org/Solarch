import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { AlertTriangle } from 'lucide-react'

export default function Hooks() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">JavaScript Hooks</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Drop <code className="text-primary">.js</code> files into a{' '}
        <code className="text-primary">pb_hooks/</code> directory in your project root. They run
        in a sandboxed Node VM on server start, giving you a lightweight way to extend behavior
        without modifying core code.
      </p>

      <MermaidDiagram
        caption="Hook execution lifecycle"
        children={`flowchart TD
    A[Server Start] --> B[Load pb_hooks/*.js]
    B --> C[Compile in Node VM]
    C --> D[onBootstrap hook]
    D --> E[onServe hook]
    E --> F[API Request]
    F --> G{Operation}
    G -->|Create| H[onRecordCreate]
    G -->|Update| I[onRecordUpdate]
    G -->|Delete| J[onRecordDelete]
    G -->|Auth| K[onAuthSuccess / onAuthFail]
    H --> L[Response Sent]
    I --> L
    J --> L
    K --> L
    style D fill:#1a6fff,color:#fff
    style H fill:#1a6fff,color:#fff
    style I fill:#1a6fff,color:#fff`}
      />

      <DocSection id="available-hook-events" title="Available Hook Events">
        <div className="overflow-hidden rounded-xl border border-theme">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-surface">
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Hook</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">When it fires</th>
                <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Event object</th>
              </tr>
            </thead>
            <tbody>
              {[
                { hook: 'onBootstrap', when: 'After app bootstraps', event: 'app' },
                { hook: 'onServe', when: 'After server starts', event: 'app, server' },
                { hook: 'onRecordCreate', when: 'After record created', event: 'app, record, collection' },
                { hook: 'onRecordUpdate', when: 'After record updated', event: 'app, record, collection' },
                { hook: 'onRecordDelete', when: 'After record deleted', event: 'app, record, collection' },
              ].map((row, idx) => (
                <tr
                  key={row.hook}
                  className={`transition-colors hover:bg-theme-muted ${
                    idx !== 4 ? 'border-b border-theme' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-theme-surface px-1.5 py-0.5 text-xs text-primary">{row.hook}</code>
                  </td>
                  <td className="px-4 py-2.5 text-theme-secondary">{row.when}</td>
                  <td className="px-4 py-2.5 text-theme-tertiary">{row.event}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="available-globals" title="Available Globals">
        <p className="text-theme-secondary">
          Hooks run in a sandboxed VM with a curated set of globals. You do not have access to
          Node.js modules like <code className="text-primary">fs</code> or{' '}
          <code className="text-primary">http</code>.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { name: '$app', desc: 'App proxy: settings(), db(), findCollectionByNameOrId()' },
            { name: 'console', desc: 'Standard console.log / error / warn' },
            { name: 'require', desc: 'Limited require for built-in modules' },
            { name: 'Buffer', desc: 'Node.js Buffer for binary data' },
            { name: 'JSON', desc: 'Standard JSON parse / stringify' },
            { name: 'Date', desc: 'Standard Date object' },
          ].map((g) => (
            <div key={g.name} className="rounded-lg border border-theme bg-theme-surface px-3 py-2">
              <code className="text-xs text-primary">{g.name}</code>
              <p className="mt-0.5 text-xs text-theme-tertiary">{g.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <MermaidDiagram
        caption="JSVM sandbox architecture"
        children={`flowchart TD
    A[pb_hooks/*.js] --> B[Node VM]
    B --> C[Create Isolated Context]
    C --> D[Inject Globals]
    D --> E[$app Proxy]
    D --> F[console / Buffer / JSON]
    E --> G[Restricted API Access]
    F --> H[Standard JS APIs]
    G --> I[Hook Execution]
    H --> I
    I --> J[Return Result]
    style B fill:#1a6fff,color:#fff
    style I fill:#1a6fff,color:#fff`}
      />

      <DocSection id="examples" title="Examples">
        <h3 className="mb-2 mt-4 font-heading text-sm font-semibold text-theme-secondary">Log on Create</h3>
        <CodeBlock lang="javascript" filename="pb_hooks/on_record_create.js" code={`onRecordCreate('posts', (e) => {
  console.log('New post created:', e.record.get('title'))
})`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Validate on Update</h3>
        <CodeBlock lang="javascript" filename="pb_hooks/on_record_update.js" code={`onRecordUpdate('products', (e) => {
  const price = e.record.get('price')
  if (price < 0) {
    throw new Error('Price cannot be negative')
  }
})`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Notify on Delete</h3>
        <CodeBlock lang="javascript" filename="pb_hooks/on_record_delete.js" code={`onRecordDelete('orders', (e) => {
  const orderId = e.record.get('id')
  // Use $app to send an email notification
  const mailer = $app.mailer()
  mailer.send({
    to: 'admin@example.com',
    subject: 'Order deleted',
    text: 'Order ' + orderId + ' was deleted.'
  })
})`} />
      </DocSection>

      <DocSection id="sandbox-limitations" title="Sandbox Limitations">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-sm text-theme-secondary">
            <p className="mb-1 font-medium text-theme-secondary">Hook files run in a Node VM sandbox</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>No ES modules — use <code className="rounded bg-theme-muted px-1 py-0.5 text-xs">module.exports</code></li>
              <li>No top-level await</li>
              <li>No filesystem or network access outside $app helpers</li>
              <li>Hooks are loaded once at server startup</li>
            </ul>
          </div>
        </div>
      </DocSection>
    </article>
  )
}
