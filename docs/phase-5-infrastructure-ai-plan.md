# Phase 5: Infrastructure & AI Implementation Plan

## Recommended Implementation Order
The phases are structured to tackle the highest security risks first (Settings), followed by data visibility (Logs, Backups), and finally iterative UX enhancements (AI Assistant).

1. **Phase 5B — Settings**: Fixes the P0 security vulnerability of plaintext secrets being exposed.
2. **Phase 5C — Logs**: Enhances backend search and frontend usability for infrastructure monitoring.
3. **Phase 5D — Backups**: Implements the critically missing safe restore workflow.
4. **Phase 5E — AI Assistant**: Upgrades the AI UX and fixes backend memory amnesia.

---

## Phase 5B — Settings
**Objective**: Secure the API keys, add React Query, and unify the visual design.

### Backend Changes
- **`src/apis/settings.ts`**:
  - `GET /api/settings`: Map over the returned settings and mask sensitive fields (`jwtSecret`, `smtp.password`, `s3.secret`, `ai.apiKey`) replacing them with `********`.
  - `PATCH /api/settings`: Check incoming payload. If a sensitive field equals `********`, drop it from the patch payload to avoid overwriting the actual secret with asterisks.
  - Test endpoints (`test/email`, `test/s3`, `ai/test`): Accept configuration overrides in the `req.body` to permit testing *without* requiring the user to save first.

### Frontend Changes
- **`admin/src/pages/Settings.tsx`**:
  - Convert to React Query (`useQuery` for fetch, `useMutation` for patch).
  - Adopt Phase 4C unified layout (using Dialogs, Toasts, and strict spacing).
  - Add dirty-state tracking (disable "Save" button if unchanged).
  - Test buttons should pass current form state to test endpoints.

---

## Phase 5C — Logs
**Objective**: Build a production-grade log stream and search interface.

### Backend Changes
- **`src/apis/logs.ts`**:
  - `GET /api/logs`: Add a `?search=` parameter. Update the SQL query to perform a `LIKE %?%` on the `message` (and potentially `data`) columns.
  - Optimize `SELECT COUNT(*)` to only count when absolutely necessary, or accept that search counts will be slightly slower.

### Frontend Changes
- **`admin/src/pages/Logs.tsx`**:
  - Convert to React Query (`useQuery` with `keepPreviousData: true` for smooth pagination).
  - Add a keyword search input box.
  - Add a "Log Detail" Dialog: clicking a log row opens a `<Dialog>` showing the full payload, including the `data` column formatted as JSON using JetBrains Mono.

---

## Phase 5D — Backups
**Objective**: Implement the missing Restore flow safely.

### Backend Changes
- No structural changes required. The `POST /api/backups/:key/restore` endpoint already exists and works (albeit blocking).

### Frontend Changes
- **`admin/src/pages/Backups.tsx`**:
  - Convert to React Query (`useQuery` for fetch, `useMutation` for create/delete).
  - Add a "Restore" button to the Actions column.
  - Build a `RestoreDialog`:
    - Requires the user to type the exact backup name to confirm.
    - Warns: "This will overwrite your current database. All current connections will be terminated."
  - Upon successful restore, trigger a hard reload (`window.location.reload()`) to refresh the admin state.

---

## Phase 5E — AI Assistant
**Objective**: Provide conversational memory and modernize the interface.

### Backend Changes
- **`src/apis/ai.ts` & `src/ai/service.ts`**:
  - Update `POST /api/ai/chat` to accept `{ messages: { role: string, content: string }[] }` instead of a single `message` string.
  - Pass the entire context array to the LLM Provider so it can answer follow-up questions.

### Frontend Changes
- **`admin/src/pages/AIAssistant.tsx`**:
  - Update API call to send the full `messages` array from `currentChat.messages`.
  - Migrate state management into standard React Query patterns where applicable.
  - Ensure the layout remains strictly flex-based (Phase 4C compliant).

---

## Definition of Done
1. **Security**: `GET /api/settings` never leaks plaintext secrets.
2. **Architecture**: Settings, Logs, Backups, and AI use `React Query`.
3. **Capabilities**: Logs are searchable, Backups can be restored, AI can remember conversation history.
4. **Visuals**: All layouts remain consistent with the Solarch Design System established in Phase 4C.
5. **Quality**: No TS compilation errors, successful Vite build.
