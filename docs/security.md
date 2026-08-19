# Security Architecture & OWASP Top 10 Compliance

This document outlines the security architecture, threat model mitigations, and OWASP Top 10 alignment for Solarch and the Solarch CLI.

---

## Core Security Principles

1. **Secure by Default**: All freshly scaffolded projects are generated with cryptographic secrets (256-bit entropy), rate limiting enabled, and strict file permissions (`0o600` for `.env`).
2. **Zero Secret Leakage**: Terminal commands (`solarch env show`, `solarch config show`, `solarch inspect database`) automatically mask sensitive tokens, private keys, and database passwords.
3. **Input Sanitization & Path Traversal Prevention**: All CLI commands accepting filenames, collection names, or target paths reject path traversal patterns (`..`, `/`, `\`).
4. **Idempotency & Destructive Action Safeguards**: Operations that clean or reset local state require explicit interactive confirmation or the `--force` / `--yes` flags.

---

## OWASP Top 10 (2021) Compliance Matrix

### A01: Broken Access Control
- **Mitigation in Solarch**:
  - Declarative collection access rules (`listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`).
  - Request context macros (`@request.auth.id`, `@request.data.*`).
  - Separation of superuser administrative endpoints from standard user collections.
  - Role-based and ownership-based record-level authorization.

---

### A02: Security Misconfiguration
- **Mitigation in Solarch**:
  - Automated diagnostic engine (`solarch doctor` / `solarch check`) checks 6 critical health vectors on every run.
  - Configuration schema validation (`solarch config validate`) prevents deployment of malformed runtime settings.
  - Environment auditing (`solarch env check`) flags missing secrets or insecure fallback keys.

---

### A03: Software and Data Integrity / Supply Chain Failures
- **Mitigation in Solarch**:
  - Zero-vulnerability dependency baseline verified via `npm audit` and `npm audit --production`.
  - Locked `package-lock.json` with strict cryptographic integrity hashes (`sha512`).
  - NPM pack boundary verification: zero test files, internal tools, or `.env` files included in published packages.

---

### A04: Cryptographic Failures
- **Mitigation in Solarch**:
  - Automatic 256-bit cryptographic key generation using Node.js `crypto.randomBytes(32)` during `solarch init` and `solarch env generate`.
  - Symmetric AES-256-GCM encryption for at-rest storage of sensitive fields, OAuth refresh tokens, and internal backups.
  - JWT signing with high-entropy HMAC-SHA256 secrets (`SOLARCH_JWT_SECRET`).
  - Masked database connection strings in terminal outputs and JSON reports.

---

### A05: Injection
- **Mitigation in Solarch**:
  - Parameterized SQL queries across all database drivers (SQLite and PostgreSQL).
  - Strict resource name validation: `validateResourceName` disallows SQL injection, shell metacharacters, and path traversal in `solarch generate` and `solarch migrate create`.
  - Zero use of `eval()` or un-sanitized child process execution from user inputs.

---

### A06: Insecure Design
- **Mitigation in Solarch**:
  - Pre-configured security-hardened starter templates (`minimal`, `api`, `realtime`, `saas`, `ai`).
  - Sandboxed JavaScript VM (`src/tools/jsvm/`) for user hooks, isolating hook execution from internal server globals.
  - Separation of data directory (`pb_data/`) from public static web assets (`pb_public/`).

---

### A07: Identification and Authentication Failures
- **Mitigation in Solarch**:
  - Secure password hashing using industry-standard algorithms.
  - Built-in multi-factor authentication (TOTP MFA) and email OTP verification flows.
  - Automatic JWT token expiration and refresh token rotation.
  - Compound IP + Identity rate limiting to mitigate brute-force password guessing.

---

### A08: Software and Data Integrity Failures
- **Mitigation in Solarch**:
  - Verified NPM distribution build with TypeScript type verification and linting gates.
  - Clean reproducible builds via `tsup` and `tsc`.
  - Binary integrity verified before publishing.

---

### A09: Security Logging and Monitoring Failures
- **Mitigation in Solarch**:
  - Structured application logs streamed via `solarch logs` with severity levels (`DEBUG`, `INFO`, `WARN`, `ERROR`).
  - Automatic redaction of passwords and authentication tokens from console output.
  - Audit logging support in SaaS template (`pb_migrations/003_create_audit_logs.js`).

---

### A10: Server-Side Request Forgery (SSRF)
- **Mitigation in Solarch**:
  - Webhook handlers and external HTTP connectors validate target URLs.
  - Private / loopback IP address filtering on outbound requests.

---

## Reporting a Vulnerability

If you discover a security vulnerability in Solarch, please report it privately:

- **Email**: `security@solarch.dev` (or open a GitHub Security Advisory)
- Please do not disclose vulnerabilities publicly until a patch has been released.
