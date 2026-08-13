# Setup & Installation

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Deno** (optional, for JSVM sandbox — see [JSVM Sandbox](./jsvm-sandbox.md))

## Install

```bash
git clone <repo-url> solarch
cd solarch
npm install
```

## Build

```bash
npm run build
```

This compiles TypeScript from `src/` to `dist/`.

## First Run

```bash
npx tsx src/cli.ts serve --data-dir ./pb_data --dev
```

Or after building:

```bash
node dist/cli.js serve --data-dir ./pb_data --dev
```

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--data-dir` | `./pb_data` | Directory for SQLite databases and file storage |
| `--port` | `8090` | HTTP port |
| `--host` | `0.0.0.0` | Bind address |
| `--dev` | `false` | Enables development mode (verbose logging) |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | JWT signing secret. Must be ≥ 32 characters. |
| `PORT` | No | Override listen port (CLI flag takes precedence) |
| `JSVM_MAX_CONCURRENT` | No | Max concurrent Deno sandbox processes (default: 8) |
| `JSVM_MAX_MEMORY_MB` | No | Max memory per sandbox in MB (default: 64, max: 512) |

## Create Superuser

Interactive mode:

```bash
npx tsx src/cli.ts superuser-create --data-dir ./pb_data
```

With arguments:

```bash
npx tsx src/cli.ts superuser-create --data-dir ./pb_data --email admin@example.com --password 'YourSecurePassword123!'
```

Password input is masked with `*` characters in interactive mode.

## Installer API (Alternative)

If no superuser exists, the installer endpoint is available:

```bash
# Check installation status
curl http://localhost:8090/api/installer/check
# → {"installed": false}

# Create first superuser
curl -X POST http://localhost:8090/api/installer \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret123!","passwordConfirm":"secret123!"}'
# → {"code": 200, "message": "Installer completed."}
```

The installer endpoint returns `403` after the first superuser is created.

## Health Check

**Verified working** — see [Health](./health.md).

```bash
curl http://localhost:8090/api/health
# → {"status": "ok"}
```

## Directory Structure

After first run, `--data-dir` contains:

```
pb_data/
├── data.db          # Main SQLite database (collections, records, settings)
├── auxiliary.db     # Auxiliary database (logs, tokens)
├── storage/         # File uploads (local driver)
├── backups/         # Backup zip files
└── pb_hooks/        # JavaScript hook files (optional)
```

## Running Tests

```bash
npm test
# or
npx vitest run
```

All 155 tests should pass. Some tests spawn Deno subprocesses (requires Deno installed for JSVM sandbox tests).
