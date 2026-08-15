# Admin Protocol Inventory & Classification

This document audits and classifies every API operation discovered in the Admin codebase before migration.

## Protocol Inventory Table

| Current Endpoint / Operation | HTTP Method | Found In (File) | Classification | Canonical Target | Boundary Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/installer/check` | GET | `admin/src/pages/Login.tsx` | **Admin-Only** | `adminApi.installer.check()` | `solarch.http.get()` |
| `/api/installer` | POST | `admin/src/pages/Login.tsx` | **Admin-Only** | `adminApi.installer.install()` | `solarch.http.post()` |
| `/api/admins/auth-with-password` | POST | `admin/src/pages/Login.tsx` | **Universal** | `solarch.admins.authWithPassword()` | `AdminService` |
| `/api/collections` | GET | `Dashboard.tsx`, `Collections.tsx` | **Universal** | `solarch.collections.getList()` | `CollectionService` |
| `/api/collections` | POST | `Collections.tsx` | **Universal** | `solarch.collections.create()` | `CollectionService` |
| `/api/collections/:id` | GET | `CollectionDetail.tsx`, `Records.tsx`, `RecordDetail.tsx` | **Universal** | `solarch.collections.getOne()` | `CollectionService` |
| `/api/collections/:id` | PATCH | `CollectionDetail.tsx` | **Universal** | `solarch.collections.update()` | `CollectionService` |
| `/api/collections/:id` | DELETE | `Collections.tsx` | **Universal** | `solarch.collections.delete()` | `CollectionService` |
| `/api/collections/:id/records` | GET | `Dashboard.tsx`, `Records.tsx` | **Universal** | `solarch.collection(id).getList()` | `RecordService` |
| `/api/collections/:id/records` | POST | `Records.tsx` | **Universal** | `solarch.collection(id).create()` | `RecordService` |
| `/api/collections/:id/records/:recordId` | GET | `RecordDetail.tsx` | **Universal** | `solarch.collection(id).getOne()` | `RecordService` |
| `/api/collections/:id/records/:recordId` | PATCH | `RecordDetail.tsx` | **Universal** | `solarch.collection(id).update()` | `RecordService` |
| `/api/collections/:id/records/:recordId` | DELETE | `Records.tsx` | **Universal** | `solarch.collection(id).delete()` | `RecordService` |
| `/api/settings` | GET | `Settings.tsx` | **Admin-Only** | `adminApi.settings.get()` | `solarch.http.get()` |
| `/api/settings` | PATCH | `Settings.tsx` | **Admin-Only** | `adminApi.settings.update()` | `solarch.http.patch()` |
| `/api/ai/test` | POST | `Settings.tsx` | **Admin-Only** | `adminApi.ai.test()` | `solarch.http.post()` |
| `/api/ai/chat` | POST | `AIAssistant.tsx` | **Admin-Only** | `adminApi.ai.chat()` | `solarch.http.post()` |
| `/api/logs` | GET | `Logs.tsx` | **Admin-Only** | `adminApi.logs.getList()` | `solarch.http.get()` |
| `/api/backups` | GET | `Backups.tsx` | **Admin-Only** | `adminApi.backups.getList()` | `solarch.http.get()` |
| `/api/backups` | POST | `Backups.tsx` | **Admin-Only** | `adminApi.backups.create()` | `solarch.http.post()` |
| `/api/backups/:key` | DELETE | `Backups.tsx` | **Admin-Only** | `adminApi.backups.delete()` | `solarch.http.delete()` |

---

## Architectural Rules
1. **Universal Operations** (Auth, Collections, Records) are executed exclusively through the public typed methods of `@solarch/core-client` (`solarch.admins.*`, `solarch.collections.*`, `solarch.collection(id).*`).
2. **Admin-Only Operations** (Installer, Settings, AI, Logs, Backups) are placed in `admin/src/lib/admin-api.ts` and layered strictly on `solarch.http.*`. They do not duplicate authentication, URL resolution, JSON parsing, or error classification.
