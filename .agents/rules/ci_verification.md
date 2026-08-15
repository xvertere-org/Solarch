# Continuous Integration & Git Push Verification Rule

Whenever code changes or commits are pushed to the remote repository (`main` or feature branches):

1. **Pre-Push Local Verification Gate**:
   - Always run `npm run lint` (ESLint).
   - Always run `npm run typecheck` (TypeScript `tsc --noEmit`).
   - Always run `npm run build` (tsc, worker copy, admin UI build).
   - Always run `npm test` or `npm run test:coverage`.
   - Always run `npm audit --audit-level=high` to ensure 0 high/critical vulnerabilities.

2. **Live CI Pipeline Monitoring (`CI.yml`)**:
   - After pushing to `main` (or opening/updating a pull request), immediately trigger and continuously monitor the GitHub Actions CI workflow (`gh run list`, `gh run watch <run-id> --exit-status`, or `gh pr checks`).
   - If any CI job (Lint, Typecheck, Build, Test, Security & Audit) encounters a failure or build-time error:
     1. Trace the failed job logs immediately (`gh run view --job=<job-id> --log-failed`).
     2. Identify the root cause (e.g. Node version native compatibility, type mismatch, broken assertion).
     3. Fix the issue directly in the codebase.
     4. Verify locally and push the fix.
     5. Continue monitoring the new CI run until **100% of jobs pass**.

3. **Node Runtime Invariant**:
   - Ensure native C++ addons (`better-sqlite3`, etc.) are tested against supported Active LTS versions (`20.x`, `22.x`).
