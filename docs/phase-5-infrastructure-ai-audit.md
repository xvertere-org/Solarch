# Phase 5A — Infrastructure & AI Audit

## 1. Executive Summary
The Solarch Admin UI's architecture (Settings, Logs, Backups, and AI Assistant) currently relies on functional but basic React state management without React Query. More critically, the backend requires several targeted additions to meet production-grade standards, including fixing a critical security flaw in the Settings API, adding search capabilities to Logs, enabling the Backup restore flow, and giving the AI Assistant conversation history. 

## 2. Current Architecture
- **Settings**: React state holding a massive JSON object. The backend saves to a SQLite `_settings` table.
- **Logs**: Simple `page`/`perPage` fetching. The backend queries the `_logs` table. 
- **Backups**: Standard `fs` file operations wrapping `.zip` creation. The backend handles creation/deletion/restoration via blocking HTTP requests.
- **AI Assistant**: A chat interface that stores conversation history locally in `localStorage`, but only sends the latest message to the backend. 
- **State Management**: `useEffect` and `useState` everywhere; no `React Query`.

## 3. Settings Audit
- **Schema**: Supports `appName`, `appURL`, `jwtSecret`, `smtp`, `s3`, `ai`, etc.
- **Endpoints**: `GET /api/settings`, `PATCH /api/settings`, `POST /api/settings/test/email`, `POST /api/settings/test/s3`.
- **Frontend Behavior**: `Settings.tsx` binds directly to the loaded object. No dirty-state protection. 
- **Testing Constraints**: Test endpoints (`test/email`, `test/s3`, `ai/test`) use the *saved* settings. A user cannot test a configuration before saving it.
- **Security Flaw**: `app.settings()` stores decrypted secrets in memory, and `GET /api/settings` returns `res.json(app.settings())`. **All API keys and secrets are returned in plaintext to the frontend.**

## 4. Logs Audit
- **Storage**: `_logs` table (SQLite). 
- **Endpoints**: `/api/logs`, `/api/logs/stats`.
- **Backend Capabilities**: Supports pagination (`page`, `perPage`) and exact-match `level` filtering.
- **Missing Backend**: Does NOT support keyword search, time-range filtering, or sorting (hardcoded to `created DESC`). Does not support fetching individual log details.
- **Missing Frontend**: Does not display the `data` column. No search input.

## 5. Backups Audit
- **Storage**: Local filesystem inside `dataDir/backups` as `.zip`.
- **Endpoints**: `GET /api/backups`, `POST /api/backups`, `POST /api/backups/:key/restore`, `DELETE /api/backups/:key`.
- **Backend Capabilities**: Creation and restoration block the HTTP request (no background job system).
- **Missing Frontend**: The Phase 0 audit is still correct: **there is no Restore button/workflow in the UI**. The API exists, but the frontend lacks it. 
- **Safe Restore Workflow Design**:
  1. Click "Restore" on a backup.
  2. Dialog opens warning about total data loss/overwrite.
  3. User types the backup name to confirm.
  4. UI triggers `POST /api/backups/:key/restore`.
  5. On success, trigger full app reload (`window.location.reload()`) to clear caches.

## 6. AI Architecture Audit
- **Storage/Persistence**: Handled entirely in frontend `localStorage` (`ai-chat-sessions`).
- **Endpoint**: `POST /api/ai/chat` accepts `{ message }`.
- **Missing Backend Capability**: The backend does NOT accept conversation history. Every chat request is isolated. The LLM only sees the system prompt + the single latest message. 
- **UX Direction**: A global Command Palette (Cmd+K) should eventually replace the dedicated page for contextual assistance, though the page can remain as a sandbox.

## 7. Authentication Audit
- **Token Lifecycle**: JWT-based, stored locally.
- **Storage Key**: Still uses legacy `tb_admin_auth` inside `App.tsx`.
- **Backend Authorization**: `requireSuperuserAuth` correctly protects all admin API routes. 

## 8. React Query Audit
Currently, none of the infrastructure modules use React Query. 
- **Settings**: Needs `useQuery` for fetching, `useMutation` for patching and testing.
- **Logs**: Needs `useQuery` with pagination keys (`['logs', page, level, search]`) and `keepPreviousData: true`.
- **Backups**: Needs `useQuery` for fetching, `useMutation` for create/delete/restore.
- **AI**: Does not necessarily need React Query for chat (local state is fine for real-time messaging), but action buttons (generate schema) could use `useMutation`.

## 9. Security Findings
- **[P0 - CRITICAL] Plaintext Secrets Leak**: `GET /api/settings` returns decrypted SMTP passwords, S3 secrets, and JWT secrets to the client. The backend must mask these values (e.g., `********`) on read, and ignore the mask on `PATCH` if unchanged.
- **[P3 - LOW] Unsanitized Log Payloads**: Existing database data in `_logs` might contain secrets if a previous process wrote them.

## 10. Performance Findings
- **N+1 / Blocking Ops**: Backups and restores block the HTTP response. For large SQLite databases, this will cause 504 Gateway Timeouts. 
- **Table Scans**: Logs pagination uses `SELECT COUNT(*) FROM _logs`, which forces a full table scan. 

## 11. Missing Capabilities Matrix
| Module | Missing capability | Frontend only | Backend required | Priority |
|--------|-------------------|---------------|------------------|----------|
| Settings | Secret Masking | No | Yes | P0 |
| Settings | Test before save | No | Yes | P2 |
| Logs | Keyword Search | No | Yes | P1 |
| Logs | Log detail / payload view | Yes | No | P2 |
| Backups| Restore UI / Workflow | Yes | No | P1 |
| AI | Conversation History Context | No | Yes | P1 |

## 12. Frontend/Backend Dependency Matrix
- **Settings UI Rewrite** -> Requires `GET /api/settings` secret masking.
- **Logs Search UI** -> Requires `GET /api/logs?search=...` backend support.
- **Backups Restore UI** -> Requires no new backend endpoints (exists), just frontend integration.
- **AI UX** -> Requires backend `chat` endpoint to accept `messages: {role, content}[]`.
