Listed directory solarch
Listed directory packages
Listed directory core-client
Listed directory src
Listed directory admin
Listed directory src
Viewed package.json:1-45
Listed directory lib
Viewed solarch.ts:1-13
Viewed admin-api.ts:1-153
Listed directory src
Viewed cli.ts:1-100
Listed directory cmd
Viewed solarch.ts:1-167
Listed directory apis
Viewed serve.ts:1-100
Viewed serve.ts:101-160
Viewed copy-admin.js:1-44
Listed directory core
Viewed base.ts:1-80
Listed directory tools
Listed directory utils
Listed directory docs
Listed directory docs-verified
Listed directory hardening
Listed directory workflows
Viewed package.json:30-60

# Structured Repository Inventory & Architecture Audit

This inventory represents the verified, current state of the Solarch codebase prior to the separation of the Admin Dashboard and the CLI development.

---

## 1. Repository Root Structure

```text
/Users/jay/Downloads/solarch/
├── admin/                         # Existing Admin Dashboard (React 18 + Vite + Tailwind 4)
├── docs/                          # Architecture specs, design tokens, hardening contracts
├── docs-verified/                 # Verified feature documentation
├── evals/                         # 8 evaluation suites (security, query, realtime, db, compatibility)
├── packages/
│   └── core-client/               # @solarch/core-client (universal TypeScript SDK)
├── pb_data/                       # Local runtime data directory (SQLite databases)
├── pb_migrations/                 # JS-based database migration scripts
├── pb_public/                     # Static file serving directory (contains pb_public/admin)
├── scripts/                       # Build/copy/postinstall utilities
├── src/                           # Backend server application & core engine
├── .github/workflows/             # CI/CD pipelines (discovery, screening, codeql, publish)
├── Dockerfile & docker-compose    # Container deployment definitions
├── package.json                   # Root package manifest & npm workspaces config
└── tsconfig.json & vitest.config  # Root TypeScript and Vitest configs
```

---

## 2. Monorepo & Workspaces Configuration

