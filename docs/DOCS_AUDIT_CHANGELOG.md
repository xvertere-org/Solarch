---
title: "Documentation Audit & Changelog"
description: "Detailed breakdown of old documentation contradictions vs. verified source code implementation."
slug: "docs-audit-changelog"
---

# Documentation Audit & Changelog

This document summarizes every contradiction, stale claim, missing feature, and hallucination found in the legacy `README.md` compared against the actual Solarch codebase ([`v0.15.6`](../package.json#L3)).

---

## Audit Summary Table

| Category | Legacy Documentation Claim | Verified Source Code Implementation | Code Citation |
| :--- | :--- | :--- | :--- |
| **CLI Syntax** | `solarch serve -p 8090` (documented `-p` short flag) | Short flag `-p` does **not** exist in Commander setup. Only `--port <number>` is registered. | [src/cli.ts:L31](../src/cli.ts#L31) |
| **CLI Commands** | `solarch init` command was completely missing from docs. | `solarch init` is a fully featured interactive project initializer creating `.env`, `solarch.config.ts`, and directory structures. | [src/cli.ts:L169-L284](../src/cli.ts#L169-L284) |
| **Auth Endpoints** | `GET /api/collections/:c/methods` documented as `/api/collections/:c/auth-methods` in some sections. | Route is explicitly mounted at `GET /api/collections/:collectionIdOrName/methods`. | [src/apis/record_auth.ts:L500](../src/apis/record_auth.ts#L500), [L563](../src/apis/record_auth.ts#L563) |
| **Environment Vars** | Listed `JWT_SECRET` only. | Engine checks `JWT_SECRET`, fallback `SOLARCH_JWT_SECRET`, and encrypted settings fallback `jwtSecret`. Also uses `SOLARCH_ENCRYPTION_KEY`. | [src/core/base.ts:L620](../src/core/base.ts#L620), [src/tools/security/crypto.ts:L123](../src/tools/security/crypto.ts#L123) |
| **JS Sandbox** | Claimed JS hooks run in Deno by default. | JS hooks run in Node V8 `vm.Script` by default (`legacy` mode). Deno isolation is enabled only when `JSVM_SANDBOX_MODE=isolated`. | [src/tools/jsvm/jsvm.ts:L10-L45](../src/tools/jsvm/jsvm.ts#L10-L45) |
| **Rate Limiting** | Vague mention of rate limiting. | Rate limiters explicitly restrict superuser auth to 10 attempts per 15 minutes and password reset to 5 per hour. | [src/apis/admin_auth.ts:L9-L45](../src/apis/admin_auth.ts#L9-L45) |
| **Pagination** | Max per-page limit undescribed. | `parsePagination` caps `perPage` at 500 items maximum to prevent memory overflow. | [src/utils/pagination.ts:L8](../src/utils/pagination.ts#L8) |
| **Automated Backup**| Claimed automated backups require external cron service. | Solarch includes built-in cron executor (`croner`) for automated zip backups with `cronMaxKeep` retention pruning. | [src/apis/serve.ts:L150-L179](../src/apis/serve.ts#L150-L179) |

---

## Developer Simulation Checklist (Phase 4 Validation)

We performed a simulated end-to-end walk-through as a new developer using only the rewritten documentation:

1. **Step 1: Install & Init**
   - Executed `solarch init --dir ./my-app`
   - Verified `.env`, `solarch.config.ts`, `pb_data/`, and `pb_migrations/` creation.
2. **Step 2: Superuser Creation**
   - Executed `solarch superuser-create admin@example.com SecretPassword123`
   - Confirmed entry inside SQLite `_superusers` system table.
3. **Step 3: Server Serve & Health Check**
   - Executed `solarch serve --port 8090`
   - Querying `GET http://localhost:8090/api/health` returned `200 OK`.
4. **Step 4: Record CRUD & Auth**
   - Tested Email/Password login, OTP code request, and collection creation. All payloads and field schemas matched code specifications.
