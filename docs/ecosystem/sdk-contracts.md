# Solarch Ecosystem SDK Contracts & MCP Integration

## Architecture

The Solarch CLI operates as a **Developer Operating System and Project Lifecycle Controller**. It does not implement SDK functionality; rather, it discovers, recommends, provisions, and audits independently published Solarch ecosystem packages.

```text
                                 SOLARCH ECOSYSTEM ARCHITECTURE

                               ┌─────────────────────────────┐
                               │     solarch (Core CLI)      │
                               │  - Lifecycle & Scaffolding  │
                               │  - Deployments & Telemetry  │
                               │  - Agent Control Plane      │
                               └──────────────┬──────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     ▼                        ▼                        ▼
        ┌─────────────────────────┐ ┌───────────────────┐  ┌───────────────────────┐
        │  Client & Runtime SDKs  │ │  Application AI   │  │   Agent Integration   │
        │                         │ │                   │  │                       │
        │ • solarch-web (Browser) │ │ • solarch-ai      │  │ • @solarch/mcp-server │
        │ • solarch-rn (Mobile)   │ │   (Dev AI SDK)    │  │   (External IDE & LLM │
        │ • solarch-electron      │ │                   │  │    Tool Protocol)     │
        │ • solarch-tauri         │ │                   │  │                       │
        └─────────────────────────┘ └───────────────────┘  └───────────────────────┘
```

---

## Published Packages & Capabilities

### 1. `solarch` (Core CLI)
- **Role**: Developer OS, interactive init wizard, database migration engine, platform sync, deployment manager, telemetry visualizer, and agent runtime.

### 2. `solarch-web` (Web SDK)
- **Role**: Official offline-first Web SDK.
- **Features**: IndexedDB local storage, mutation outbox, causal FIFO sync, and React hooks (`useQuery`, `useAuth`, `useRealtime`).

### 3. `solarch-rn` (React Native SDK)
- **Role**: Mobile platform ergonomics layer for React Native and Expo.
- **Features**: Native SQLite/MMKV storage integration, offline sync, background reconciliation.

### 4. `solarch-electron` & `solarch-tauri` (Desktop SDKs)
- **Role**: Native desktop platform integration layers.
- **Features**: IPC bridge, local filesystem caching, native window lifecycle hooks.

### 5. `solarch-ai` (Application AI Developer SDK)
- **Role**: Developer SDK for building AI-powered applications.
- **Features**: Streaming chat completions, vector embeddings, semantic search, and application agent workflows.
- *Note*: The CLI itself does not depend on `solarch-ai`.

### 6. `@solarch/mcp-server` (Model Context Protocol Server)
- **Role**: External agent integration boundary.
- **Consumers**: Claude Code, Cursor, OpenAI Agents, and IDE assistants.
- **Features**: Exposes Solarch capabilities (`project.inspect`, `database.inspect_schema`, `service.status`, `doctor.run`) as typed MCP tools.

---

## Provisioning & Synchronization

Developers can install or synchronize SDKs via friendly short names or canonical package names:

```bash
# By short name
solarch sdk add web
solarch sdk add mobile
solarch sdk add ai

# By canonical npm package name
solarch sdk add solarch-web
solarch sdk add solarch-rn
solarch sdk add solarch-ai

# Reconcile project requirements
solarch sdk sync --yes
```
