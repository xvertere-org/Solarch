# Migration Guide: v0.19.0 → v0.19.5

This guide details the changes introduced in **Solarch v0.19.5**, how to upgrade your existing projects, and how to take advantage of the new developer platform CLI tooling.

---

## What's New in v0.19.5

Solarch v0.19.5 transitions Solarch from a standalone backend runtime wrapper into a **complete developer platform and CLI environment**.

### Major Additions:
1. **Interactive Init Experience 2.0 (`solarch init`)**:
   - Template selection: `minimal`, `api`, `realtime`, `saas`, `ai`
   - Configuration presets: `development`, `production`, `testing`
   - Dry-run preview mode (`--dry-run`)
2. **Template Ecosystem (`solarch template list`, `solarch template info`)**:
   - Catalog inspection and architectural exploration directly from the CLI.
3. **Interactive Development Server (`solarch dev`)**:
   - Hot-reloading watcher for configuration, migrations, and hooks.
   - Interactive keyboard shortcuts (<kbd>r</kbd> restart, <kbd>d</kbd> doctor, <kbd>c</kbd> clear, <kbd>q</kbd> quit).
4. **Code & Schema Generators (`solarch generate`)**:
   - `solarch generate collection <name>`
   - `solarch generate migration <name>`
   - `solarch generate hook <name>`
5. **Developer Observability & Tools**:
   - Real-time log streaming and level filtering (`solarch logs --follow`)
   - Endpoint discovery and routing table viewer (`solarch routes`)
6. **Project Lifecycle Management (`solarch project`)**:
   - Directory path resolution (`solarch project path`)
   - Cache and runtime cleanup (`solarch project clean`)
   - State reset and re-verification (`solarch project reset`)
7. **Declarative Configuration & Environment Tooling**:
   - `solarch config show`, `solarch config validate`, `solarch config set`
   - `solarch env check`, `solarch env generate`, `solarch env show`
8. **Deep System Diagnostics (`solarch doctor`, `solarch inspect`)**:
   - Automated 6-point health check across Node.js, config, database, migrations, and permissions.
   - Subsystem inspectors for project, database, features, and dependencies.

---

## Upgrade Instructions

### 1. Update the Global CLI

Upgrade your global `solarch` binary:

```bash
npm install -g solarch@latest
```

Verify your version:

```bash
solarch version
# Output should indicate v0.19.5
```

### 2. Update Local Project Dependencies

If you have `@solarch/core-client` or local devDependencies installed:

```bash
npm install --save-dev solarch@0.19.5
npm install @solarch/core-client@0.1.0
```

---

## Transitioning from `solarch serve` to `solarch dev`

In previous versions, local development was conducted using `solarch serve`.

In v0.19.5:
- **`solarch dev`**: Use for local day-to-day development. Includes file watching, instant reload, pre-flight diagnostics, and keyboard controls.
- **`solarch serve`**: Retained for production container deployments and production runtime environments.

Update your `package.json` scripts:

```diff
  "scripts": {
-   "dev": "solarch serve",
+   "dev": "solarch dev",
    "start": "solarch serve",
    "migrate": "solarch migrate up"
  }
```

---

## Adopting `solarch.config.ts`

If your project was using command-line flags or raw `.env` variables for configuration, you can now adopt a declarative `solarch.config.ts`:

```typescript
// solarch.config.ts
export default {
  port: 8090,
  dataDir: './pb_data',
  database: {
    type: 'sqlite',
  },
  auth: {
    providers: ['email'],
  },
  rateLimiting: {
    enabled: true,
  },
}
```

Validate your configuration:

```bash
solarch config validate
```

---

## Secret Validation & Key Generation

If your `.env` is missing cryptographic keys:

```bash
solarch env generate
```

This will safely add `SOLARCH_JWT_SECRET` and `SOLARCH_ENCRYPTION_KEY` if they are not already present.

---

## Breaking Changes & Compatibility

- **Core API & SDK**: **100% Backward Compatible**. Existing REST endpoints, authentication rules, and `@solarch/core-client` queries require zero code changes.
- **CLI Options**: All existing flags (`--db`, `--db-url`, `--dir`, `--port`) are preserved across all commands.
- **Node.js Runtime**: Requires Node.js `>= 20.0.0` LTS.
