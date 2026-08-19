# Changelog

## v0.19.5 — Solarch CLI Developer Platform & Workflow Suite (2026-08-19)

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
