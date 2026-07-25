---
title: "Troubleshooting & FAQ"
description: "Resolve common deployment, CORS, database, and sandbox execution issues."
slug: "troubleshooting"
---

# Troubleshooting & FAQ

Solutions for common operational and deployment issues with Solarch.

---

## 1. Database Lock & WAL File Issues

### Problem
Solarch database files (`pb_data/data.db-wal` or `pb_data/data.db-shm`) grow excessively large or report `SQLITE_BUSY: database is locked`.

### Root Cause
SQLite operates in Write-Ahead Logging (WAL) mode. If the process crashes uncleanly, WAL checkpoints may be delayed.

### Resolution
- Graceful shutdown handles WAL truncation automatically ([src/solarch.ts:L108](../src/solarch.ts#L108)). Ensure signals like `SIGINT` or `SIGTERM` are sent to the process.
- If locked during CLI operations, ensure no other instance of `solarch serve` is accessing `pb_data` simultaneously.

---

## 2. CORS Errors in Web Applications

### Problem
Browser requests to `http://localhost:8090/api/` fail with `Cross-Origin Request Blocked`.

### Root Cause
CORS domain restrictions in production mode ([src/apis/middlewares_cors.ts:L5](../src/apis/middlewares_cors.ts#L5)).

### Resolution
Set `CORS_ALLOWED_ORIGINS` environment variable to match your client web application domain:

```bash
export CORS_ALLOWED_ORIGINS="http://localhost:3000,https://myapp.com"
solarch serve --port 8090
```

---

## 3. Account Lockouts Due to Failed Logins

### Problem
Authentication requests return `429 Account temporarily locked. Try again later.`

### Root Cause
The security lockout module ([src/utils/lockout.ts](../src/utils/lockout.ts)) tracks IP and identity failed login attempts to prevent brute force attacks.

### Resolution
Wait 15 minutes for the window to reset, or restart the server process to clear transient in-memory lockout trackers.

---

## 4. Deno Sandbox Not Found Warning

### Problem
Terminal displays warning: `[JSVM] JSVM_SANDBOX_MODE=isolated but Deno is not available. Agent code/condition nodes will fall back to legacy vm.Script execution.`

### Root Cause
`JSVM_SANDBOX_MODE=isolated` was specified, but Deno executable is not in system `PATH` ([src/tools/jsvm/jsvm.ts:L46](../src/tools/jsvm/jsvm.ts#L46)).

### Resolution
1. Install Deno: `curl -fsSL https://deno.land/install.sh | sh`
2. Ensure Deno directory is added to system `PATH`.
3. Or unset `JSVM_SANDBOX_MODE` to run in default legacy V8 VM mode.
