# Solarch — Verified Documentation

> **Scope:** This documentation covers **only** features that have been verified working through automated tests. For a complete feature inventory with statuses, see [`STATUS-REPORT.md`](../STATUS-REPORT.md).

## Guides

| Document | Features Covered |
|----------|-----------------|
| [Setup & Installation](./setup.md) | First-run, CLI, health check |
| [Authentication](./authentication.md) | Password auth, OTP, MFA/TOTP, admin auth, JWT middleware, token refresh, password reset, email change, impersonation |
| [Records](./records.md) | Create, update, enrichment (expand/fields/hide), access rules |
| [Backup & Restore](./backup.md) | Create, list, delete, restore, upload backups |
| [Realtime](./realtime.md) | Channel authorization |
| [Security](./security.md) | SQL injection protection, password hash protection, old password verification, token revocation |
| [JSVM Sandbox](./jsvm-sandbox.md) | Deno isolated sandbox |
| [Health](./health.md) | Health check endpoint |

## What's Not Documented Here

Features with complete implementations but no dedicated test coverage are listed in [`STATUS-REPORT.md`](../STATUS-REPORT.md) as `⚠️ UNTESTED`. These include:

- OAuth2 providers (GitHub, Google, Discord, Facebook)
- File storage (local + S3)
- AI features (generate collection, rules, seed, chat)
- Collection CRUD & import/export
- Batch API, Cron jobs, Logs API, Settings API
- Admin UI, SSE/WS realtime, field type validation
- Email sending, migrations

These features exist in code and appear functional on inspection, but have not been proven through tests.
