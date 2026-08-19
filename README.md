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

Solarch provides a complete local development environment.

## Start Development

```bash
solarch dev
```

Features:

- automatic health validation
- file watching
- hot restart
- runtime controls
- development logs

Example:

```text
⚡ Starting Solarch Development Server

✔ Environment validated
✔ Database connected
✔ Configuration loaded

Local:
http://localhost:8090

Controls:
r  restart
l  logs
d  doctor
q  quit
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

## Final Positioning Statement

**Solarch is not a library you install.**

**Solarch is the environment where you build, run, and evolve backend systems.**
