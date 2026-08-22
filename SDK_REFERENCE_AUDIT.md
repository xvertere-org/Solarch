# Solarch Ecosystem SDK Reference Audit & Migration Report

## Overview

A comprehensive audit was performed across all source files, schemas, and test suites in the repository to align CLI package references with published Solarch ecosystem contracts.

The CLI previously assumed internal scoped conventions (`@solarch/web`, `@solarch/react-native`, `@solarch/desktop`, `@solarch/ai`). These assumptions have been corrected to treat packages as external published contracts (`solarch-web`, `solarch-rn`, `solarch-electron`, `solarch-tauri`, `solarch-ai`, and `@solarch/mcp-server`).

---

## Canonical Package Reference Mapping

| Category | Incorrect Legacy Reference | Canonical Published Package | Purpose & Runtime Boundary |
|---|---|---|---|
| **Core CLI** | `solarch` | `solarch` | Developer OS, project lifecycle manager, deployment & agent runtime controller. |
| **Web SDK** | `@solarch/web` | `solarch-web` | Official offline-first Web SDK (IndexedDB, mutation outbox, React hooks). |
| **Mobile SDK** | `@solarch/react-native` | `solarch-rn` | React Native & Expo mobile platform layer with native storage and sync. |
| **Desktop (Electron)** | `@solarch/desktop` | `solarch-electron` | Electron runtime integration with IPC bridge. |
| **Desktop (Tauri)** | `@solarch/desktop` | `solarch-tauri` | Tauri runtime integration with native Rust bridge. |
| **Application AI** | `@solarch/ai` | `solarch-ai` | Developer SDK for building AI apps (chat streaming, vector workflows). |
| **MCP Server** | *(internal)* | `@solarch/mcp-server` | External agent integration boundary (Claude Code, Cursor, IDEs). |

---

## Audited & Corrected File Inventory

### 1. Catalog & Provisioning Subsystem
- **[`src/platform/sdk/catalog.ts`](file:///Users/jay/Downloads/solarch/src/platform/sdk/catalog.ts)**: [NEW] Created canonical `SolarchSdkPackage` registry and `SdkCatalog` resolver.
- **[`src/platform/sdk/registry.ts`](file:///Users/jay/Downloads/solarch/src/platform/sdk/registry.ts)**: Refactored `SdkRegistry` to delegate to `SdkCatalog`.
- **[`src/platform/sdk/installer.ts`](file:///Users/jay/Downloads/solarch/src/platform/sdk/installer.ts)**: Resolves user inputs (`web`, `mobile`, `ai`, etc.) to canonical package names for package manager execution.
- **[`src/platform/sdk/index.ts`](file:///Users/jay/Downloads/solarch/src/platform/sdk/index.ts)**: Exported canonical catalog types and classes.

### 2. Ecosystem Intent & Recommendations
- **[`src/ecosystem/sdk.ts`](file:///Users/jay/Downloads/solarch/src/ecosystem/sdk.ts)**: Updated `ECOSYSTEM_SDKS` descriptors and alias lookups.
- **[`src/ecosystem/recommendation.ts`](file:///Users/jay/Downloads/solarch/src/ecosystem/recommendation.ts)**: Maps application types and desktop runtimes to canonical packages (`solarch-web`, `solarch-rn`, `solarch-electron`, `solarch-tauri`, `solarch-ai`).

### 3. Capabilities & Plugins
- **[`src/platform/capabilities/matrix.ts`](file:///Users/jay/Downloads/solarch/src/platform/capabilities/matrix.ts)**: Updated capability resolver requirement outputs.
- **[`src/platform/plugins/registry.ts`](file:///Users/jay/Downloads/solarch/src/platform/plugins/registry.ts)**: Updated `search-pgvector` required SDK to `solarch-ai`.

### 4. MCP Integration Layer
- **[`src/platform/mcp/`](file:///Users/jay/Downloads/solarch/src/platform/mcp/)**: [NEW] Implemented `McpAdapter`, `McpRegistry`, and `McpClient` referencing `@solarch/mcp-server`.

### 5. Test Suites & Prompts
- Corrected all test suites in `src/platform/__tests__/`, `src/ecosystem/__tests__/`, `src/ui/__tests__/`, and `src/cmd/__tests__/`.
- Added dedicated `src/platform/__tests__/sdk_catalog.test.ts`.

---

## Invariant Verification

1. **Zero hardcoded SDK identities in CLI core**: The CLI only discovers, recommends, and installs packages from the catalog.
2. **`solarch-ai` separation**: The CLI agent runtime (`src/platform/agent/`) contains zero dependency on `solarch-ai`.
3. **MCP isolation**: CLI exposes typed capability adapters without duplicating MCP transport protocols.