- **Workspace Manager**: npm workspaces declared in root [`package.json`](file:///Users/jay/Downloads/solarch/package.json):
  ```json
  "workspaces": [
    "packages/*",
    "admin"
  ]
  ```
- **Declared Workspaces**:
  1. `admin` (`solarch-admin` v0.4.2)
  2. `packages/core-client` (`@solarch/core-client` v0.1.0)
- **Root Package**: `solarch` v0.18.1 (`backend` workspace).

---

## 3. Server Application Locations

| Component | Path | Description |
| :--- | :--- | :--- |
| **Server Facade** | [`src/solarch.ts`](file:///Users/jay/Downloads/solarch/src/solarch.ts) | `Solarch` class extending `BaseApp`. Orchestrates bootstrap, migrations, JSVM hooks, and HTTP/WS server lifecycle. |
| **Core Framework** | [`src/core/base.ts`](file:///Users/jay/Downloads/solarch/src/core/base.ts) | `BaseApp` core engine managing event hooks, collections, records, database instances, settings, and encryption. |
| **Core Models & Logic** | [`src/core/`](file:///Users/jay/Downloads/solarch/src/core) | `collection.ts`, `record.ts`, `field.ts`, `record_query.ts`, `record_upsert.ts`, `schema_sync.ts`, `migration.ts`, `auth_queries.ts`. |
| **HTTP & WS Router** | [`src/apis/serve.ts`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts) | Express server setup, security middleware (Helmet, CSP, CORS, Rate Limit, Auth), and route registration. |
| **API Endpoints** | [`src/apis/`](file:///Users/jay/Downloads/solarch/src/apis) | 22 API route modules (`record_crud.ts`, `record_auth.ts`, `collection.ts`, `settings.ts`, `realtime.ts`, `file.ts`, `backup.ts`, `logs.ts`, `installer.ts`, `ai.ts`, `admin_auth.ts`, `metrics.ts`, `batch.ts`, `cron.ts`, `health.ts`). |
| **Database Drivers** | [`src/tools/database/`](file:///Users/jay/Downloads/solarch/src/tools/database) | Database drivers for SQLite (`sqlite/`), PostgreSQL (`postgres/`), MongoDB (`mongodb/`), and Cloudflare D1 (`d1/`). |
| **Realtime Pub/Sub** | [`src/tools/subscriptions/`](file:///Users/jay/Downloads/solarch/src/tools/subscriptions) | `provider.ts` (`RealtimeProvider`, `InMemoryRealtimeProvider`) and `broker.ts` (`Broker`, `Client`). |
| **Query Engine** | [`src/tools/search/`](file:///Users/jay/Downloads/solarch/src/tools/search) | Formal lexer + recursive-descent parser (`filter.ts`) and SQLite query compiler (`query-builder.ts`). |
| **Security & Utilities** | [`src/tools/security/`](file:///Users/jay/Downloads/solarch/src/tools/security), [`src/utils/`](file:///Users/jay/Downloads/solarch/src/utils) | Argon2id password hashing, JWT signing/verification, identifier validation (`sql_safe.ts`), pagination, and rate limiting. |

---

## 4. Existing Admin Dashboard Locations

| Location | Path | Description |
| :--- | :--- | :--- |
| **Source Directory** | [`admin/src/`](file:///Users/jay/Downloads/solarch/admin/src) | Complete React 18 SPA built with Vite, Tailwind CSS 4, shadcn/ui, Lucide icons, and React Router. |
| **Client Instance** | [`admin/src/lib/solarch.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/solarch.ts) | Instantiates `SolarchClient` from `@solarch/core-client` with `LocalAuthStore('solarch_admin_auth')`. |
| **Admin API Layer** | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | Admin operations (`installer`, `metrics`, `settings`, `ai`, `logs`, `backups`) layered directly on `solarch.http`. |
| **UI Components** | [`admin/src/components/`](file:///Users/jay/Downloads/solarch/admin/src/components) | UI layout, navigation shell, data tables, dialogs, form controls, and theme providers. |
| **Page Views** | [`admin/src/pages/`](file:///Users/jay/Downloads/solarch/admin/src/pages) | Dashboard, Collections, Records, Auth, Logs, Backups, Settings, AI Playground, and Installer views. |
| **Build Manifest** | [`admin/package.json`](file:///Users/jay/Downloads/solarch/admin/package.json) | Package manifest for `solarch-admin` depending on `@solarch/core-client: ^0.1.0`. |
| **Vite Config** | [`admin/vite.config.ts`](file:///Users/jay/Downloads/solarch/admin/vite.config.ts) | Vite bundling configuration targeting `admin/dist/`. |
| **Server Static Mount** | [`src/apis/serve.ts:102-145`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts#L102-L145) | Serves `pb_public/admin/` at path `/_/` (with fallback static HTML installer if unbuilt). |
| **Build Copy Script** | [`scripts/copy-admin.js`](file:///Users/jay/Downloads/solarch/scripts/copy-admin.js) | Copies `admin/dist/` into `pb_public/admin/` during root `npm run build`. |

---

## 5. Existing CLI Locations

| Location | Path | Description |
| :--- | :--- | :--- |
| **CLI Entrypoint** | [`src/cli.ts`](file:///Users/jay/Downloads/solarch/src/cli.ts) | Commander-based CLI binary (`dist/cli.js`). Exposes `serve`, `superuser`, `superuser-create`, `migrate`, `backup`, `restore`. |
| **Package Bin Link** | [`package.json:11-13`](file:///Users/jay/Downloads/solarch/package.json#L11-L13) | `"bin": { "solarch": "dist/cli.js" }`. |
| **CLI Commands** | [`src/cmd/superuser.ts`](file:///Users/jay/Downloads/solarch/src/cmd/superuser.ts) | Superuser creation helper invoked by `solarch superuser` command. |

---

## 6. `@solarch/core-client` Locations

| Component | Path | Description |
| :--- | :--- | :--- |
| **Package Root** | [`packages/core-client/`](file:///Users/jay/Downloads/solarch/packages/core-client) | Universal, platform-neutral TypeScript client SDK. |
| **Main Client** | [`packages/core-client/src/Client.ts`](file:///Users/jay/Downloads/solarch/packages/core-client/src/Client.ts) | `SolarchClient` facade providing `records`, `collections`, `auth`, `files`, `realtime`, `admins`, `capabilities`, `http`. |
| **Services** | [`packages/core-client/src/services/`](file:///Users/jay/Downloads/solarch/packages/core-client/src/services) | `RecordService`, `CollectionService`, `AdminService`, `FileService`, `CapabilityService`. |
| **HTTP Transport** | [`packages/core-client/src/http/`](file:///Users/jay/Downloads/solarch/packages/core-client/src/http) | Universal `fetch` wrapper with retry, exponential backoff, serialization, and error deserialization. |
| **Realtime Client** | [`packages/core-client/src/realtime/`](file:///Users/jay/Downloads/solarch/packages/core-client/src/realtime) | WebSocket & SSE transports with auto-reconnect, subscription manager, and offline event queue. |
| **Auth Stores** | [`packages/core-client/src/stores/`](file:///Users/jay/Downloads/solarch/packages/core-client/src/stores) | `BaseAuthStore`, `MemoryAuthStore`, `LocalAuthStore` (browser `localStorage`), `AsyncAuthStore`. |
| **Test Suites** | [`packages/core-client/tests/`](file:///Users/jay/Downloads/solarch/packages/core-client/tests) | 205 tests covering unit, stores, http, integration, conformance, security, and E2E. |

---

## 7. Shared Packages & Utilities

- **Internal Utilities**: [`src/utils/`](file:///Users/jay/Downloads/solarch/src/utils) (`sql_safe.ts`, `api_errors.ts`, `lockout.ts`, `pagination.ts`, `secret_mask.ts`).
- **Core Event / Hook Types**: [`src/core/events.ts`](file:///Users/jay/Downloads/solarch/src/core/events.ts), [`src/tools/hook/hook.ts`](file:///Users/jay/Downloads/solarch/src/tools/hook/hook.ts).
- **Core Models**: [`src/core/model.ts`](file:///Users/jay/Downloads/solarch/src/core/model.ts), [`src/core/record.ts`](file:///Users/jay/Downloads/solarch/src/core/record.ts), [`src/core/collection.ts`](file:///Users/jay/Downloads/solarch/src/core/collection.ts).

---

## 8. Configuration Files

- **Root TypeScript**: [`tsconfig.json`](file:///Users/jay/Downloads/solarch/tsconfig.json) (targets ES2022, module NodeNext).
- **Root Vitest**: [`vitest.config.ts`](file:///Users/jay/Downloads/solarch/vitest.config.ts) (Vitest 4 configuration).
- **ESLint**: [`.eslintrc.json`](file:///Users/jay/Downloads/solarch/.eslintrc.json).
- **Admin TypeScript**: [`admin/tsconfig.json`](file:///Users/jay/Downloads/solarch/admin/tsconfig.json), [`admin/tsconfig.node.json`](file:///Users/jay/Downloads/solarch/admin/tsconfig.node.json).
- **Admin Vite**: [`admin/vite.config.ts`](file:///Users/jay/Downloads/solarch/admin/vite.config.ts).
- **Core-Client TypeScript**: [`packages/core-client/tsconfig.json`](file:///Users/jay/Downloads/solarch/packages/core-client/tsconfig.json).
- **Core-Client Bundler**: [`packages/core-client/tsup.config.ts`](file:///Users/jay/Downloads/solarch/packages/core-client/tsup.config.ts) (generates CJS, ESM, and `.d.ts`).
- **Core-Client Vitest**: [`packages/core-client/vitest.config.ts`](file:///Users/jay/Downloads/solarch/packages/core-client/vitest.config.ts).

---

## 9. Package Manifests & Scripts

### Root `package.json`
- `build`: Builds `@solarch/core-client`, compiles server `tsc`, copies deno worker, and executes `build:ui`.
- `build:ui`: Runs `cd admin && npm install && npm run build && cd .. && node scripts/copy-admin.js`.
- `dev`: `tsx watch src/cli.ts serve --dev`.
- `test`: `vitest run`.
- `typecheck`: `tsc --noEmit`.
- `lint`: `eslint src --ext .ts`.

### `admin/package.json`
- `dev`: `vite`.
- `build`: `tsc && vite build`.
- `preview`: `vite preview`.

### `packages/core-client/package.json`
- `build`: `tsup`.
- `test`: `vitest run`.
- `test:unit`: `vitest run tests/utils tests/stores tests/unit tests/security`.
- `test:integration`: `vitest run tests/http tests/integration`.
- `test:e2e`: `vitest run tests/e2e`.

---

## 10. Existing CI/CD Workflows

Located in [`.github/workflows/`](file:///Users/jay/Downloads/solarch/.github/workflows):
1. **`ci.yml`**: Main CI pipeline triggered on PRs/pushes to `main` and `develop`. Dynamically discovers packages (`generic` vs `sdk`).
2. **`_package-screen.yml`**: 3-layer generic package screen (lint, build, test & coverage, security audit).
3. **`_sdk-screen.yml`**: 5-layer SDK screen (`Function`, `Feature`, `Contract`, `Service / E2E`, `Distribution`).
4. **`publish.yml`**: Automated publish workflow triggered on `v*` tags (publishes to npm, GitHub Packages, and creates GitHub Release).
5. **`codeql.yml`**, **`secret-scan.yml`**, **`dependency-review.yml`**: Security, vulnerability, and secret leak scanning.

---

## 11. Existing Tests & Verification Suites

- **Backend & Server Unit/Integration Tests**: [`src/**/__tests__/`](file:///Users/jay/Downloads/solarch/src) (640+ tests across auth, realtime, SQL injection, backup, AI, collections, records).
- **Evaluation Suites**: [`evals/`](file:///Users/jay/Downloads/solarch/evals) (65 tests across 8 suites: security invariants, query in-list, relational/sort, differential queries, D1 adapter, realtime provider, platform security, cross-version compatibility).
- **Core-Client Test Suites**: [`packages/core-client/tests/`](file:///Users/jay/Downloads/solarch/packages/core-client/tests) (205 tests across unit, integration, E2E, and contract conformance).

---

## Summary & Candidate Separation Analysis

### 1. Repository Architecture Summary
The repository is currently structured as an npm monorepo containing:
- The core backend server and engine in `src/`.
- An embedded React Admin SPA in `admin/` that is built and copied into `pb_public/admin/` to be served by the backend at `/_/`.
- A standalone universal client SDK in `packages/core-client/` that both external consumers and the Admin SPA depend on.
- A built-in CLI entrypoint in `src/cli.ts` that acts as the current server starter and management command.

### 2. Admin Candidate Locations
- Source directory: `admin/`
- Build destination: `admin/dist/`
- Copied destination in server: `pb_public/admin/`
- Server mounting code: `src/apis/serve.ts` (lines 102–145)
- Server build hook: `scripts/copy-admin.js` and `npm run build:ui` script in root `package.json`

### 3. CLI Candidate Locations
- Current CLI binary: `src/cli.ts` (compiled to `dist/cli.js`)
- Subcommands & helpers: `src/cmd/superuser.ts`
- Binary declaration: `"bin": { "solarch": "dist/cli.js" }` in root `package.json`
- Future separate CLI package candidate: `packages/cli/` (to be created during CLI development phase)

### 4. Core Client Locations
- Package root: `packages/core-client/`
- Consumed by: `admin/src/lib/solarch.ts` via `@solarch/core-client`
- Public contract surface: `SolarchClient`, `RecordService`, `CollectionService`, `AdminService`, `FileService`, `CapabilityService`, `RealtimeService`, `LocalAuthStore`, `MemoryAuthStore`, `AsyncAuthStore`, `client.http`

### 5. Server Locations
- Entrypoints: `src/index.ts`, `src/solarch.ts`, `src/cli.ts`
- Core engine: `src/core/`
- API layer: `src/apis/`
- Driver & Tooling subsystems: `src/tools/`
- Utilities: `src/utils/`

### 6. Shared-Code Locations
- `src/utils/sql_safe.ts` (used by server core, database drivers, and query builders)
- `src/core/collection.ts`, `src/core/record.ts`, `src/core/field.ts` (data models)
- `src/tools/subscriptions/provider.ts` & `src/tools/subscriptions/broker.ts` (realtime pub/sub contracts)

### 7. Potential Migration Risks
- **Tight coupling of Admin UI build in root `package.json`**: Root `npm run build` currently triggers `cd admin && npm install && npm run build && cd .. && node scripts/copy-admin.js`. Separating Admin requires decoupling the server build so the server can build and run independently.
- **Static file serving at `/_/`**: If `pb_public/admin` is absent in standalone server mode, `src/apis/serve.ts` already has a fallback HTML installer, but the routing boundary must be cleanly preserved.
- **Admin API Contract (`admin-api.ts`)**: `admin/src/lib/admin-api.ts` makes direct HTTP calls (`/api/settings`, `/api/ai/*`, `/api/logs`, `/api/backups/*`, `/api/metrics`, `/api/installer/*`) via `solarch.http`. Any separation must guarantee these endpoints remain stable on the server.
- **CLI Dependency on Server**: `src/cli.ts` imports `Solarch` from `./solarch` directly. When extracting a standalone CLI package, the relationship between the CLI and the server/client must be explicitly structured.

---

*(Inventory complete. Stopped and awaiting explicit instruction for boundary analysis.)*





Listed directory admin
Listed directory pages
Listed directory components
Listed directory ui
Listed directory layout
Listed directory navigation
Listed directory domain
Listed directory hooks
Listed directory types
Listed directory public
Searched for "import .* from ['"]\.\./\.\./"
Searched for "from ['"]@solarch/"
Searched for "core-client"
Viewed main.tsx:1-11
Viewed App.tsx:1-55
Viewed useAuth.ts:1-58
Listed directory admin
Searched for "describe|it|test"
Viewed vite.config.ts:1-33
Viewed components.json:1-26
Searched for "admin"

# Comprehensive Boundary Map of the Existing Admin Application

This analysis maps the exact boundary of the Admin Dashboard application, tracing all its files, routes, components, services, and external dependencies.

---

## 1. Trace of Admin Application Subsystems

### 1.1 Entrypoints & Routing
- **HTML Document Entrypoint**: [`admin/index.html`](file:///Users/jay/Downloads/solarch/admin/index.html) — Mounts `#root` and loads `/src/main.tsx`.
- **Application Bootstrap**: [`admin/src/main.tsx`](file:///Users/jay/Downloads/solarch/admin/src/main.tsx) — Mounts React `StrictMode` with `App`.
- **Router & Auth Gate**: [`admin/src/App.tsx`](file:///Users/jay/Downloads/solarch/admin/src/App.tsx) — Sets `basename="/_/"`, evaluates `useAuth()`, renders `Login` or `Layout` with active page routes.

### 1.2 Routes & Page Components
- `/_/` (Dashboard Overview): [`admin/src/pages/Dashboard.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Dashboard.tsx)
- `/_/collections` (Collection List & Creation): [`admin/src/pages/Collections.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Collections.tsx)
- `/_/collections/:id` (Schema & Rule Editor): [`admin/src/pages/CollectionDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/CollectionDetail.tsx)
- `/_/records/:collectionId` (Data Table & Search): [`admin/src/pages/Records.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Records.tsx)
- `/_/records/:collectionId/:recordId` (Record Form): [`admin/src/pages/RecordDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/RecordDetail.tsx)
- `/_/settings` (App, Mail, S3, Backup Settings): [`admin/src/pages/Settings.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Settings.tsx)
- `/_/logs` (Activity & Request Logs): [`admin/src/pages/Logs.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Logs.tsx)
- `/_/backups` (Database Backups & Restore): [`admin/src/pages/Backups.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Backups.tsx)
- `/_/ai` (AI Assistant & Rule Generator): [`admin/src/pages/AIAssistant.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/AIAssistant.tsx)
- Unauthenticated Gate: [`admin/src/pages/Login.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Login.tsx)

### 1.3 UI & Navigation Components
- **Shell & Navigation**: [`admin/src/components/Layout.tsx`](file:///Users/jay/Downloads/solarch/admin/src/components/Layout.tsx), [`admin/src/components/layout/PageContainer.tsx`](file:///Users/jay/Downloads/solarch/admin/src/components/layout/PageContainer.tsx), [`admin/src/components/navigation/PageHeader.tsx`](file:///Users/jay/Downloads/solarch/admin/src/components/navigation/PageHeader.tsx)
- **Brand & Domain**: [`admin/src/components/SolarchLogo.tsx`](file:///Users/jay/Downloads/solarch/admin/src/components/SolarchLogo.tsx), [`admin/src/components/domain/StatCard.tsx`](file:///Users/jay/Downloads/solarch/admin/src/components/domain/StatCard.tsx)
- **UI Primitives (34 files in `admin/src/components/ui/`)**: `button.tsx`, `input.tsx`, `dialog.tsx`, `table.tsx`, `sidebar.tsx`, `dropdown-menu.tsx`, `sonner.tsx`, `select.tsx`, `tabs.tsx`, `card.tsx`, `checkbox.tsx`, `command.tsx`, `switch.tsx`, `tooltip.tsx`, `scroll-area.tsx`, `sheet.tsx`, `skeleton.tsx`, `spinner.tsx`, `textarea.tsx`, `popover.tsx`, `label.tsx`, `badge.tsx`, `breadcrumb.tsx`, `alert-dialog.tsx`, `empty.tsx`, `input-group.tsx`, `separator.tsx`, `Toast.tsx`, `Panel.tsx`, `IconButton.tsx`, `Divider.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `index.ts`.

### 1.4 Services & Client Integration Layer
- **Client Instance**: [`admin/src/lib/solarch.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/solarch.ts) — Instantiates `SolarchClient('', { authStore: new LocalAuthStore('solarch_admin_auth') })`.
- **Admin Specific API**: [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) — Typed functions for `/api/installer/*`, `/api/metrics`, `/api/settings`, `/api/ai/*`, `/api/logs`, `/api/backups/*`.
- **Class Merging**: [`admin/src/lib/utils.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/utils.ts) — Standard `cn()` utility (`clsx` + `tailwind-merge`).

### 1.5 State & Authentication
- **Hook**: [`admin/src/hooks/useAuth.ts`](file:///Users/jay/Downloads/solarch/admin/src/hooks/useAuth.ts) — Subscribes to `solarch.authStore.subscribe()` for reactive auth synchronization across tabs and component renders.
- **Mobile Responsive Hook**: [`admin/src/hooks/use-mobile.ts`](file:///Users/jay/Downloads/solarch/admin/src/hooks/use-mobile.ts) — Screen size listener for sidebar auto-collapse.

### 1.6 Styling & Design Assets
- **Styles**: [`admin/src/index.css`](file:///Users/jay/Downloads/solarch/admin/src/index.css) — Tailwind CSS 4 engine + CSS custom properties (dark theme).
- **Public Assets**: [`admin/public/solarch-logo.svg`](file:///Users/jay/Downloads/solarch/admin/public/solarch-logo.svg).
- **Documentation**: [`admin/DESIGN.md`](file:///Users/jay/Downloads/solarch/admin/DESIGN.md), [`admin/admin_api_inventory.md`](file:///Users/jay/Downloads/solarch/admin/admin_api_inventory.md).

### 1.7 Build Tooling & Environment
- **Vite Config**: [`admin/vite.config.ts`](file:///Users/jay/Downloads/solarch/admin/vite.config.ts) — Builds to `admin/dist`, sets base to `/_/`, proxies `/api` to `http://localhost:8090`.
- **Shadcn Manifest**: [`admin/components.json`](file:///Users/jay/Downloads/solarch/admin/components.json).
- **TypeScript**: [`admin/tsconfig.json`](file:///Users/jay/Downloads/solarch/admin/tsconfig.json), [`admin/tsconfig.node.json`](file:///Users/jay/Downloads/solarch/admin/tsconfig.node.json).
- **Package Manifest**: [`admin/package.json`](file:///Users/jay/Downloads/solarch/admin/package.json).

---

## 2. Cross-Boundary Dependency Verification

- **Imports from Backend (`src/`)**: **0 (None)**. There are zero imports from `src/core`, `src/apis`, `src/tools`, or `src/utils` inside `admin/`.
- **Imports from `@solarch/core-client`**: Exactly 2 files:
  1. [`admin/src/lib/solarch.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/solarch.ts) imports `SolarchClient` and `LocalAuthStore`.
  2. [`admin/src/hooks/useAuth.ts`](file:///Users/jay/Downloads/solarch/admin/src/hooks/useAuth.ts) imports types `AdminModel` and `AuthModel`.
- **Build Coupling with Server**:
  - Root `package.json` has `build:ui: "cd admin && npm install && npm run build && cd .. && node scripts/copy-admin.js"`.
  - `scripts/copy-admin.js` copies `admin/dist` into `pb_public/admin/`.
  - Server in [`src/apis/serve.ts:102-145`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts#L102-L145) serves `pb_public/admin/` at path `/_/`.

---

## 3. Explicit File & Directory Boundary Classification

### Category A: Safe to Move with Dashboard (Admin-Owned)
All of the following files belong exclusively to the Admin Dashboard application:

```text
admin/
├── DESIGN.md
├── admin_api_inventory.md
├── components.json
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   └── solarch-logo.svg
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── components/
    │   ├── Layout.tsx
    │   ├── SolarchLogo.tsx
    │   ├── domain/
    │   │   └── StatCard.tsx
    │   ├── layout/
    │   │   └── PageContainer.tsx
    │   ├── navigation/
    │   │   └── PageHeader.tsx
    │   └── ui/ (all 34 files)
    ├── hooks/
    │   ├── use-mobile.ts
    │   └── useAuth.ts
    ├── lib/
    │   ├── admin-api.ts
    │   ├── solarch.ts
    │   └── utils.ts
    ├── pages/
    │   ├── AIAssistant.tsx
    │   ├── Backups.tsx
    │   ├── CollectionDetail.tsx
    │   ├── Collections.tsx
    │   ├── Dashboard.tsx
    │   ├── Login.tsx
    │   ├── Logs.tsx
    │   ├── RecordDetail.tsx
    │   ├── Records.tsx
    │   └── Settings.tsx
    └── types/
```

### Category B: Shared and Must Remain Outside Dashboard
These documents describe shared contracts and design guidelines:
- [`docs/admin-design-system.md`](file:///Users/jay/Downloads/solarch/docs/admin-design-system.md)
- [`docs/design-system-spec.md`](file:///Users/jay/Downloads/solarch/docs/design-system-spec.md)
- [`docs/admin-ui-audit.md`](file:///Users/jay/Downloads/solarch/docs/admin-ui-audit.md)

### Category C: Server-Owned and Must Remain Outside Dashboard
These server files interface with the Admin Dashboard via HTTP/static serving but belong to the server:
- [`src/apis/serve.ts`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts) (handles static serving of `/_/` and fallback HTML)
- [`src/apis/admin_auth.ts`](file:///Users/jay/Downloads/solarch/src/apis/admin_auth.ts) (server admin authentication endpoints)
- [`src/apis/installer.ts`](file:///Users/jay/Downloads/solarch/src/apis/installer.ts) (server installation status & initial admin creation)
- [`src/apis/settings.ts`](file:///Users/jay/Downloads/solarch/src/apis/settings.ts) (system settings endpoints)
- [`src/apis/ai.ts`](file:///Users/jay/Downloads/solarch/src/apis/ai.ts) (AI assistant server handler)
- [`src/apis/logs.ts`](file:///Users/jay/Downloads/solarch/src/apis/logs.ts) (system logging endpoints)
- [`src/apis/backup.ts`](file:///Users/jay/Downloads/solarch/src/apis/backup.ts) (backup/restore server endpoints)
- [`src/apis/metrics.ts`](file:///Users/jay/Downloads/solarch/src/apis/metrics.ts) (dashboard metrics endpoints)
- [`scripts/copy-admin.js`](file:///Users/jay/Downloads/solarch/scripts/copy-admin.js) (server build utility)
- [`pb_public/admin/`](file:///Users/jay/Downloads/solarch/pb_public) (server distribution folder for static assets)

### Category D: Core Client-Owned and Must Remain Outside Dashboard
The universal TypeScript SDK consumed by Admin:
- [`packages/core-client/`](file:///Users/jay/Downloads/solarch/packages/core-client) (entire workspace package, including `SolarchClient`, `LocalAuthStore`, `AdminService`, `RecordService`, `RealtimeService`, etc.)

### Category E: Unclear / Requires Dependency Investigation
- **None**. The boundary is 100% clean. The Admin Dashboard codebase contains zero direct couplings to server internals or private modules, communicating with the backend purely through `@solarch/core-client` and standard HTTP API endpoints.

---

*(Boundary analysis complete. Stopped and awaiting explicit instruction.)* 


Searched for "BaseApp"
Searched for "from ['"](fs|path|crypto|http|events|stream|child_process)"
Searched for "/api/"
Listed directory services
Viewed AdminService.ts:1-84

# Comprehensive Admin → Server Dependency Audit

This audit evaluates all direct and indirect dependencies, couplings, runtime assumptions, and build hooks between the Admin Dashboard (`admin/`) and the Server codebase (`src/`).

---

## 1. Audit Findings Across All Dimensions

### 1.1 Code & Import Inspection
- **Direct Server Imports**: **0 (Zero)**.
  - No imports of `BaseApp`, `DB`, server database drivers, `src/core/*`, `src/apis/*`, `src/tools/*`, or `src/utils/*`.
- **Node.js Built-in Modules**: **0 (Zero)**.
  - No imports of `fs`, `path`, `crypto`, `child_process`, `stream`, etc. in `admin/src`.
- **Path & Build Aliases**:
  - `admin/vite.config.ts` defines `@` -> `./src`. This alias is strictly internal to the `admin/` workspace and never references the server directory.

### 1.2 Database & Runtime Coupling
- **Direct Database Access**: **0 (None)**.
  - The Admin application has no direct access or connection to SQLite (`better-sqlite3`), Postgres (`pg`/`neon`), MongoDB, or Cloudflare D1. All data access is mediated through HTTP API requests.
- **Server Runtime / Lifecycle**: **0 (None)**.
  - The Admin application runs exclusively in the browser runtime (Vite + React SPA), subscribing to the server over standard HTTP/REST and WebSocket protocols.

### 1.3 Build, Workspace & Filesystem Coupling
- **Workspace Coupling**:
  - Root [`package.json`](file:///Users/jay/Downloads/solarch/package.json) includes `"admin"` in `"workspaces"`.
- **Build Hook Coupling**:
  - Root `package.json` script `build:ui` executes:
    `cd admin && npm install && npm run build && cd .. && node scripts/copy-admin.js`
  - Root `build` script chains `npm run build:ui` automatically after compiling server `tsc`.
- **Distribution Output Coupling**:
  - [`scripts/copy-admin.js`](file:///Users/jay/Downloads/solarch/scripts/copy-admin.js) copies `admin/dist` directly into the server's local public directory [`pb_public/admin/`](file:///Users/jay/Downloads/solarch/pb_public).
- **Static Asset Serving Coupling**:
  - [`src/apis/serve.ts:102-145`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts#L102-L145) serves `pb_public/admin/` at path `/_/` with a fallback HTML page if unbuilt.

### 1.4 API & Protocol Surface
The Admin Dashboard communicates with the Server through the following HTTP/WS contracts:

| Target Subsystem | Endpoint / Method | Current Caller in Admin | Mechanism |
| :--- | :--- | :--- | :--- |
| **Superuser Auth** | `POST /api/admins/auth-with-password`<br>`POST /api/admins/refresh`<br>`POST /api/admins/request-password-reset`<br>`POST /api/admins/confirm-password-reset` | [`admin/src/pages/Login.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Login.tsx) | Handled by `solarch.admins` via `@solarch/core-client` (`AdminService`) |
| **Collections** | `GET /api/collections`<br>`POST /api/collections`<br>`PATCH /api/collections/:id`<br>`DELETE /api/collections/:id` | [`admin/src/pages/Collections.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Collections.tsx)<br>[`admin/src/pages/CollectionDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/CollectionDetail.tsx) | Handled by `solarch.collections` via `@solarch/core-client` (`CollectionService`) |
| **Records & Auth Users**| `GET /api/collections/:col/records`<br>`POST /api/collections/:col/records`<br>`PATCH /api/collections/:col/records/:id`<br>`DELETE /api/collections/:col/records/:id` | [`admin/src/pages/Records.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Records.tsx)<br>[`admin/src/pages/RecordDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/RecordDetail.tsx) | Handled by `solarch.records(col)` via `@solarch/core-client` (`RecordService`) |
| **Files** | `GET /api/files/:col/:id/:filename` | [`admin/src/pages/RecordDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/RecordDetail.tsx) | Handled by `solarch.files.getURL()` via `@solarch/core-client` (`FileService`) |
| **Realtime** | `GET /api/realtime` (SSE) / `ws://.../api/realtime` (WS) | [`admin/src/pages/Records.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Records.tsx) | Handled by `solarch.realtime.subscribe()` via `@solarch/core-client` (`RealtimeService`) |
| **System Settings** | `GET /api/settings`<br>`PATCH /api/settings`<br>`POST /api/settings/test/email`<br>`POST /api/settings/test/s3` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/Settings.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Settings.tsx) | Direct HTTP via `solarch.http` in `adminApi.settings` |
| **Database Backups** | `GET /api/backups`<br>`POST /api/backups`<br>`POST /api/backups/:key/restore`<br>`DELETE /api/backups/:key`<br>`POST /api/backups/upload` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/Backups.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Backups.tsx) | Direct HTTP via `solarch.http` in `adminApi.backups` |
| **System Logs** | `GET /api/logs` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/Logs.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Logs.tsx) | Direct HTTP via `solarch.http` in `adminApi.logs` |
| **Metrics** | `GET /api/metrics` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/Dashboard.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Dashboard.tsx) | Direct HTTP via `solarch.http` in `adminApi.metrics` |
| **AI Assistant** | `POST /api/ai/test`<br>`POST /api/ai/chat`<br>`POST /api/ai/generate-collection`<br>`POST /api/ai/generate-rule`<br>`POST /api/ai/seed` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/AIAssistant.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/AIAssistant.tsx) | Direct HTTP via `solarch.http` in `adminApi.ai` |
| **Installer** | `GET /api/installer/check`<br>`POST /api/installer` | [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts)<br>[`admin/src/pages/Login.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Login.tsx) | Direct HTTP via `solarch.http` in `adminApi.installer` |

---

## 2. Detailed Dependency Inventory Table

| Admin File | Server File / Subsystem | Dependency Type | Why It Exists | Can It Be Removed? | Replace With `@solarch/core-client`? | Migration Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`package.json`](file:///Users/jay/Downloads/solarch/package.json) (root) | `admin/` | Workspace declaration | Declares `admin` as an npm workspace | Yes, if moved to separate repository | N/A | Low |
| [`package.json`](file:///Users/jay/Downloads/solarch/package.json) (root) | `scripts/copy-admin.js` | Build script coupling | Bundles UI during server build | Yes | N/A | Low |
| [`scripts/copy-admin.js`](file:///Users/jay/Downloads/solarch/scripts/copy-admin.js) | `pb_public/admin/` | Build output destination | Distributes static SPA files into server's directory | Yes | Can be published separately or embedded on release | Low |
| [`src/apis/serve.ts`](file:///Users/jay/Downloads/solarch/src/apis/serve.ts) | `pb_public/admin/` | Static route mount (`/_/`) | Serves SPA from backend port 8090 | Kept or made configurable | N/A | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/settings.ts` | HTTP API `/api/settings` | Fetches/updates server settings | No (Required) | Yes (can be added to `AdminService` or `SettingsService` in SDK) | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/backup.ts` | HTTP API `/api/backups` | Manages server database backups | No (Required) | Yes (can be added to `BackupService` in SDK) | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/logs.ts` | HTTP API `/api/logs` | Fetches request/system logs | No (Required) | Yes (can be added to `LogService` in SDK) | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/metrics.ts` | HTTP API `/api/metrics` | Fetches counts of collections/records | No (Required) | Yes (can be added to `MetricService` in SDK) | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/ai.ts` | HTTP API `/api/ai/*` | AI chat & schema generation | No (Required) | Yes (can be added to `AIService` in SDK) | Low |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `src/apis/installer.ts` | HTTP API `/api/installer/*` | Checks/installs first admin | No (Required) | Yes (can be added to `InstallerService` in SDK) | Low |
| [`admin/vite.config.ts`](file:///Users/jay/Downloads/solarch/admin/vite.config.ts) | Backend port 8090 | Dev server reverse proxy | Forwards `/api` requests to backend in dev | No (Required for local dev) | N/A (Vite proxy config) | Low |

---

## 3. Dependency Classification

### 1. Must Eliminate
- **Root `build:ui` coupling in server build**:
  - The server should compile cleanly via `tsc` without requiring a full React build and file-copy pipeline in standalone server mode.
- **`scripts/copy-admin.js` as a mandatory server build step**:
  - Should only run when building an all-in-one distribution bundle, rather than being hardcoded into the standard server development/build script.

### 2. Must Replace Through Core Client (`@solarch/core-client`)
- **System Administration Endpoints (`admin/src/lib/admin-api.ts`)**:
  - Currently, `admin-api.ts` makes direct HTTP calls via `solarch.http`.
  - These should eventually be formalized as first-class typed services on `SolarchClient` (e.g., `client.settings`, `client.backups`, `client.logs`, `client.metrics`, `client.ai`, `client.installer`), promoting `@solarch/core-client` to the single source of truth for both public and admin protocol operations.

### 3. Legitimate Shared Dependencies
- **`@solarch/core-client`**:
  - The universal TypeScript SDK is the sole intended dependency connecting the Admin Dashboard to the Solarch backend.
- **Solarch HTTP & WebSocket Protocol**:
  - The standard REST API format (`/api/*`), JSON response contracts, and WebSocket event format (`/api/realtime`).

### 4. Requires Architectural Decision
- **Hosting / Distribution Strategy for Admin Dashboard**:
  - *Option A (Embedded)*: Admin Dashboard remains in monorepo or is published to npm / CDN and pulled/bundled into `pb_public/admin` on release.
  - *Option B (Standalone App)*: Admin Dashboard lives in a dedicated repository/workspace (`packages/admin` or `xvertere-org/solarch-admin`), deployed to Vercel/Cloudflare Pages/static hosting, connecting to any remote or local Solarch backend via configurable `SolarchClient` base URL.
  - *Option C (Hybrid)*: Standalone SPA package that can be hosted anywhere, plus an optional embedding script for single-binary/all-in-one deployments.

---

*(Audit complete. Stopped and awaiting explicit instruction.)*


Searched for "solarch\."
Searched for "solarch"
Searched for "realtime"
Searched for "subscribe"
Searched for "(fetch\(|axios|XMLHttpRequest|new WebSocket)"

# Comprehensive Audit: Admin Dashboard → `@solarch/core-client`

This audit verifies how the Admin Dashboard interacts with `@solarch/core-client`, checking all imports, services, auth flows, queries, and missing capabilities.

---

## 1. Core Client Dependency Map

| Admin File | Core Client Module / API | Operation Performed | Auth Required? | Canonical Boundary? | Safe to Preserve Post-Migration? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`admin/src/lib/solarch.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/solarch.ts) | `SolarchClient`, `LocalAuthStore` | Client instantiation with localStorage token persistence (`'solarch_admin_auth'`) | No | **Yes** (Standard SDK entrypoint) | **Yes** |
| [`admin/src/hooks/useAuth.ts`](file:///Users/jay/Downloads/solarch/admin/src/hooks/useAuth.ts) | `solarch.authStore`, `AdminModel`, `AuthModel` | Reads token/admin state, subscribes to reactive auth changes, clears session on logout | No | **Yes** (Official AuthStore event API) | **Yes** |
| [`admin/src/pages/Login.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Login.tsx) | `solarch.admins.authWithPassword` | Authenticates superuser via credentials, auto-saves token & AdminModel to AuthStore | No | **Yes** (First-class `AdminService` API) | **Yes** |
| [`admin/src/pages/Collections.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Collections.tsx) | `solarch.collections.getList`, `.create`, `.delete` | Collection catalog listing, creating new collection schemas, deleting collections | Yes (Admin) | **Yes** (First-class `CollectionService` API) | **Yes** |
| [`admin/src/pages/CollectionDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/CollectionDetail.tsx) | `solarch.collections.getOne`, `.update` | Fetching single collection schema/rules, updating fields, indexes, and access rules | Yes (Admin) | **Yes** (First-class `CollectionService` API) | **Yes** |
| [`admin/src/pages/Records.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Records.tsx) | `solarch.collections.getOne`, `solarch.collection(col).getList`, `.create`, `.delete` | Schema inspection, paginated record filtering/sorting, batch record deletion, record creation | Yes (Admin) | **Yes** (First-class `RecordService` API) | **Yes** |
| [`admin/src/pages/RecordDetail.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/RecordDetail.tsx) | `solarch.collections.getOne`, `solarch.collection(col).getOne`, `.update`, `.delete` | Fetching record data, updating fields/files, deleting record | Yes (Admin) | **Yes** (First-class `RecordService` API) | **Yes** |
| [`admin/src/pages/Dashboard.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Dashboard.tsx) | `solarch.capabilities.get`, `solarch.collections.getList`, `solarch.collection(col).getList` | Inspects server capabilities (database provider, features), lists collections & record counts | Yes (Admin) | **Yes** (First-class `CapabilityService` API) | **Yes** |
| [`admin/src/pages/Backups.tsx`](file:///Users/jay/Downloads/solarch/admin/src/pages/Backups.tsx) | `solarch.http.buildUrl`, `solarch.authStore.getToken` | Generates authenticated direct download URL for backup tarball archive | Yes (Admin) | **Yes** (Transport utility helper) | **Yes** |
| [`admin/src/lib/admin-api.ts`](file:///Users/jay/Downloads/solarch/admin/src/lib/admin-api.ts) | `solarch.http.get`, `.post`, `.patch`, `.delete` | Executes HTTP requests with automatic Bearer token injection and error handling | Mixed | **Yes** (Layered strictly on Core Client HTTP engine) | **Yes** |

---

## 2. Authentication Flow Map

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Admin Browser Window                          │
│                                                                        │
│  1. Login Page                                                         │
│     solarch.admins.authWithPassword(identity, password)                │
│         │                                                              │
│         ▼                                                              │
│  2. Core Client HttpClient                                             │
│     POST /api/admins/auth-with-password                                │
│         │                                                              │
│         ▼                                                              │
│  3. Auto-Persistence                                                   │
│     solarch.authStore.save(token, adminModel)                          │
│     └─► Writes to browser localStorage key "solarch_admin_auth"        │
│     └─► Dispatches event to all authStore.subscribe() listeners        │
│         │                                                              │
│         ▼                                                              │
│  4. Reactive App Shell Gate                                            │
│     useAuth() hook updates state: { isValid: true, admin: AdminModel } │
│     App.tsx renders <Layout> and activates protected routes            │
│         │                                                              │
│         ▼                                                              │
│  5. Subsequent Outgoing Requests                                       │
│     solarch.http (and all services) injects:                           │
│     "Authorization: Bearer <token>" from solarch.authStore.getToken() │
│         │                                                              │
│         ▼                                                              │
│  6. Logout / Session Invalidation                                      │
│     solarch.authStore.clear()                                          │
│     └─► Purges localStorage, notifies useAuth(), redirects to Login    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Communication Map

All API communications are categorized by how the Admin app invokes them:

```text
                    Admin UI Pages / Components
                    │                         │
      (First-Class SDK Services)    (Custom System Endpoints)
                    │                         │
     ┌──────────────┴─────────────┐           │
     │ solarch.admins             │           ▼
     │ solarch.collections        │   adminApi (lib/admin-api.ts)
     │ solarch.collection(col)    │   • installer (check, install)
     │ solarch.files              │   • metrics (get)
     │ solarch.capabilities       │   • settings (get, update, test)
     │ solarch.realtime           │   • ai (test, chat, generate, seed)
     └──────────────┬─────────────┘   • logs (getList)
                    │                 • backups (list, create, restore, delete)
                    │                         │
                    └───────────┬─────────────┘
                                │
                                ▼
                   SolarchClient.http (HttpClient)
                    • Base URL Resolution
                    • Auth Header Injection (Bearer token)
                    • Exponential Backoff & Retry
                    • Error Deserialization (ClientResponseError)
                                │
                                ▼
                       Solarch REST / WS Server
```

---

## 4. Configuration Map

- **Base URL Configuration**:
  - `admin/src/lib/solarch.ts` initializes `new SolarchClient('')` with an empty string.
  - In browser runtime, an empty base URL means all requests resolve against the current origin (`window.location.origin`).
  - When served from the server at `http://localhost:8090/_/`, API calls automatically target `http://localhost:8090/api/*`.
  - When running standalone in Vite development (`npm run dev`), `admin/vite.config.ts` proxies `/api` -> `http://localhost:8090`.
  - Post-migration, the base URL can accept an environment variable (e.g. `import.meta.env.VITE_SOLARCH_URL || ''`) to allow the Dashboard to connect to any remote Solarch instance.
- **Storage Configuration**:
  - Store: `LocalAuthStore('solarch_admin_auth')`.
  - Stored Keys: `solarch_admin_auth` in browser `localStorage` containing JSON string of token and admin record.

---

## 5. Bypasses of Core Client

- **Unmanaged Network Requests**: **0 (None)**.
  - Zero direct calls to native `window.fetch()`, `axios`, or `XMLHttpRequest`.
  - Zero direct unmanaged `WebSocket` connections.
- **Summary**:
  The Admin Dashboard does **NOT** bypass the Core Client transport layer for any network traffic.

---

## 6. Missing Core Client Capabilities Currently Handled via `admin-api.ts`

The following system administration operations are currently implemented in `admin/src/lib/admin-api.ts` using `solarch.http` directly because `@solarch/core-client` does not yet export higher-level service classes for them:

| Administrative Domain | Endpoints Used | Current Implementation | Target SDK Service Enhancement |
| :--- | :--- | :--- | :--- |
| **System Settings** | `GET /api/settings`<br>`PATCH /api/settings`<br>`POST /api/settings/test/email`<br>`POST /api/settings/test/s3` | `adminApi.settings.*` via `solarch.http` | `client.settings` (`SettingsService`) |
| **Database Backups** | `GET /api/backups`<br>`POST /api/backups`<br>`POST /api/backups/:key/restore`<br>`DELETE /api/backups/:key`<br>`POST /api/backups/upload` | `adminApi.backups.*` via `solarch.http` | `client.backups` (`BackupService`) |
| **System Logs** | `GET /api/logs` | `adminApi.logs.getList()` via `solarch.http` | `client.logs` (`LogService`) |
| **System Metrics** | `GET /api/metrics` | `adminApi.metrics.get()` via `solarch.http` | `client.metrics` (`MetricService`) |
| **AI Assistant** | `POST /api/ai/test`<br>`POST /api/ai/chat`<br>`POST /api/ai/generate-collection`<br>`POST /api/ai/generate-rule`<br>`POST /api/ai/seed` | `adminApi.ai.*` via `solarch.http` | `client.ai` (`AIService`) |
| **System Installer** | `GET /api/installer/check`<br>`POST /api/installer` | `adminApi.installer.*` via `solarch.http` | `client.installer` (`InstallerService`) |

---

*(Core Client audit complete. Stopped and awaiting explicit instruction.)*

Viewed types.ts:1-100

# Shared File Decision Matrix

This matrix evaluates all files, assets, contracts, utilities, and configuration items that interface between the Admin Dashboard and external packages (Server, CLI, `@solarch/core-client`, CI/CD, and Docs).

---

## 1. Shared File Decision Matrix

| Path | Current Consumers | Current Ownership | Destination Recommendation | Duplication / Replacement Action | Migration Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`packages/core-client/`** | Admin, External SDK users, Tests, Future CLI | `@solarch/core-client` | **Remain where it is** (Root Monorepo SDK package) | **Do not duplicate.** Admin imports `@solarch/core-client` as an npm dependency. | Low |
| **`packages/core-client/src/contracts/types.ts`** | Core Client, Admin (`useAuth`), SDK consumers | `@solarch/core-client` | **Remain where it is** (Expand with Admin contract types) | **Do not duplicate.** Types like `RecordModel`, `AdminModel`, `ListResult` are consumed from SDK. | Low |
| **`admin/src/lib/admin-api.ts` (Types & Methods)** | Admin Dashboard (`AIAssistant`, `Settings`, `Logs`, `Backups`, `Dashboard`, `Login`) | `admin` (Currently ad-hoc) | **Migrate into `@solarch/core-client`** | **Replace:** Formalize `AdminSettings`, `BackupItem`, `LogItem`, `MetricsResponse`, `AISettings` into Core Client service classes (`client.settings`, `client.backups`, `client.logs`, `client.metrics`, `client.ai`, `client.installer`). | Low |
| **`scripts/copy-admin.js`** | Root `package.json` (`build:ui`, `build`) | Server Build Tooling | **Remain in Server** | **Modify:** Make optional or decouple from default `npm run build` so server compiles without requiring local UI build. | Low |
| **`pb_public/admin/`** | Server runtime (`src/apis/serve.ts`) | Server Static Distribution | **Remain in Server** | **Retain:** Serves the pre-compiled static Admin SPA bundle when present. | Low |
| **`src/apis/serve.ts:102-145`** | Server HTTP Router (`/_/`) | Server Backend | **Remain in Server** | **Retain:** Static file handler serves `pb_public/admin/index.html` or falls back to HTML installer. | Low |
| **`solarch-logo.svg`** | Root repo README, docs | Brand Asset | **Remain in Root** | **Safe duplication:** Static web assets (`admin/public/solarch-logo.svg`) are legitimately mirrored in the Admin frontend. | Zero |
| **`admin/src/components/SolarchLogo.tsx`** | Admin Layout, Login | Admin UI | **Move with Admin** | **Retain in Admin:** React SVG component with theme styling. | Zero |
| **`docs/admin-design-system.md`** | Admin UI Designers/Developers | Documentation | **Remain in Root Docs** | **Copy to Admin:** Mirror as reference in Admin repo if desired. | Zero |
| **`docs/design-system-spec.md`** | Admin UI Developers | Documentation | **Remain in Root Docs** | **Copy to Admin:** Mirror as reference in Admin repo if desired. | Zero |
| **`docs/openapi.json`** | API Consumers, Docs, Tests | Shared API Spec | **Remain in Root Docs** | **Do not duplicate.** Source of truth for server API endpoints. | Zero |
| **`.github/workflows/ci.yml`** | Entire Repository (CI) | CI/CD Infrastructure | **Remain in Root** | **Update Discovery:** Discovery script will automatically treat extracted packages as generic or sdk modules. | Low |

---

## 2. Shared Artifacts & Subsystem Breakdown

### 2.1 Shared TypeScript Types & Contracts
- **Existing in `@solarch/core-client`**:
  - `RecordModel`, `AdminModel`, `AuthModel`, `ListResult<T>`, `RecordOptions`, `RecordListOptions`, `RecordFullListOptions`, `RealtimeEventPayload`, `ApiErrorResponse`, `ServerHealthInfo`.
  - *Recommendation*: **Remain in `@solarch/core-client`**.
- **Admin System Types (Currently in `admin/src/lib/admin-api.ts`)**:
  - `AdminSettings`, `AISettings`, `BackupItem`, `LogItem`, `LogListResponse`, `AdminMetricsResponse`, `AIChatMessage`, `AIChatResponse`, `InstallerCheckResponse`.
  - *Recommendation*: **Move into `@solarch/core-client/src/contracts/admin.ts`** and expose via dedicated services so that both the Admin Dashboard and the future CLI can consume typed system administration operations without code duplication.

### 2.2 Schemas & Validation
- Collection definitions, schema validation, and field rule schemas live on the Server (`src/core/collection.ts`, `src/core/field.ts`).
- Admin creates and edits collections purely as plain JSON objects conforming to the wire protocol.
- *Recommendation*: **No schema sharing needed across repository boundary; wire format validated by server API.**

### 2.3 Constants & Enums
- Storage keys:
  - `'solarch_admin_auth'` (auth store key in browser localStorage)
  - `'solarch_ai_sessions'` (AI chat history in browser localStorage)
- *Recommendation*: **Remain encapsulated within the Admin Dashboard.**

### 2.4 Utility Functions
- Class merging (`cn`): Defined in `admin/src/lib/utils.ts` (`clsx` + `tailwind-merge`).
- *Recommendation*: **Move with Admin Dashboard.** It is a standard React/Tailwind frontend utility with zero server dependencies.

### 2.5 Authentication Helpers
- `LocalAuthStore`: Implemented and tested in `@solarch/core-client/src/stores/LocalAuthStore.ts`.
- `useAuth`: React hook implemented in `admin/src/hooks/useAuth.ts`.
- *Recommendation*: `LocalAuthStore` **remains in Core Client**; `useAuth` **moves with Admin Dashboard**.

### 2.6 UI Components & Design System
- 34 primitive components in `admin/src/components/ui/` (`button`, `input`, `table`, `sidebar`, `dialog`, `dropdown-menu`, `tabs`, `select`, etc.).
- Navigation & shell components in `admin/src/components/` (`Layout`, `PageContainer`, `PageHeader`, `StatCard`, `SolarchLogo`).
- *Recommendation*: **Move 100% with Admin Dashboard.**

---

*(Shared File Decision Matrix complete. Stopped and awaiting explicit instruction.)*


Viewed cli.ts:1-180
Viewed cli.ts:181-327
Viewed superuser.ts:1-127
Searched for "cli\.test"
Searched for "createSuperuser"
Viewed cli_database_config.test.ts:1-60

# Current Solarch CLI Implementation & Responsibility Map

This audit inspects the current CLI implementation in [`src/cli.ts`](file:///Users/jay/Downloads/solarch/src/cli.ts) and [`src/cmd/superuser.ts`](file:///Users/jay/Downloads/solarch/src/cmd/superuser.ts), analyzing its capabilities, runtime coupling, and alignment with the future decoupled CLI architecture.

---

## 1. Current CLI Subsystem Inspection

### 1.1 Entrypoint & Binary Configuration
- **Entrypoint File**: [`src/cli.ts`](file:///Users/jay/Downloads/solarch/src/cli.ts) (327 lines, TypeScript with `#!/usr/bin/env node` shebang).
- **Compilation Output**: Compiled via `tsc` to `dist/cli.js`.
- **Package Manifest Declaration**: Declared in root [`package.json:11-13`](file:///Users/jay/Downloads/solarch/package.json#L11-L13):
  ```json
  "bin": {
    "solarch": "dist/cli.js"
  }
  ```
- **Argument Parser**: `commander` (v12.0.0).

### 1.2 Command Inventory
The current CLI implements the following commands and option flags:

| Command | Arguments / Flags | Current Implementation | Action Performed |
| :--- | :--- | :--- | :--- |
| **`solarch serve`** | `--port <number>`, `--dir <path>`, `--db <provider>`, `--db-url <url>`, `--db-driver <driver>`, `--db-mode <mode>`, `--hideStartBanner`, `--dev` | Imports `Solarch` class from `./solarch`, calls `app.start(port)` | Boots in-process server instance, runs migrations, serves REST/WS + static UI |
| **`solarch superuser`** | `--email <email>`, `--password <password>`, `--dir <path>`, `--db <provider>`, `--db-url <url>` | Imports `createSuperuser` from `./cmd/superuser.ts` | Prompts for credentials (masked password input) and inserts directly into `_superusers` table |
| **`solarch superuser-create`** *(alias: `superuser create`)* | `[email]`, `[password]`, `--dir <path>`, `--db <provider>`, `--db-url <url>` | Imports `createSuperuser` from `./cmd/superuser.ts` | Non-interactive superuser creation directly in database |
| **`solarch migrate up`** | `--dir <path>`, `--db <provider>`, `--db-url <url>` | In-process `app.bootstrap()` + `app.migrate()` | Executes pending JS migrations from `./pb_migrations` |
| **`solarch migrate down`** | `[count]`, `--dir <path>`, `--db <provider>`, `--db-url <url>` | In-process `app.bootstrap()` + `app.migrateDown(count)` | Rolls back last `count` migration(s) |
| **`solarch migrate status`** | `--dir <path>`, `--db <provider>`, `--db-url <url>` | In-process `app.bootstrap()` + `app.migrationStatus()` | Prints console table of migration IDs, applied status, and timestamps |
| **`solarch migrate create`** | `<name>`, `--dir <path>` | File system generator (`fs.writeFileSync`) | Generates timestamped migration file template in `./pb_migrations` |
| **`solarch init`** | `--dir <path>` | Interactive `readline` prompt | Scaffolds `.env`, `solarch.config.ts`, `pb_migrations/001_init.js`, and `docker-compose.yml` |

### 1.3 Interactive Wizard & Code Generation
- **Prompt Implementation**: Uses Node.js `readline` interface.
- **Project Scaffolding (`solarch init`)**:
  - Prompts for: Project name, Database (SQLite / Postgres), Auth providers (email, Google, GitHub, Discord), Rate limiting, AI tools.
  - Generates: `pb_data/`, `pb_migrations/`, `.env`, `solarch.config.ts`, `pb_migrations/001_init.js`, `docker-compose.yml`.
- **Migration Template Generator (`solarch migrate create`)**:
  - Generates standard `up(app)` / `down(app)` migration format.

### 1.4 Server-Runtime Coupling
- **Coupling Level**: **High (In-Process)**.
- `src/cli.ts` currently imports `Solarch` from `./solarch.ts` directly.
- Running `solarch serve`, `solarch superuser`, and `solarch migrate` initializes the entire backend database engine, encryption services, and ORM in the CLI process.

### 1.5 CLI Test Coverage
- Tested via [`src/apis/__tests__/cli_database_config.test.ts`](file:///Users/jay/Downloads/solarch/src/apis/__tests__/cli_database_config.test.ts) (tests `createSuperuser`, `hasSuperuser`, configuration fallback, and startup failures).

---

## 2. CLI Capability Classification Matrix

Aligned with the target architectural philosophy:
- **CLI** = Developer workflow, project scaffolding, schema migration control surface.
- **Dashboard** = Account, platform management, runtime telemetry, administrative configuration.
- **Client Core** = Canonical typed communication boundary.

| Capability | Current Mechanism | Target Destination | Classification | Rationale & Migration Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Project Scaffolding (`solarch init`)** | `readline` file generation | Future CLI package (`packages/cli`) | **A. Keep in future CLI** | Developer workflow utility. Can be enriched with modern interactive prompts (`prompts`/`clack`) and template presets. |
| **Migration Generator (`solarch migrate create`)** | File template writer | Future CLI package (`packages/cli`) | **A. Keep in future CLI** | Developer workflow utility. Generates migration boilerplate on developer filesystem. |
| **Server Runner (`solarch serve`)** | In-process `app.start()` | Refactored Server Starter | **B. Refactor** | Move server runner into a dedicated server entrypoint or decouple CLI execution. CLI can manage starting background/local dev instances. |
| **Migration Execution (`solarch migrate up/down/status`)** | Direct DB runner | Future CLI / Server API | **B. Refactor** | For local projects, can run local migrations. For remote instances, should trigger migrations via authenticated API in `@solarch/core-client`. |
| **Superuser Creation (`solarch superuser`)** | Direct DB insert | Future CLI / Core Client | **B. Refactor** | Replace direct database manipulation with calls to `POST /api/installer` or local initialization routines when server is uninitialized. |
| **System Settings Management** | N/A in CLI (In Admin UI) | Dashboard | **C. Move into Dashboard** | Server settings (mail, S3, AI tokens) belong in Admin Dashboard and must NOT be managed by CLI. |
| **System Backup & Restore** | N/A in CLI (In Admin UI) | Dashboard | **C. Move into Dashboard** | Database snapshots and restores belong to Dashboard platform management. |
| **Schema & Collection Editor** | N/A in CLI (In Admin UI) | Dashboard | **C. Move into Dashboard** | Visual schema editor belongs in Dashboard. |
| **Types & Schema Extraction / Generation** | Not yet implemented | Future CLI (`solarch generate`) | **A. Keep in future CLI** | Future CLI developer capability to generate TypeScript types from live schema via `@solarch/core-client`. |
| **Direct Database Connection (`better-sqlite3`, `pg`)** | Imported in CLI process | Server-only | **E. Remove from CLI** | CLI should communicate via `@solarch/core-client` or delegate to server runtime instead of embedding database connection drivers. |

---

## 3. Out-of-Scope CLI Responsibilities (Strict Boundary Enforced)

In accordance with the architecture mandate, the future Solarch CLI will **NOT** own or implement:
- ❌ **Subscriptions & Billing** (Owned exclusively by Platform / Dashboard).
- ❌ **Plugin Platform Configuration** (Owned by Platform / Server).
- ❌ **Hosting Provider Selection** (Owned by Platform / Deployment tools).
- ❌ **Adapter Management** (Owned by Server runtime).
- ❌ **Account Administration & User Roles** (Owned by Dashboard).
- ❌ **Enterprise Platform Configuration** (Owned by Dashboard / Server).

---

*(Current CLI responsibility map complete. Stopped and awaiting explicit instruction.)*

# Final Migration Map: Solarch Architecture Decoupling

This document specifies the exact, non-destructive migration plan to separate the **Admin Dashboard** and establish the four-pillar architecture: **Server**, **CLI**, **Dashboard**, and **`@solarch/core-client`**.

---

## 1. Target Architecture Overview

```text
                                  Solarch
                                     │
     ┌──────────────────┬────────────┴────────────┬──────────────────┐
     ▼                  ▼                         ▼                  ▼
    CLI             Dashboard            @solarch/core-client      Server
 (Developer       (Platform & Account      (Canonical Client     (Runtime &
  Workflow)           Management)              Boundary)          Backend)
```

### Responsibility Boundaries

| Pillar | Primary Purpose | Key Responsibilities | Out-of-Scope (Forbidden) |
| :--- | :--- | :--- | :--- |
| **CLI** | Developer workflow & local development control surface | • `init` & project scaffolding<br>• Project config & `.env`<br>• Local server dev orchestration<br>• Migration creation & execution<br>• TypeScript type generation (`generate`)<br>• Project linking & auth handoff<br>• System diagnostics | ❌ Subscriptions & billing<br>❌ Account administration<br>❌ Hosting provider selection<br>❌ Adapter management<br>❌ Plugin platform config |
| **Dashboard** | Web-based account & platform management | • Account & superuser auth<br>• Team & organization access<br>• Projects & usage metrics<br>• Database collection/record UI<br>• Storage & file management<br>• Mail, S3 & AI settings<br>• Backups & system logs<br>• Subscriptions & billing<br>• Plugin & adapter config | ❌ Local filesystem migrations<br>❌ Project boilerplate generation<br>❌ Direct database access drivers |
| **Core Client** | Universal, platform-neutral client SDK | • Typed HTTP & WS transport<br>• Auth state & storage (`LocalAuthStore`)<br>• `RecordService`, `CollectionService`<br>• `AdminService`, `FileService`<br>• Realtime subscription manager<br>• Error handling & deserialization | ❌ Server runtime internals<br>❌ Browser DOM / UI styling<br>❌ Direct Node.js OS commands |
| **Server** | Backend runtime engine & database layer | • Express REST & WS API<br>• SQLite / Postgres / D1 drivers<br>• Lexer, AST parser & query planner<br>• Password hashing & JWT validation<br>• Migration runner & JSVM hooks<br>• Static asset serving (`/_/`) | ❌ UI React components<br>❌ Client storage abstractions |

---

## 2. File-by-File Migration Matrix

| Current Path | Target Path | Action | Dependencies | Import Changes | Package / Build Changes | Risk | Verification Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`admin/`** | `packages/admin/` *(or dedicated repo)* | **Move** | `@solarch/core-client`, `react`, `vite`, `tailwindcss` | Update `@solarch/core-client` to workspace reference | Change workspace in root `package.json` to `"packages/*"` | Low | `npm run build` in `packages/admin`, `tsc --noEmit` |
| **`admin/src/lib/admin-api.ts`** | `packages/admin/src/lib/admin-api.ts` | **Retain & Layer** | `solarch.http` | None (continues using `solarch.http` until SDK services land) | None | Zero | Verify all 10 Admin pages render and invoke APIs |
| **`admin/src/lib/solarch.ts`** | `packages/admin/src/lib/solarch.ts` | **Retain & Enhance** | `@solarch/core-client` | Support `import.meta.env.VITE_SOLARCH_URL` fallback | None | Zero | Test relative origin + remote target URL |
| **`packages/core-client/`** | `packages/core-client/` | **Retain & Expand** | None (Zero dependency) | Add Admin system contract types to `contracts/types.ts` | Increment minor version if services added | Low | `npm --workspace=@solarch/core-client run test` (205/205 tests pass) |
| **`scripts/copy-admin.js`** | `scripts/copy-admin.js` | **Refactor** | `fs`, `path` | Update source path to `packages/admin/dist` | Make copy conditional (warns if UI not built rather than failing) | Low | Run root build without `admin/dist` present |
| **Root `package.json`** | Root `package.json` | **Refactor** | Root scripts | Update `build:ui` to `npm --workspace=@solarch/admin run build` | Update `"workspaces": ["packages/*"]` | Low | `npm run build` runs cleanly across all workspaces |
| **`src/apis/serve.ts`** | `src/apis/serve.ts` | **Retain** | Express | None | Preserves `pb_public/admin/` static mount + fallback HTML | Zero | Test `/_/` route when `pb_public/admin` is present and absent |
| **`src/cli.ts`** | `packages/cli/src/index.ts` *(CLI phase)* | **Extract** | `@solarch/core-client`, `commander` | Replace in-process `Solarch` imports with Core Client calls where appropriate | New workspace `@solarch/cli` | Med | CLI test suite in `packages/cli` |

---

## 3. Checkpoints & Quality Gates

The migration must stop immediately if any checkpoint fails.

```text
[ CHECKPOINT 1: Monorepo Workspace & Path Normalization ]
├── 1. Move `admin/` -> `packages/admin/`
├── 2. Update root `package.json` workspaces to `["packages/*"]`
├── 3. Update `scripts/copy-admin.js` source path to `packages/admin/dist`
└── GATE: Run `npm install` and verify root workspace tree resolves.

[ CHECKPOINT 2: Standalone Dashboard Build Verification ]
├── 1. Run `npm --workspace=@solarch/admin run build`
├── 2. Verify `packages/admin/dist/index.html` and assets exist
└── GATE: `tsc --noEmit` in `packages/admin` passes with 0 type errors.

[ CHECKPOINT 3: Server Build Decoupling ]
├── 1. Run `npm run build` at root
├── 2. Verify server compiles (`dist/`) and bundles `@solarch/core-client`
└── GATE: Root build succeeds without errors.

[ CHECKPOINT 4: Full Test & Conformance Suite ]
├── 1. Run `npm test` (all 71 server test files & 648 unit/eval tests)
├── 2. Run `npm --workspace=@solarch/core-client run test` (205 tests)
└── GATE: 100% of test suites pass green.

[ CHECKPOINT 5: CI Discovery & Screening Validation ]
├── 1. Run `.github/workflows/ci.yml` locally / on branch
└── GATE: Dynamic discovery detects `packages/core-client` (SDK) and `packages/admin` (Generic).
```

---

## 4. Mechanical Execution Order for Agent 1

When authorized to proceed with the migration, execute the following steps in sequence:

1. **Step 1: Workspace Restructuring**
   - Relocate `admin/` to `packages/admin/`.
   - Update `package.json` at root to declare `"workspaces": ["packages/*"]`.
   - Update `admin/package.json` name to `@solarch/admin` (or retain `solarch-admin`).

2. **Step 2: Build & Copy Script Adjustment**
   - Update `scripts/copy-admin.js` to read from `path.join(__dirname, "..", "packages", "admin", "dist")`.
   - Update root `package.json` script `build:ui` to:
     `npm --workspace=@solarch/admin run build && node scripts/copy-admin.js`

3. **Step 3: Admin Client Environment Support**
   - Update `packages/admin/src/lib/solarch.ts` to support optional environment variable:
     `new SolarchClient(import.meta.env.VITE_SOLARCH_URL || '', { authStore: new LocalAuthStore('solarch_admin_auth') })`

4. **Step 4: Build Verification**
   - Execute `npm install`.
   - Build `@solarch/core-client`, `packages/admin`, and root server `solarch`.

5. **Step 5: Test Verification**
   - Run root `npm test` and core-client `npm test`.

---

*(Final Migration Map complete. Stopped and awaiting explicit instruction.)*