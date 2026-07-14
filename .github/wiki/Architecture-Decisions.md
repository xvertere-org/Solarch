# Architecture Decisions

This page records significant architectural decisions made in Solarch.

---

## ADR-001: SQLite as the default database

**Status:** Accepted

**Context:** We needed a zero-config database that works out of the box for a backend-as-a-service.

**Decision:** Use SQLite (via better-sqlite3) as the default database.

**Consequences:**
- Single-node deployments are trivial
- No external database dependencies
- File-based backups are easy
- Trade-off: horizontal scaling requires external database (PostgreSQL planned)

---

## ADR-002: Dual-database architecture

**Status:** Accepted

**Context:** Application data (collections, records) and system data (settings, migrations, auth sessions) have different backup and migration needs.

**Decision:** Split into `data.db` (app data) and `auxiliary.db` (system data).

**Consequences:**
- System tables don't clutter app backups
- Migrations can reference auxiliary metadata safely
- Two files to manage instead of one

---

## ADR-003: Express.js over Fastify

**Status:** Accepted

**Context:** We needed a mature, well-documented HTTP framework with extensive middleware ecosystem.

**Decision:** Use Express.js over Fastify.

**Consequences:**
- Familiar API for most Node.js developers
- Huge middleware ecosystem
- Slightly lower performance than Fastify (acceptable for our use case)

---

## ADR-004: Node VM for JavaScript hooks

**Status:** Accepted

**Context:** We wanted to allow users to extend behavior with JavaScript without compromising security.

**Decision:** Run pb_hooks/ in a Node VM sandbox.

**Consequences:**
- Hooks are isolated from main process
- Limited globals (no fs, network access)
- Slightly slower than native code
- Safer than eval or require

---

## ADR-005: React/Vite for Admin UI

**Status:** Accepted

**Context:** The Admin UI needs to be a modern SPA with good DX.

**Decision:** Build Admin UI with React + Vite, served as static files.

**Consequences:**
- Fast development with Vite HMR
- Small bundle size
- Easy to customize and fork
- Must be built before deployment

---

## ADR-006: AI Tools as first-class features

**Status:** Accepted

**Context:** AI-assisted development is becoming standard. Integrating it natively provides value.

**Decision:** Build AI schema generation, rule generation, and chat directly into the platform.

**Consequences:**
- Requires LLM API keys (optional feature)
- Increases bundle size slightly
- Differentiates from PocketBase
- Can be fully disabled
