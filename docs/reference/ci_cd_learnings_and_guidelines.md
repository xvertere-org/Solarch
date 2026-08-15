# CI/CD Experience, Learnings & Operational Guidelines

This document records the architectural learnings, troubleshooting patterns, and operational protocols established during the `@solarch/core-client` delivery and CI pipeline hardening.

---

## 1. CI Pipeline Architecture (`.github/workflows/ci.yml`)

The Solarch CI pipeline validates every push and pull request across 5 sequential and matrix stages:

```text
                  ┌──────────────┐
                  │     Lint     │ (ESLint)
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  Typecheck   │ (tsc --noEmit)
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │    Build     │ (Node 20.x, 22.x matrix)
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │     Test     │ (Vitest + Coverage matrix)
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │   Security   │ (npm audit --audit-level=high)
                  └──────────────┘
```

---

## 2. Key Learnings & Root-Cause Analyses

### A. Date Object vs. ISO Timestamp String in Record Upsert
- **Symptom:** `Type 'Date' is not assignable to type 'string'` in `src/core/record_upsert.ts`.
- **Root Cause:** `BaseModel.created` and `BaseModel.updated` are JavaScript `Date` instances. `RecordData` expects optional ISO strings (`string | undefined`).
- **Fix:** In `RecordUpsertForm.buildRecord()`, explicitly format dates with `.toISOString()`:
  ```typescript
  if (this.record) {
    recordData.id = this.record.id
    recordData.created = this.record.created ? this.record.created.toISOString() : undefined
    recordData.updated = this.record.updated ? this.record.updated.toISOString() : undefined
    for (const key of this.record.keys()) {
      recordData[key] = this.record.get(key)
    }
  }
  ```

### B. Node 24 Native C++ Addon Hook Incompatibility
- **Symptom:** Unhandled worker exit during test teardown: `Assertion failed: (env) != nullptr` in `better-sqlite3` destructor (`RemoveEnvironmentCleanupHook`).
- **Root Cause:** Node 24 (unreleased/experimental nightly) altered V8 isolate environment cleanup lifecycle, breaking legacy native C++ cleanup hooks in `better-sqlite3` v11.
- **Resolution:** Pin CI build and test matrices to supported Active LTS Node.js runtimes (`20.x` Iron and `22.x` Jod).

---

## 3. Mandatory Protocol for Pushing to `main`

Whenever pushing changes to `main`:

1. **Local Pre-Flight Checks**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm test
   npm audit --audit-level=high
   ```

2. **Git Push & Branch Synchronization**:
   ```bash
   git push origin main
   git push solarch main
   ```

3. **Live CI Monitoring & Log Tracing**:
   ```bash
   # Find active run ID
   gh run list --limit 3
   
   # Watch run live
   gh run watch <RUN_ID> --exit-status
   
   # On failure, instantly trace logs
   gh run view --job=<JOB_ID> --log-failed
   ```

4. **Iterate Until 100% Green**:
   - Fix any build-time or runtime issues immediately.
   - Re-verify locally, commit, and push.
   - Monitor the new run until all jobs pass with 0 errors.
