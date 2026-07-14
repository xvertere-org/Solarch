import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { Zap, Server, Unplug } from 'lucide-react'

export default function Realtime() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Realtime</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch supports two realtime strategies: Server-Sent Events (SSE) and WebSocket.
        Both use a subscription broker that routes record changes to connected clients.
      </p>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            icon: Zap,
            title: 'WebSocket',
            desc: 'Bidirectional. Best for apps that need to subscribe and publish from the same connection.',
          },
          {
            icon: Server,
            title: 'SSE',
            desc: 'Unidirectional server push. Great for dashboards and simple live updates. Works over HTTP.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-theme bg-theme-surface p-5"
          >
            <item.icon className="mb-3 h-5 w-5 text-primary" />
            <h3 className="mb-1 font-heading text-sm font-semibold text-theme">{item.title}</h3>
            <p className="text-xs leading-relaxed text-theme-tertiary">{item.desc}</p>
          </div>
        ))}
      </div>

      <MermaidDiagram
        caption="Realtime connection lifecycle"
        children={`sequenceDiagram
    participant Client
    participant WS as WebSocket / SSE
    participant Broker as Subscription Broker
    participant DB as SQLite
    Client->>WS: Connect
    WS->>Broker: Register Client
    Client->>WS: Subscribe to collections.posts
    WS->>Broker: Add to Channel
    DB->>Broker: Record Changed
    Broker->>WS: Broadcast Event
    WS->>Client: event update record
    Client->>WS: Unsubscribe
    WS->>Broker: Remove from Channel
    Client->>WS: Disconnect
    WS->>Broker: Cleanup Client`}
      />

      <DocSection id="websocket" title="WebSocket">
        <p className="text-theme-secondary">
          Connect to the WebSocket endpoint, send a subscribe message, and handle incoming record
          change events.
        </p>

        <CodeBlock lang="javascript" code={`const ws = new WebSocket('ws://localhost:8090/api/realtime')

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['collections.posts.records']
  }))
}

ws.onmessage = (e) => {
  const data = JSON.parse(e.data)
  console.log(data.event, data.record)
  // data.event = 'create' | 'update' | 'delete'
}`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Annotated Flow</h3>
        <ol className="space-y-2 text-sm text-theme-secondary">
          <li><strong className="text-theme-secondary">1. Connect</strong> — Open a WebSocket to <code className="text-primary">/api/realtime</code></li>
          <li><strong className="text-theme-secondary">2. Subscribe</strong> — Send a subscribe message with one or more channels</li>
          <li><strong className="text-theme-secondary">3. Handle</strong> — Listen for <code className="text-primary">create</code>, <code className="text-primary">update</code>, or <code className="text-primary">delete</code> events</li>
          <li><strong className="text-theme-secondary">4. Unsubscribe</strong> — Send an unsubscribe message to stop receiving events</li>
        </ol>
      </DocSection>

      <DocSection id="sse" title="Server-Sent Events (SSE)">
        <p className="text-theme-secondary">
          SSE is a simpler alternative that uses standard HTTP. It is one-directional: the server
          pushes events to the client. No special protocol handshake required.
        </p>

        <CodeBlock lang="javascript" code={`const es = new EventSource('http://localhost:8090/api/realtime')

es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  console.log(data.event, data.record)
}

es.onerror = (e) => {
  console.error('SSE error', e)
}`} />
      </DocSection>

      <MermaidDiagram
        caption="Realtime event broadcast model"
        children={`flowchart TD
    A[Record Created] --> B[Broker]
    C[Record Updated] --> B
    D[Record Deleted] --> B
    B --> E{Channels}
    E -->|posts| F[Client A]
    E -->|posts| G[Client B]
    E -->|users| H[Client C]
    F -.-> I[Update UI]
    G -.-> I
    style B fill:#1a6fff,color:#fff`}
      />

      <DocSection id="subscription-channels" title="Subscription Channels">
        <p className="text-theme-secondary">
          Channels follow a predictable naming convention. Subscribe to broad collections or
          specific records.
        </p>

        <CodeBlock lang="bash" code={`collections.posts.records           # All posts changes
collections.posts.records:RECORD_ID  # Specific post only
collections.users.records             # All users changes`} />
      </DocSection>

      <MermaidDiagram
        caption="WebSocket connection state machine"
        children={`stateDiagram-v2
    [*] --> Connecting
    Connecting --> Open : onopen
    Open --> Subscribed : subscribe
    Subscribed --> Open : unsubscribe
    Open --> Closed : onclose disconnect
    Subscribed --> Closed : onclose disconnect
    Closed --> [*]
    Connecting --> Closed : connection refused`}
      />

      <DocSection id="disconnect-cleanup" title="Disconnect Cleanup">
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Unplug className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-theme-secondary">
            Subscriptions are automatically cleaned up when a client disconnects. You do not need
            to manually unsubscribe before closing the connection. The broker removes stale
            subscriptions on a periodic heartbeat check.
          </p>
        </div>
      </DocSection>
    </article>
  )
}
