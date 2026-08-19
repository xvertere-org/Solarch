# Architecture & Internal Design

This document details the architectural layers, module boundaries, and execution models of Solarch.

---

## High-Level Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Developer Layer                        │
│          CLI (Commander.js)  │  @solarch/core-client         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Command & UI Subsystem                   │
│   • CLI Context Resolver (src/cli/context.ts)               │
│   • Template Engine (src/templates/)                        │
│   • Generators (src/cmd/generate/)                          │
│   • Diagnostics & Doctor Engine (src/cmd/doctor.ts)         │
│   • Reactive UI & Clack Prompts (src/ui/)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Core Application Engine                   │
│   • Solarch App Instance (src/solarch.ts)                   │
│   • Config Loader & Resolver (src/core/config_loader.ts)    │
│   • Router & API Endpoints (src/apis/)                      │
│   • Authentication & RBAC (src/tools/security/)             │
│   • Realtime Hub: WS & SSE (src/tools/realtime/)            │
│   • Embedded JS/TS Worker Engine (src/tools/jsvm/)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Database Abstraction Layer                 │
│   • SQLite Driver (WAL Mode, zero-config)                   │
│   • PostgreSQL Driver (Native TCP & Connection Pooling)     │
│   • Serverless Drivers (Neon HTTP & WebSocket)              │
│   • Transactional Migration Runner (pb_migrations/)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. The CLI & Context Layer

The CLI layer is built with **Commander.js** and designed with a centralized context resolution pattern.

- **`src/cli.ts`**: The main entry point router that defines commands, subcommands, and options.
- **`src/cli/context.ts`**: Centralized resolution module that eliminates Commander option shadowing. It safely resolves options like `--dir`, `--db`, `--db-url`, and `--dev` across multi-level command hierarchies while filtering out root-level data directory defaults.
- **`src/ui/`**: Opinionated terminal UI system built with custom ANSI color themes, grouped help formatters, interactive prompts, and typo suggestion algorithms.

---

## 2. Template & Scaffolding Engine

The template subsystem provides declarative starter architectures without hardcoded conditional logic:

- **`src/templates/types.ts`**: Strict TypeScript interfaces defining `TemplateDefinition`, `MigrationDefinition`, and `HookDefinition`.
- **`src/templates/definitions.ts`**: Self-contained template blueprints (`minimal`, `api`, `realtime`, `saas`, `ai`).
- **`src/templates/registry.ts`**: Thread-safe registry providing lookup, listing, and metadata inspection.
- **`src/cmd/init/generator.ts`**: Pure generation engine that scaffolds directories, writes `.env`, creates `solarch.config.ts`, writes migrations, and runs internal health diagnostics.

---

## 3. Core Application Engine

The core runtime coordinates HTTP routing, realtime messaging, and middleware:

- **`src/solarch.ts`**: Main `Solarch` class managing the server lifecycle (`bootstrap()`, `serve()`, `migrate()`, `shutdown()`).
- **`src/core/config_loader.ts`**: Resolves `solarch.config.ts` merged with `.env` variables and CLI overrides into a fully validated `AppConfig`.
- **`src/apis/`**: Generates automatic REST CRUD endpoints for all database collections, authentication handlers, verification tokens, and backup routines.
- **`src/tools/realtime/`**: Dual-protocol real-time subscription engine supporting both Server-Sent Events (SSE) and WebSockets.
- **`src/tools/jsvm/`**: Sandboxed JavaScript VM worker engine for executing user hooks and server-side automation scripts safely.

---

## 4. Database Layer & Driver Matrix

Solarch decouples database storage through a unified query interface:

- **SQLite Engine**: Embedded, high-performance file database operating in Write-Ahead Logging (WAL) mode for high concurrency.
- **PostgreSQL Engine**: Full TCP pool driver for multi-instance production workloads with full transactional DDL support.
- **Neon Serverless Engine**: HTTP and WebSocket database drivers optimized for edge environments and serverless scale-to-zero databases.

---

## 5. Core Client SDK (`@solarch/core-client`)

A lightweight, isomorphic TypeScript client for consuming Solarch backends from browsers, Node.js, and mobile applications:

- **Location**: `packages/core-client/`
- **Features**: Type-safe collection queries, automatic JWT refresh handling, realtime SSE/WebSocket subscriptions, and filter query builders.
