# Changelog

## v0.20.1 — Platform-First Init Wizard & UX Alignment (2026-08-22)

Targeted bug-fix and UX alignment release aligning the project creation experience (`solarch init`) with the platform-first architecture.

### Fixed & Enhanced
- **Database Setup Intent Layer**:
  - Replaced manual `DATABASE_URL` prompt with platform-first intent options (`Local development`, `Link Solarch project`, `Configure later`).
  - Scaffolds local container infrastructure (`docker-compose.yml`) for local PostgreSQL/MongoDB setups while registering remote database requirements cleanly for managed deployments.
- **Application Capability Selection & SDK Resolution**:
  - Decoupled application types from capabilities — added explicit multi-select capability configuration (`Authentication`, `Realtime Subscriptions`, `File Storage`, `AI Features`, `Vector Search`, `Payments & Billing`).
  - Dynamic capability resolver automatically maps declared capabilities to required SDK packages (`solarch-web`, `solarch-ai`, `solarch-rn`, `solarch-electron`, `solarch-tauri`).
  - Added interactive SDK installation preview showing resolved packages and install commands before file mutation.
- **Credential-Free Configuration Hardening**:
  - Removed database connection strings from generated `solarch.config.ts`, ensuring secrets and connection URLs live strictly in runtime environments (`.env`).
- **Dynamic CLI Version Resolution**:
  - Removed hardcoded version strings from local project metadata manifests (`.solarch/project.json`), dynamically resolving the active CLI version from runtime packages.
- **Database-Aware Status Messaging**:
  - Replaced misleading remote database success indicators with clear engine-specific status messages for SQLite, PostgreSQL, and MongoDB.

## v0.20.0 — Solarch Platform Control Plane & MCP Governance Release (2026-08-22)

Major architectural release establishing the Solarch Developer Operating System with remote platform authentication, SDK provisioning, database lifecycle, production deployment orchestration, telemetry, service control plane, and MCP external agent governance.

### Added
- **Phase 1: Ecosystem-Aware Project Scaffolding (`solarch init`)**:
  - Deterministic recommendation engine for database topologies (`sqlite_only`, `sqlite_local_postgres_cloud`, `serverless`), SDKs, and plugins.
  - Interactive project intent wizard with live preview and configuration presets.
- **Phase 2: Platform Authentication & Identity (`solarch login`, `solarch whoami`, `solarch logout`)**:
  - Strict credential precedence (flag > environment > persisted session).
  - Ephemeral local callback server with OAuth 2.0 PKCE challenge flow.
- **Phase 3: SDK Provisioning & Synchronization (`solarch sdk`)**:
  - `solarch sdk add <packages...>`: Installs client SDKs using friendly short names (`web`, `mobile`, `ai`, `electron`, `tauri`).
  - `solarch sdk list`: Displays installed, required, and available ecosystem packages.
  - `solarch sdk sync`: Reconciles project SDK requirements and environment variables with remote platform projects.
- **Phase 4: Platform Project Configuration & 3-Way Reconciliation (`solarch project`)**:
  - `solarch project diff`: 3-way differ comparing local manifest, base snapshot, and remote platform configuration.
  - `solarch project pull` & `solarch project push`: Safe, non-conflicting bi-directional synchronization.
- **Phase 5 & 5.1: Plugin Ecosystem & Lifecycle Isolation (`solarch plugin`)**:
  - Discovery, installation, dependency resolution, and runtime hooks for official extensions (`auth-oauth`, `storage-s3`, `billing-stripe`, `search-pgvector`, `telemetry-otel`).
  - In-process sandboxed execution with timeout, circuit breaking, and strict capability gating.
- **Phase 6: Remote Database Management & Secret Boundaries (`solarch db`)**:
  - `solarch db status`: Real-time topology and engine health monitoring.
  - `solarch db provision`: Serverless database provisioning across Neon, Turso, Supabase, Cloudflare D1, and AWS Aurora.
  - `solarch db sync`: Manifest topology reconciliation with zero local secret leakage.
