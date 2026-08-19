# Solarch ☀️

<p align="center">
  <img src="./pb_public/solarch-banner.png" alt="Solarch Banner" width="800" />
</p>

<h3 align="center">
The developer operating system for building production-ready backend applications.
</h3>

<p align="center">
Create. Develop. Inspect. Deploy. Scale.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/solarch"><img src="https://img.shields.io/npm/v/solarch.svg?style=flat-square&color=blue" alt="npm version"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/npm/dm/solarch.svg?style=flat-square&color=orange" alt="Downloads">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License"></a>
</p>

---

## Overview

Solarch is a complete backend development platform designed to help developers build, run, and manage modern applications with a unified developer experience.

From the first project command to production operations, Solarch provides:

- Intelligent project scaffolding
- Production-ready architecture templates
- Local development workflows
- Database and migration management
- Authentication infrastructure
- Realtime capabilities
- Environment security
- Developer diagnostics
- Extensible tooling

Solarch transforms backend development from a collection of disconnected tools into a single, coherent workflow.

```bash
solarch init

solarch dev

solarch doctor

solarch deploy
```

One platform.  
One workflow.  
One developer experience.

---

# Why Solarch?

Modern backend development requires developers to assemble many different systems:

- project structure
- authentication
- database configuration
- migrations
- environments
- debugging tools
- deployment workflows
- monitoring

Solarch brings these concerns together into a unified development layer.

Instead of spending days configuring infrastructure, developers start with a production-oriented foundation.

---

# Features

## 🚀 Project Generation

Create complete backend applications with intelligent templates.

```bash
solarch init
```

Choose from:

| Template | Purpose |
|---|---|
| **Minimal** | Lightweight backend foundation |
| **API** | REST application architecture |
| **Realtime** | Event-driven applications |
| **SaaS** | Multi-tenant products |
| **AI** | AI-powered applications |

Example:

```bash
solarch init --template saas
```

Generates:

```
my-app/
├── solarch.config.ts
├── .env
├── pb_data/
├── pb_migrations/
├── src/
│   └── hooks/
└── package.json
```

---

# Developer Workflow

Solarch provides a complete, cohesive terminal development environment from initial scaffold to production verification.

---

## 1. Interactive Project Creation

```bash
solarch init
```

```text
┌  ⚡ Create Solarch Application
│
◇  What are you building?
│  ● SaaS Application (Multi-tenant orgs, OAuth2, audit logs, billing hooks)
│
◇  Project name:
│  my-saas-platform
│
◇  Database provider:
│  ● PostgreSQL (Production-grade relational backend)
│
◇  Architecture Review:
│  ┌────────────────────────────────────────────────────────┐
│  │ Name:       my-saas-platform                           │
│  │ Template:   saas (SaaS Application)                    │
│  │ Database:   PostgreSQL                                 │
│  │ Auth:       Email, Google, GitHub OAuth2               │
│  │ Realtime:   Dual-protocol (WebSocket + SSE)            │
│  │ Hooks:      billing.ts webhook lifecycle               │
│  │ Security:   256-bit entropy keys (0o600 .env)          │
│  └────────────────────────────────────────────────────────┘
│
◇  Generate project?
│  ● Yes, initialize
│
◇  Project structure ready
◇  Cryptographic secrets generated
◇  Configuration and migrations created
◇  Baseline health check passed
│
└  ⚡ Solarch Project Created!

   Next steps:
     cd my-saas-platform
     solarch dev
```

---

## 2. Interactive Development Server

```bash
solarch dev
```

```text
┌  ⚡ Solarch Dev Server
│
◇  Pre-flight Diagnostics
│  ✔ Node.js Runtime: v22.22.3 (compatible: >= 20.0.0)
│  ✔ Configuration: Loaded solarch.config.ts (with .env)
│  ✔ Database: Connected to PostgreSQL (pool: 10 connections)
│  ✔ Migrations: 3 applied, 0 pending
│
◇  File Watcher Active
│  Watching for changes: solarch.config.ts, pb_migrations/, src/hooks/
│
◇  Runtime Endpoints
│  • REST API:  http://localhost:8090/api/
│  • Admin UI:  http://localhost:8090/_/
│  • Realtime:  ws://localhost:8090/realtime
│  • Events:    http://localhost:8090/api/realtime
│
◇  Interactive Controls:
│  [r] Hot Restart   [l] Stream Logs   [d] Run Doctor   [q] Quit
│
└  ⚡ Ready for development
```

---

## 3. Automated System Diagnostics

```bash
solarch doctor
```

```text
┌  ⚡ Solarch Doctor - Environment & System Diagnostics
│
│  [✔] Node.js Runtime:        v22.22.3 (compatible: >= 20.0.0)
│  [✔] Configuration File:    Loaded solarch.config.ts (with .env)
│  [✔] Data Directory:         pb_data (read/write verified)
│  [✔] Database Connectivity:  Connected to PostgreSQL
│  [✔] Database Migrations:    3 applied, 0 pending
│  [✔] Superuser Status:       1 active administrator account
│
└  ✔ System operational: All 6 checks passed.
```

