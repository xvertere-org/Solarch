# JSVM Sandbox (Deno)

**Verified working** — 54 tests cover isolation, resource limits, and attack resistance.

---

## Overview

Solarch uses a Deno-based sandbox for executing untrusted JavaScript code in complete isolation. This is used for evaluating user-defined hook logic and agent-submitted code.

## Architecture

Code is executed by spawning a **Deno subprocess** with maximum restrictions:

```
deno run --no-prompt \
  --deny-net --deny-read --deny-write \
  --deny-env --deny-run --deny-ffi --deny-hrtime \
  --v8-flags=--max-old-space-size=<MB> \
  -
```

The code is piped via stdin. The worker script runs the code and writes a JSON result to stdout.

## Isolation Guarantees

| Protection | Mechanism |
|-----------|-----------|
| **Network** | `--deny-net` — no HTTP, WS, TCP, or UDP |
| **Filesystem** | `--deny-read --deny-write` — no file access |
| **Environment** | `--deny-env` — no access to env vars |
| **Subprocess** | `--deny-run` — cannot spawn processes |
| **FFI** | `--deny-ffi` — no native library calls |
| **High-res timing** | `--deny-hrtime` — prevents timing attacks |

## Resource Limits

| Limit | Default | Configurable |
|-------|---------|-------------|
| **Timeout** | 5,000ms | `timeoutMs` (100–30,000ms) |
| **Memory** | 64 MB | `JSVM_MAX_MEMORY_MB` env (16–512 MB) |
| **Concurrency** | 8 sandboxes | `JSVM_MAX_CONCURRENT` env |
| **stdout** | 1 MB | Hard-coded |
| **stderr** | 64 KB | Hard-coded |

## API

### `runInDeno(code, context?, options?)`

```typescript
import { runInDeno } from './tools/jsvm/deno_sandbox'

const result = await runInDeno(
  'return context.input * 2',
  { input: 21 },
  { timeoutMs: 3000, mode: 'code' }
)
// result: { success: true, result: 42, logs: [] }
```

### Modes

| Mode | Description |
|------|-------------|
| `code` | Executes arbitrary code, returns the result |
| `hook` | Executes hook-style code with `$app` context |
| `condition` | Evaluates a boolean condition |

### Context

The `context` parameter is a plain JSON-serializable object available inside the sandbox. Sensitive settings are stripped by `sanitizeSettingsForSandbox`:

**Allowed settings keys:**
- `appName`, `appUrl`, `senderName`, `senderAddress`
- `hideControls`, `recordsPerPage`, `defaultLanguage`

**Stripped (never passed to sandbox):**
- JWT secrets, SMTP passwords, S3 credentials, API keys

### `checkDenoAvailability()`

```typescript
import { checkDenoAvailability } from './tools/jsvm/deno_sandbox'

const version = await checkDenoAvailability()
// "2.1.4" or null if Deno is not installed
```

## Security Attacks Tested

The following attack vectors have been tested and confirmed blocked:

- **Network exfiltration** — denied by `--deny-net`
- **Filesystem read/write** — denied by `--deny-read`/`--deny-write`
- **Prototype pollution** — doesn't escape the sandbox
- **Circular references** — handled without crash
- **Context poisoning** (`__proto__`, `constructor`) — stripped/ignored
- **stdout flooding** — capped at 1 MB
- **Infinite loops** — killed by timeout
- **Memory exhaustion** — killed by V8 max-old-space-size

**Test evidence:** `jsvm_sandbox.test.ts` → 54 tests all passing, covering network isolation, filesystem isolation, resource limits, error handling, logic attacks, context poisoning, and availability checks.