- **Phase 7 & 7.x: Production Deployment & Provenance Hardening (`solarch deploy`)**:
  - Deterministic zero-secret bundle packaging with SHA-256 integrity verification and automated secret scanning.
  - Immutable deployment releases with health-gated promotions, log streaming (`solarch deploy logs`), and atomic rollbacks (`solarch deploy rollback`).
- **Phase 8: Telemetry, Observability & Strict W3C Context (`solarch metrics`, `solarch traces`, `solarch alerts`)**:
  - Fail-open in-memory metrics collector with mathematical percentiles (p50, p95, p99) and pre-persistence secret sanitization.
  - W3C TraceContext propagator with parent-child span waterfall timelines.
- **Phase 9: Production Service Control Plane & Staged Canary Promotion (`solarch service`)**:
  - `solarch service status`: Production health, replica state, traffic distribution, and latency tracking.
  - `solarch service scale`: Compute scaling (min/max replicas).
  - `solarch service traffic`: Zero-downtime canary traffic shifting (0-100%).
  - `solarch service maintenance`: Scheduled maintenance mode toggle with custom public notices.
  - Automated anomaly-driven recovery engine with rollback loop circuit breaking.
- **Phase 10: MCP Integration & External Agent Tooling Layer (`solarch mcp`)**:
  - Dedicated capability provider exposing 18 typed Solarch tools across Project, Database, Deployment, Service, and Telemetry.
  - Multi-tier risk governance (`read`, `local_mutation`, `production_mutation`, `destructive`) with structured human approval challenges.
  - Append-only `.solarch/audit/mcp-tool-calls.jsonl` audit logging with pre-persistence secret redaction.
  - CLI management commands: `solarch mcp tools`, `solarch mcp inspect`, `solarch mcp permissions`, `solarch mcp audit`, `solarch mcp serve`.
- **Developer Error System (`src/errors/`)**:
  - Centralized `SolarchError` class providing actionable suggestions, doc links, and machine-readable error codes (`SOLARCH_AUTH_REQUIRED`, `SOLARCH_CONFIG_CONFLICT`, `SOLARCH_MCP_APPROVAL_REQUIRED`, etc.).

### Changed & Corrected
- **Canonical SDK Naming**: Aligned all ecosystem catalog resolution to real published packages (`solarch-web`, `solarch-rn`, `solarch-electron`, `solarch-tauri`, `solarch-ai`).
- **Decoupled CLI from Application AI**: Removed `solarch-ai` requirement from CLI core, establishing it exclusively as an end-user developer SDK.
- **External MCP Server Boundary**: Positioned `@solarch/mcp-server` as the external bridge for Claude Code, Cursor, and IDE assistants, rather than embedding an internal reasoning agent.

### Breaking Changes & Removals
- **Removed internal agent commands**: Deprecated `solarch agent plan`, `solarch agent run`, `solarch agent diagnose`, `solarch agent memory` in favor of external agent integration via `solarch mcp`.

---

### Added
- **Starter Template System (`solarch init` / `solarch template`)**:
  - 5 decoupled starter architectures: `minimal`, `api`, `realtime`, `saas`, `ai`.
  - Configuration presets: `development`, `production`, `testing`.
  - Scaffolding preview mode via `--dry-run`.
  - Template catalog exploration commands: `solarch template list` and `solarch template info <name>`.
  - Interactive `@clack/prompts` wizard with live intent picker and review confirmation.
- **Interactive Development Server (`solarch dev`)**:
  - Primary local development runner with filesystem watching for config, migrations, and hooks.
  - Zero-downtime hot reloading and pre-flight doctor diagnostics.
  - Interactive runtime hotkeys (<kbd>r</kbd> reload, <kbd>d</kbd> doctor, <kbd>c</kbd> clear, <kbd>q</kbd> quit).
- **Code & Schema Resource Generators (`solarch generate`)**:
  - `solarch generate collection <name>`: Scaffolds database collection schema migrations.
  - `solarch generate migration <name>`: Scaffolds raw schema migration scripts.
  - `solarch generate hook <name>`: Scaffolds application lifecycle hooks in `src/hooks/`.