---

## 4. Resource Generation & Schema Migrations

```bash
solarch generate migration add_team_invites
solarch generate hook stripe_billing
solarch migrate up
```

```text
┌  ⚡ Solarch Generator
│
◇  Scaffolded migration: pb_migrations/1787116740_add_team_invites.js
◇  Scaffolded hook:      src/hooks/stripe_billing.ts
│
└  ✔ Resources generated. Run "solarch migrate up" to apply changes.
```

---

# Project Intelligence

Understand your application instantly.

## Health Checks

```bash
solarch doctor
```

Checks:

- runtime compatibility
- configuration
- database connection
- migrations
- security settings

## Project Information

```bash
solarch info
```

View:

- project metadata
- enabled features
- runtime information

## Deep Inspection

```bash
solarch inspect project

solarch inspect database

solarch inspect features

solarch inspect dependencies
```

---

# Database Management

Solarch provides structured database workflows.

## Migrations

Create:

```bash
solarch generate migration add_users
```

Apply:

```bash
solarch migrate up
```

Rollback:

```bash
solarch migrate down
```

Migration system provides:

- version tracking
- rollback support
- schema evolution
- development safety

---

# Authentication & Security

Solarch includes secure application foundations.

Supported authentication:

- Email/password
- OAuth providers
- Role-based access patterns

Security features:

- encrypted secrets
- environment isolation
- credential masking
- secure configuration handling

Generate secure environments:

```bash
solarch env generate
```

Check configuration:

```bash
solarch env check
```

---

# API Development

Explore your backend instantly.

## Route Discovery

```bash
solarch routes
```

Example:

```text
API Routes

REST
GET       /api/users
POST      /api/users
PATCH     /api/users/:id

Realtime
WS        /realtime
SSE       /events
```

---

# Logs & Debugging

Understand what your application is doing.

```bash
solarch logs
```

Features:

- structured logs
- filtering
- realtime streaming
- JSON output

Example:

```bash
solarch logs --follow
```

---

# Environment Management

Manage application configuration safely.

Show:

```bash
solarch env show
```

Validate:

```bash
solarch env check
```

Generate:

```bash
solarch env generate
```

Sensitive values are automatically protected.

---

# Configuration Management

Control application behavior.

View:

```bash
solarch config show
```

Validate:

```bash
solarch config validate
```

Update:

```bash
solarch config set feature.ai true
```

---

# Templates Ecosystem

Explore available architectures:

```bash
solarch template list
```

Example:

```text
Available Templates

Minimal
API
Realtime
SaaS
AI
```

Inspect:

```bash
solarch template info saas
```

---

# CLI Experience

Solarch provides a modern terminal experience.

Features:

- interactive launcher
- intelligent command suggestions
- grouped help system
- beautiful terminal output
- structured errors

Run:

```bash
solarch
```

Interactive mode:

```text
⚡ What do you want to do?

> Create application
  Start development server
  Check system health
  Manage database
  Inspect project
```

---

# Architecture

Solarch is designed around clear layers.

```text
                 Solarch Platform

              Developer Interface
                    CLI
                     |
              Command Framework
                     |
              Runtime Engine
                     |
        Database / Auth / Realtime
                     |
              Application Layer
```

The architecture is designed for:

- extensibility
- automation
- team workflows
- future cloud capabilities

---

# Installation

Requirements:

- Node.js 20+
- npm / pnpm / yarn

Install:

```bash
npm install -g solarch
```

Verify:

```bash
solarch version
```

---

# Quick Start

Create a project:

```bash
solarch init
```

Enter project:

```bash
cd my-app
```

Start development:

```bash
solarch dev
```

Check health:

```bash
solarch doctor
```

Your backend is ready.

---

# Development Philosophy

Solarch follows three principles:

## 1. Developer First

The developer experience is part of the product.

Every command should be:

- discoverable
- predictable
- safe

## 2. Production Mindset

Projects should not start as experiments.

They should start with:

- structure
- security
- observability
- maintainability

## 3. One Unified Workflow

Development should not require switching between dozens of disconnected systems.

Solarch provides one continuous workflow:

```text
Create
↓
Develop
↓
Inspect
↓
Improve
↓
Deploy
```

---

# Roadmap

## Current

### v0.19.x — Local Developer Platform

Completed:

- CLI ecosystem
- templates
- development workflow
- diagnostics
- migrations
- security hardening

## Future

### v0.20 — Platform Layer

Planned:

- team collaboration
- cloud environments
- deployment workflows
- project management
- plugin ecosystem

---

# Contributing

Contributions are welcome.

Areas:

- CLI improvements
- templates
- integrations
- documentation
- developer tooling

---

# License

[Apache 2.0 License](./LICENSE)

---

## Final Statements

**Solarch is not a library you install.**

**Solarch is the environment where you build, run, and evolve backend systems.**
