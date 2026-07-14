# Project Status & Roadmap

Last updated: April 2026

---

## Current Status

Solarch is actively developed and in a **usable beta** state. The core platform is stable enough for production side projects, hobby apps, and internal tools.

### What Works Today

| Feature | Status | Notes |
|---------|--------|-------|
| **SQLite Database** | Stable | Dual-DB architecture (data.db + auxiliary.db), 14 field types, schema sync |
| **Authentication** | Stable | Email/password, OAuth2, OTP, MFA/TOTP with JWT refresh tokens |
| **Collections & Records** | Stable | CRUD, filtering, sorting, pagination, record expansion, back-relations |
| **File Storage** | Stable | Local filesystem + S3-compatible, thumbnails, protected tokens |
| **Realtime** | Stable | WebSocket + SSE with subscription broker |
| **Admin UI** | Stable | React/Vite SPA with dashboard, collection editor, record browser |
| **AI Tools** | Beta | Schema gen, rule gen, data seeding, chat assistant (OpenAI, Anthropic, Ollama) |
| **Vector Search** | Beta | Cosine similarity search via custom SQLite function |
| **JavaScript Hooks** | Stable | pb_hooks/ sandbox with onBootstrap, onRecordCreate, etc. |
| **Migrations** | Stable | JS migration runner with auto-run on startup |
| **Rate Limiting** | Stable | Configurable per-window rules |
| **Settings Encryption** | Stable | AES encryption for SMTP, S3, AI credentials |

### Current Version

- **npm:** `0.2.6`
- **Node.js requirement:** >= 20.0.0
- **License:** Apache-2.0

### Known Limitations

- No built-in clustering support (single-node only)
- Admin UI is English-only
- OAuth2 providers are limited to GitHub, Google, Discord, Facebook (extensible though)
- No built-in GraphQL endpoint
- WebSocket scaling requires sticky sessions in multi-node deployments

---

## Roadmap

### Q2 2026 (Apr–Jun)

| Priority | Feature | Description |
|----------|---------|-------------|
| High | **PostgreSQL adapter** | Add PostgreSQL as an alternative to SQLite for larger workloads |
| High | **TypeScript SDK** | Auto-generated TS client from collection schemas |
| High | **Webhooks** | Outgoing webhooks for record changes |
| Medium | **Email templates editor** | Rich HTML email template editor in Admin UI |
| Medium | **Backup scheduler** | Automated scheduled backups with S3 upload |
| Low | **CLI scaffolding** | `solarch create-app` for frontend boilerplate |

### Q3 2026 (Jul–Sep)

| Priority | Feature | Description |
|----------|---------|-------------|
| High | **Multi-tenancy** | Workspace/organization isolation |
| High | **GraphQL API** | Optional GraphQL layer alongside REST |
| High | **Plugin system** | Installable plugins from npm |
| Medium | **RBAC** | Role-based access control beyond API rules |
| Medium | **Audit logging** | Immutable audit trail for compliance |
| Low | **Admin UI themes** | Customizable Admin UI themes |

### Q4 2026 (Oct–Dec)

| Priority | Feature | Description |
|----------|---------|-------------|
| High | **Horizontal scaling** | Redis-backed session and realtime broker |
| High | **Edge deployment** | Cloudflare Workers / Vercel Edge runtime support |
| Medium | **Database replication** | Read replicas for scaling read-heavy workloads |
| Medium | **Admin mobile app** | React Native admin companion |
| Low | **Community marketplace** | Plugin and template marketplace |

---

## How to Influence the Roadmap

1. **Vote on issues:** Add a thumbs-up to existing feature requests
2. **Open a discussion:** [GitHub Discussions](https://github.com/Jay-Suryawansh7/solarch/discussions)
3. **Sponsor a feature:** If you need something urgently, open an issue and we can prioritize it

---

## Completed Milestones

| Version | Date | Highlights |
|---------|------|------------|
| v0.2.6 | Apr 2026 | Docs site launched, contribution templates added, Mermaid diagrams |
| v0.2.0 | Mar 2026 | AI tools, vector search, MFA/TOTP |
| v0.1.0 | Feb 2026 | Initial release with core CRUD, auth, file storage |