- **Developer Observability & Tools**:
  - `solarch logs`: Application log streaming, tailing (`--tail`), level filtering (`--level`), and JSON output.
  - `solarch routes`: Complete catalog inspection of REST API endpoints and realtime subscriptions.
- **Environment & Configuration Management (`solarch env`, `solarch config`)**:
  - `solarch env check`: Validates critical environment variables, missing secrets, and insecure defaults.
  - `solarch env generate`: Generates `.env` files with 256-bit cryptographic entropy.
  - `solarch env show`: Displays active environment variables with automated secret masking.
  - `solarch config show`: Displays effective resolved configuration.
  - `solarch config validate`: Validates schema invariants before starting servers.
  - `solarch config set <key> <value>`: Safely updates TypeScript configuration files.
- **Diagnostics, Inspection & Project Lifecycle (`solarch doctor`, `solarch status`, `solarch inspect`, `solarch project`)**:
  - `solarch doctor` (`solarch check`): Fast non-destructive health diagnostics across runtime, config, database, migrations, and superuser accounts.
  - `solarch status`: Live status metrics on database engines, table counts, record counts, and storage.
  - `solarch inspect`: Deep inspection for project structure, database drivers, active features, and package dependencies.
  - `solarch project`: Project lifecycle tools (`project path`, `project clean`, `project reset`).
- **Centralized CLI Context Resolver (`src/cli/context.ts`)**:
  - Hierarchical option resolution preventing Commander root/subcommand collisions across `--dir`, `--db`, `--db-url`, `--port`, and `--dev`.
- **Unified CLI Design System & UX Consolidation**:
  - Grouped help formatting categorized by functional area (`PROJECT`, `DEVELOPMENT`, `CONFIGURATION`, `DATABASE`, `INSPECTION`, `ACCOUNT`).
  - Interactive launcher when invoked without arguments in TTY environments.
  - Levenshtein-distance typo suggestions for unrecognized commands.
  - Standardized ANSI theme, progress spinners, status badges, and sanitized error boundaries.
  - Command aliases: `solarch create` (`init`), `solarch check` (`doctor`), `solarch about` (`info`), `solarch ls` (`inspect`).
  - Detailed environment and platform version reporting via `solarch version`.

### Improved
- **Project Scaffolding**: Idempotent file generation with path containment safety checks and collision warnings.
- **Doctor Diagnostic Engine**: Added explicit checks for SQLite WAL mode, PostgreSQL connection handshakes, and migration state.
- **Configuration Resolution**: Automatic merging of TypeScript/JavaScript config files with environment variables and CLI overrides.

### Fixed
- **CLI Option Shadowing (`--dir`)**: Fixed an issue where Commander.js routed `--dir` to the root program default (`./pb_data`), causing `solarch init --dir <path>` and other subcommands to ignore external directory arguments.

### Breaking Changes & Removals
- **Removed `torque/` directory** — The Torque visual workflow editor (Next.js app with Clerk auth, reactflow, zustand) has been fully removed from the monorepo. It was a separate product with zero shared code, its own dependency tree, and a leaked Clerk secret key in `.env.local`.
- **Removed `/api/agents/*` endpoints** — All agent/workflow REST API routes have been removed.
- **Removed `src/agent/` module** — `node-registry.ts`, `workflow-engine.ts`, `types.ts` deleted.
- **Removed `_agentWorkflows` and `_agentExecutions` database tables** from schema initialization.

---

## v0.19.1 (2026-08-17)

### Added
- Superuser CLI commands (`solarch superuser`, `solarch superuser-create`).
- Database migration commands (`solarch migrate up`, `solarch migrate down`, `solarch migrate status`, `solarch migrate create`).
- Core client `@solarch/core-client` package with isomorphic TypeScript SDK.

### Fixed
- Fixed SQLite WAL mode connection pooling under concurrent write loads.
