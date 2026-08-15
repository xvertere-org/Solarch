---
title: "REST API Reference"
description: "Exhaustive directory of all REST endpoints, parameters, and authentication rules."
slug: "reference/rest-api"
---

# REST API Reference

Exhaustive reference table of all REST API endpoints exposed by Solarch ([src/apis/serve.ts](../../src/apis/serve.ts)).

---

## 1. System & Health

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Check API health status and read/write capabilities. |
| `GET` | `/api/installer` | None | Check installer state. |
| `POST` | `/api/installer` | None | Initial superuser setup during first-time web installation. |

---

## 2. Superuser Authentication

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admins/auth-with-password` | None | Authenticate superuser with username and password. Rate limited (10 requests/15 min). |
| `POST` | `/api/admins/refresh` | Superuser | Refresh superuser JWT authentication token. |

---

## 3. Record Authentication

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/collections/:collection/auth-with-password` | None | Authenticate record with email/username and password. |
| `POST` | `/api/collections/:collection/refresh` | Record Auth | Refresh record auth token. |
| `GET` | `/api/collections/:collection/methods` | None | List available auth providers, OAuth2 URLs, OTP and MFA status. |
| `POST` | `/api/collections/:collection/auth-with-oauth2` | None | Authenticate or register record using OAuth2 code. |
| `POST` | `/api/collections/:collection/request-otp` | None | Request a One-Time Password code via email. |
| `POST` | `/api/collections/:collection/auth-with-otp` | None | Authenticate using OTP code. |
| `POST` | `/api/collections/:collection/mfa/setup` | Record Auth | Generate TOTP secret and QR payload. |
| `POST` | `/api/collections/:collection/mfa/verify` | Record Auth | Confirm TOTP setup with initial 6-digit code. |
| `POST` | `/api/collections/:collection/impersonate/:id` | Superuser | Obtain authentication token for a target record. |

---

## 4. Collections & Records CRUD

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/collections` | Superuser | List all collection schema definitions. |
| `POST` | `/api/collections` | Superuser | Create a new collection. |
| `GET` | `/api/collections/:id` | Superuser | Fetch collection definition by ID or name. |
| `PATCH` | `/api/collections/:id` | Superuser | Update collection definition. |
| `DELETE` | `/api/collections/:id` | Superuser | Delete collection and drop associated tables. |
| `POST` | `/api/collections/import` | Superuser | Bulk import collection schemas. |
| `GET` | `/api/collections/:c/records` | `listRule` | List records with pagination, filtering, and sorting. |
| `GET` | `/api/collections/:c/records/:id` | `viewRule` | Fetch single record by ID. |
| `POST` | `/api/collections/:c/records` | `createRule` | Create a new record. Supports `multipart/form-data`. |
| `PATCH` | `/api/collections/:c/records/:id` | `updateRule` | Update existing record fields. |
| `DELETE` | `/api/collections/:c/records/:id` | `deleteRule` | Delete single record. |

---

## 5. File Storage, Realtime, Batch & Backups

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/files/:c/:recordId/:filename` | Public / Token | Retrieve uploaded file or image thumbnail (`?thumb=...`). |
| `POST` | `/api/files/token` | Record Auth | Generate short-lived file access token. |
| `GET` | `/api/realtime` | None | Open Server-Sent Events (SSE) realtime connection stream. |
| `POST` | `/api/realtime` | None | Set active topic subscriptions for SSE client ID. |
| `POST` | `/api/batch` | Record/Superuser | Execute multiple transactional CRUD requests. |
| `GET` | `/api/backups` | Superuser | List point-in-time zip backups. |
| `POST` | `/api/backups` | Superuser | Create new zip backup archive. |
| `POST` | `/api/backups/:name/restore` | Superuser | Restore database and uploads from backup zip. |
| `DELETE` | `/api/backups/:name` | Superuser | Delete backup zip archive. |

---

## 6. AI Endpoints

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/generate-collection` | Superuser | Generate collection schema from text description. |
| `POST` | `/api/ai/generate-rule` | Superuser | Generate collection access rule from prompt. |
| `POST` | `/api/ai/seed` | Superuser | Seed mock records into collection. |
| `POST` | `/api/ai/chat` | Superuser | Interactive assistance chat endpoint. |
| `POST` | `/api/collections/:c/vector-search` | `listRule` | Perform vector similarity search over float array fields. |
