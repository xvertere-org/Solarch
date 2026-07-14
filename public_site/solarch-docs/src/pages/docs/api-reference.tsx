import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { KeyRound } from 'lucide-react'

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-400 border-green-500/20',
    PATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        colors[method] ?? 'bg-theme-surface text-theme-tertiary border-theme-hover'
      }`}
    >
      {method}
    </span>
  )
}

function ApiTable({ rows }: { rows: { method: string; endpoint: string; auth: string; desc: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-theme">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-theme bg-theme-surface">
            <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Method</th>
            <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Endpoint</th>
            <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Auth / Rule</th>
            <th className="px-4 py-2.5 font-heading font-semibold text-theme-tertiary">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.method}-${row.endpoint}`}
              className={`transition-colors hover:bg-theme-muted ${
                idx !== rows.length - 1 ? 'border-b border-theme' : ''
              }`}
            >
              <td className="px-4 py-2.5">
                <MethodBadge method={row.method} />
              </td>
              <td className="px-4 py-2.5">
                <code className="text-xs text-theme-secondary">{row.endpoint}</code>
              </td>
              <td className="px-4 py-2.5 text-xs text-theme-tertiary">{row.auth}</td>
              <td className="px-4 py-2.5 text-xs text-theme-tertiary">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function APIReference() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">API Reference</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Complete reference for the Solarch HTTP API. All endpoints return JSON and use standard
        HTTP status codes.
      </p>

      <MermaidDiagram
        caption="API request lifecycle"
        children={`flowchart TD
    A[Client Request] --> B{Auth Header?}
    B -->|Yes| C[Validate JWT]
    B -->|No| D[Public Endpoint?]
    C -->|Valid| E[Extract User / Admin]
    C -->|Invalid| F[401 Unauthorized]
    D -->|Yes| G[Apply API Rules]
    D -->|No| F
    E --> G
    G -->|Allowed| H[Execute Handler]
    G -->|Denied| I[403 Forbidden]
    H --> J[Return JSON Response]
    F --> K[Return Error JSON]
    I --> K
    style H fill:#1a6fff,color:#fff
    style F fill:#ef4444,color:#fff
    style I fill:#ef4444,color:#fff`}
      />

      <DocSection id="base-url" title="Base URL">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-theme bg-theme-surface px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">Development</span>
            <code className="mt-1 block text-sm text-primary">http://localhost:8090</code>
          </div>
          <div className="rounded-lg border border-theme bg-theme-surface px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">Production</span>
            <code className="mt-1 block text-sm text-primary">https://your-domain.com</code>
          </div>
        </div>
      </DocSection>

      <DocSection id="authentication" title="Authentication">
        <p className="text-theme-secondary">
          Pass your token in the <code className="text-primary">Authorization</code> header.
          Solarch accepts two token types:
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-theme bg-theme-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-theme">User JWT</span>
            </div>
            <CodeBlock lang="bash" code={`Authorization: Bearer USER_JWT_TOKEN`} />
          </div>
          <div className="rounded-lg border border-theme bg-theme-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-theme">Admin JWT</span>
            </div>
            <CodeBlock lang="bash" code={`Authorization: Bearer ADMIN_JWT_TOKEN`} />
          </div>
        </div>
      </DocSection>

      <DocSection id="collections" title="Collections">
        <p className="text-theme-secondary">
          Collections define your data schema, access rules, and field types. Every collection is
          automatically synced to an SQLite table. Use these endpoints to manage collections
          programmatically. All collection endpoints require admin authentication because schema
          changes affect the entire database.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'GET', endpoint: '/api/collections', auth: 'Admin', desc: 'List all collections' },
              { method: 'GET', endpoint: '/api/collections/:id', auth: 'Admin', desc: 'Get collection by ID' },
              { method: 'POST', endpoint: '/api/collections', auth: 'Admin', desc: 'Create collection' },
              { method: 'PATCH', endpoint: '/api/collections/:id', auth: 'Admin', desc: 'Update collection' },
              { method: 'DELETE', endpoint: '/api/collections/:id', auth: 'Admin', desc: 'Delete collection' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          When you create or update a collection, the schema sync engine automatically creates or
          alters the underlying SQLite table. You do not need to write migration SQL for schema
          changes made through the API.
        </p>
      </DocSection>

      <DocSection id="records" title="Records">
        <p className="text-theme-secondary">
          Records are the actual rows inside a collection. Each record endpoint respects the
          collection's API rules, so a request may be allowed or denied based on who is asking.
          Use query parameters for filtering, sorting, pagination, and record expansion.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'GET', endpoint: '/api/collections/:c/records', auth: 'List rule', desc: 'List records with filter/sort' },
              { method: 'GET', endpoint: '/api/collections/:c/records/:id', auth: 'View rule', desc: 'Get single record' },
              { method: 'POST', endpoint: '/api/collections/:c/records', auth: 'Create rule', desc: 'Create record' },
              { method: 'PATCH', endpoint: '/api/collections/:c/records/:id', auth: 'Update rule', desc: 'Update record' },
              { method: 'DELETE', endpoint: '/api/collections/:c/records/:id', auth: 'Delete rule', desc: 'Delete record' },
              { method: 'POST', endpoint: '/api/collections/:c/vector-search', auth: 'List rule', desc: 'Vector similarity search' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          List responses include a pagination envelope with <code className="text-primary">page</code>,{' '}
          <code className="text-primary">perPage</code>, <code className="text-primary">totalItems</code>,
          and <code className="text-primary">totalPages</code>. Use <code className="text-primary">expand</code>{' '}
          to inline related records and <code className="text-primary">fields</code> to limit the returned
          columns.
        </p>
      </DocSection>

      <DocSection id="auth" title="Auth">
        <p className="text-theme-secondary">
          Auth endpoints live inside auth-type collections (usually <code className="text-primary">users</code>).
          They handle registration, login, token refresh, password reset, and multi-factor setup.
          Most auth endpoints are public; MFA setup and linked-account listing require a valid Bearer token.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'POST', endpoint: '/api/collections/:c/auth-with-password', auth: '—', desc: 'Login with email/password' },
              { method: 'POST', endpoint: '/api/collections/:c/auth-with-oauth2', auth: '—', desc: 'Login with OAuth2' },
              { method: 'POST', endpoint: '/api/collections/:c/auth-with-otp', auth: '—', desc: 'Login with OTP' },
              { method: 'POST', endpoint: '/api/collections/:c/request-otp', auth: '—', desc: 'Request OTP code' },
              { method: 'POST', endpoint: '/api/collections/:c/refresh', auth: '—', desc: 'Refresh JWT token' },
              { method: 'POST', endpoint: '/api/collections/:c/mfa/setup', auth: 'Bearer', desc: 'Setup TOTP MFA' },
              { method: 'POST', endpoint: '/api/collections/:c/mfa/verify', auth: 'Bearer', desc: 'Verify TOTP code' },
              { method: 'GET', endpoint: '/api/collections/:c/methods', auth: '—', desc: 'List auth methods' },
              { method: 'GET', endpoint: '/api/collections/:c/external-auths', auth: 'Bearer', desc: 'List linked OAuth accounts' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          After successful login you receive a <code className="text-primary">token</code> (JWT access)
          and a <code className="text-primary">refreshToken</code>. Send the access token in the{' '}
          <code className="text-primary">Authorization: Bearer</code> header for authenticated requests.
          Use the refresh endpoint to obtain a new access token without asking the user to log in again.
        </p>
      </DocSection>

      <DocSection id="admin" title="Admin">
        <p className="text-theme-secondary">
          Admin endpoints manage superuser access. Admins are not stored inside regular collections;
          they have their own authentication flow and can perform any action regardless of API rules.
          Protect admin credentials carefully and rotate tokens regularly.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'POST', endpoint: '/api/admins/auth-with-password', auth: '—', desc: 'Admin login' },
              { method: 'POST', endpoint: '/api/admins/refresh', auth: 'Bearer', desc: 'Refresh admin token' },
              { method: 'POST', endpoint: '/api/admins/request-password-reset', auth: '—', desc: 'Request password reset' },
              { method: 'POST', endpoint: '/api/admins/confirm-password-reset', auth: '—', desc: 'Confirm password reset' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          Admin tokens are short-lived JWTs. If you are building an automated integration, store the
          refresh token securely and rotate it on every refresh response. Admin password-reset emails
          are sent through the configured SMTP provider.
        </p>
      </DocSection>

      <DocSection id="files" title="Files">
        <p className="text-theme-secondary">
          File endpoints handle uploads, downloads, and deletions. Files are stored per-record inside
          a collection. Downloads respect the collection's <code className="text-primary">viewRule</code>;
          if a file is protected, generate a time-limited signed token first.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'POST', endpoint: '/api/files/token', auth: 'Bearer', desc: 'Generate protected file token' },
              { method: 'GET', endpoint: '/api/files/:c/:recordId/:filename', auth: 'View rule / Token', desc: 'Download file' },
              { method: 'POST', endpoint: '/api/collections/:c/records/:id/files', auth: 'Update rule', desc: 'Upload files' },
              { method: 'DELETE', endpoint: '/api/collections/:c/records/:id/files/:filename', auth: 'Update rule', desc: 'Delete file' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          Uploads use multipart/form-data. When S3 is configured, uploaded files are streamed directly
          to the configured bucket. Thumbnails are generated automatically for images using the{' '}
          <code className="text-primary">?thumb=WxH</code> query parameter on the download URL.
        </p>
      </DocSection>

      <MermaidDiagram
        caption="Batch transaction flow"
        children={`flowchart TD
    A[POST /api/batch] --> B[Start Transaction]
    B --> C[Operation 1]
    C --> D{Success?}
    D -->|Yes| E[Operation 2]
    D -->|No| F[Rollback All]
    E --> G{Success?}
    G -->|Yes| H[Commit Transaction]
    G -->|No| F
    F --> I[Return Error]
    H --> J[Return Results]
    style H fill:#1a6fff,color:#fff
    style F fill:#ef4444,color:#fff`}
      />

      <DocSection id="other" title="Other">
        <p className="text-theme-secondary">
          These utility endpoints cover batch operations, realtime subscriptions, health checks,
          logging, backups, and AI tools. Batch requests are transaction-wrapped: if one operation
          fails, the entire batch rolls back.
        </p>
        <div className="mt-4">
          <ApiTable
            rows={[
              { method: 'POST', endpoint: '/api/batch', auth: 'Bearer', desc: 'Batch operations (transaction-wrapped)' },
              { method: 'GET/POST', endpoint: '/api/realtime', auth: '—', desc: 'Realtime SSE endpoint' },
              { method: 'GET', endpoint: '/api/health', auth: '—', desc: 'Health check' },
              { method: 'GET', endpoint: '/api/logs', auth: 'Admin', desc: 'Request logs' },
              { method: 'GET/POST', endpoint: '/api/backups', auth: 'Admin', desc: 'Backup management' },
              { method: 'GET/PATCH', endpoint: '/api/settings', auth: 'Admin', desc: 'App settings' },
              { method: 'POST', endpoint: '/api/ai/*', auth: 'Admin', desc: 'AI tools (schema, rule, seed, chat)' },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-theme-tertiary">
          The health endpoint is ideal for load-balancer or uptime-monitor checks. The realtime endpoint
          supports both Server-Sent Events and WebSocket connections; subscribe to specific channels to
          receive create, update, and delete events for records.
        </p>
      </DocSection>
    </article>
  )
}
