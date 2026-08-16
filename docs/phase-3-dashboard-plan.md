# Phase 3A — Solarch Admin Dashboard Implementation Plan

## Executive Summary

The Solarch Admin Dashboard will be redesigned into a high-density, professional developer infrastructure console. This redesign resolves a critical `O(N)` network request bottleneck by introducing a dedicated `/api/metrics` backend endpoint, leverages React Query for efficient data fetching, and replaces generic floating cards with a flat, compact structural panel using Phase 1 primitives.

## Repository Findings

### Current Dashboard Architecture
- **Location**: `admin/src/pages/Dashboard.tsx`.
- **Data Fetching**: Pure `useEffect` and `useState`. No caching, manual `async/await` loops.
- **UI Structure**: Relies on legacy CSS classes (`.stat-grid`, `.stat-card`, `.action-grid`, `.welcome-banner`).

### Current Data Flow & N+1 / Performance Audit
The Phase 0 audit's N+1 concern is **confirmed active in the current implementation.**
The Dashboard data flow is:
1. `GET /api/collections` (1 request)
2. `for (const c of collections.items)`:
   - `GET /api/collections/${c.id}/records?page=1&perPage=1&skipTotal=false` (N requests)

**Browser/Network Complexity**: `O(N)` HTTP requests, where N is the number of collections.
**Practical Impact**:
- **0–10 collections**: 1 to 11 requests. Fast, barely noticeable.
- **100 collections**: 101 concurrent requests. Exhausts the browser's connection pool, causing severe blocking and UI freezing.
- **1000 collections**: 1001 concurrent requests. Effectively crashes the dashboard rendering process and triggers API rate limits.

### Collection → SQLite Table Mapping
- Collections are backed by SQLite tables dynamically named `_r_${collection.id}`.
- To prevent SQL injection, the codebase uses `quoteIdentifier(tableName)` from `src/utils/sql_safe.ts`.
- The database abstraction natively handles querying these tables, but there is currently no batch count endpoint.

### Backend API Inventory
Existing APIs that can provide Dashboard data:
- `/api/collections` — returns schemas, but not record counts.
- `/api/logs/stats` — returns counts of logs grouped by severity level (e.g., `info`, `error`).
- `/api/health` — returns basic DB connection status.
- `/api/backups` — returns a list of backups.

## New API Requirement: `/api/metrics`

To eliminate the `O(N)` browser bottleneck, the Dashboard must not perform O(N) network requests. A dedicated aggregation endpoint is genuinely necessary.

**Endpoint Specification:**
- **Route**: `GET /api/metrics`
- **Auth**: `requireSuperuserAuth`
- **Response**:
  ```json
  {
    "totalCollections": 12,
    "totalRecords": 45102,
    "totalAuthUsers": 1420
  }
  ```

**Backend Query Strategy & Performance Model:**
- **Network Profile**: `O(1)` HTTP request.
- **Database Profile**: `O(N)` database queries. The backend will loop over `app.findAllCollections()` and execute `SELECT COUNT(*) FROM {quoted_table}` for each physical collection.
- **Security**: The table identifiers must **only** originate from server-side collection metadata (`collection.id`), never from client input. The table name must be constructed securely as `_r_${collection.id}` and quoted using `quoteIdentifier()`. No raw user input will be interpolated into the SQL.
- **Caching**: No caching will be introduced in the backend at this time. While `O(N)` database queries remain, running them sequentially within a single HTTP request eliminates the severe browser connection latency.

## Metric Semantics

- **totalCollections**: The total count of all collections returned by `app.findAllCollections()`. This includes exactly collections of `type === 'base'`, `type === 'auth'`, and `type === 'view'`.
- **totalRecords**: The sum of `COUNT(*)` across all explicitly defined physical collections (`type === 'base'` and `type === 'auth'`). View collections (`type === 'view'`) and internal system collections (e.g., `_collections`, `_superusers`) are explicitly excluded.
- **totalAuthUsers**: The sum of `COUNT(*)` across all collections where `type === 'auth'`. This includes all records in those tables (including disabled or unverified users).
- **Logged Errors**: The total number of `error` level logs. Based on the current implementation of `/api/logs/stats` (which groups all logs without a time filter), this represents the **all-time** count of error logs retained in the database.

## Proposed Dashboard Information Architecture

### P0 (Essential — Phase 3)
1. **Page Header**: Title ("Dashboard") and contextual welcome message if empty.
2. **Overview Strip**: A compact, high-density horizontal panel containing metric blocks for Collections, Records, Auth Users, and Logged Errors.
3. **Quick Actions Panel**: Direct links to primary administrative flows.

### Deferred (Not in Phase 3)
- **Recent Activity**: The codebase does not currently expose a structured audit event stream. We will **not** fabricate a recent activity feed.

## Empty State Semantics
- **Condition**: `totalCollections === 0`. This signifies that no user-defined (`base`, `auth`, or `view`) collections exist yet.
- **Design**: Uses the Phase 1 `EmptyState` primitive.
- **Content**: A short, precise explanation with one primary button: "Create First Collection" (linking to `/collections`).
- **Constraint**: No giant banners, no multi-step wizards. Keep it lightweight and structural.

## Visual Design Specification
- **Metric Visual Structure**: Avoid four large floating Tailwind cards, which lean toward a generic SaaS template look. Instead, use a single, unified `Panel` primitive (from Phase 1) containing a flex or grid strip of metric blocks. This reinforces the high-density infrastructure console aesthetic.
- **Surfaces**: `bg-bg-surface border-border-subtle`. No heavy shadows or decorative gradients.
- **Typography**: Strictly Phase 1 system fonts. No oversized hero numbers.
- **Colors**: Restrained. Semantic colors (`success`, `warning`, `error`) used only where data justifies it (e.g., Logged Errors > 0 might color the error icon).

## Quick Actions
A structured panel containing compact links or buttons:
- Manage Collections
- System Settings
- View Logs

## React Query Architecture & Partial Failure

Introduce `admin/src/hooks/useDashboardData.ts` containing separate hooks:
- `useMetrics()`: Fetches `/api/metrics`.
- `useLogStats()`: Fetches `/api/logs/stats`.
- **Configuration**: `staleTime: 60000` (1 minute), `refetchOnWindowFocus: true`, `retry: 1`.

**Partial Failure Behavior:**
- The Dashboard shell and Quick Actions must render and remain functional immediately.
- If `useMetrics()` succeeds but `useLogStats()` fails: Collections, Records, and Auth Users are displayed normally. The Logged Errors metric block falls back to an inline Phase 1 `ErrorState` ("Failed to load").
- If `useMetrics()` fails but `useLogStats()` succeeds: Error count displays normally. The other three metrics show an inline `ErrorState`.
- No global blocking error boundaries or `alert()` dialogues will be used.

## Loading States
- **Remove full-page spinner**.
- Apply `Skeleton` primitives specifically to the numerical values inside the metric blocks. The layout structure renders instantly while data fetches.

## Responsive Strategy
- **≥ 1024px (lg)**: Overview strip displays 4 columns horizontally. Quick Actions panel positioned below.
- **768px – 1023px (md)**: Overview strip wraps to a 2x2 grid to maintain density.
- **< 768px (sm)**: Overview strip stacks vertically (1 column). Page padding scales down.

## Accessibility
- Use semantic `<section>` and `<header>` tags.
- Provide `aria-hidden="true"` on decorative Lucide icons.
- **Loading Skeletons**: Avoid noisy `aria-live` announcements for every skeleton pulse. Use `aria-busy="true"` on the parent section until data completes loading.
- Ensure keyboard focus states are visible for Quick Action links.

## Security
- `/api/metrics` is strictly protected by `requireSuperuserAuth`.
- Table identifiers must derive solely from server-controlled metadata (`app.findAllCollections()`).
- Dynamic SQL table execution is protected by `quoteIdentifier()`.
- The endpoint exposes only aggregate counts; no raw record data or PII is returned.

## Exact File Scope

### NEW
| File | Purpose |
|---|---|
| `src/apis/metrics.ts` | Backend endpoint for aggregated counts. |
| `src/apis/__tests__/metrics.test.ts` | Tests for the new metrics endpoint. |
| `admin/src/hooks/useDashboardData.ts` | React Query hooks for the dashboard. |

### MODIFY
| File | Reason |
|---|---|
| `src/apis/serve.ts` | Register the `metrics.ts` router. |
| `admin/src/pages/Dashboard.tsx` | UI rewrite using Phase 1 primitives. |

### UNCHANGED
- `admin/src/index.css` (Legacy CSS untouched).
- All `admin/src/components/layout/*` (AppShell untouched).
- All other pages (Collections, Settings, Logs, Backups, AI, Login).

## Dependency Changes
**None.** Uses existing Tailwind, Lucide, React Query, and CVA.

## Implementation Order
1. **Backend API**: Create `src/apis/metrics.ts`, handle dynamic table quoting securely, and register it.
2. **Backend Tests**: Create `src/apis/__tests__/metrics.test.ts`.
3. **Frontend Hooks**: Create `useDashboardData.ts`.
4. **Dashboard Structure**: Rewrite `Dashboard.tsx` applying the empty state, single unified panel strip, and Skeletons.
5. **Data Integration**: Connect hooks to the UI; implement partial failure ErrorStates.
6. **Verification**: Run comprehensive testing suite.

## Verification Plan
1. **Typecheck**: `npx tsc --noEmit`
2. **Build**: `npm run build`
3. **API Tests**: Run backend tests ensuring `/api/metrics` strictly returns 401/403 for unauthenticated access, and correctly aggregates records (ignoring views/system tables).
4. **Performance/Network Verification**:
   - Open Network tab. Verify the Dashboard makes the minimum number of independently useful requests (target: 2).
   - Test against **0 collections**, **1 collection**, **10 collections**, and **100 collections** (if supported by a mock script). Verify network requests remain `O(1)`.
5. **Functional Testing**:
   - Empty database -> Verify "No Collections" empty state appears.
   - Database with data -> Verify `totalRecords` and `totalAuthUsers` are accurate.
6. **Partial Failure**: Block `/api/metrics` in the network tab. Verify the ErrorState appears gracefully and Logged Errors still load.
7. **Responsive**: Verify 4-col at 1024px, 2-col at 768px, 1-col on mobile.
8. **Regression**: Verify other pages function and AppShell layout remains completely unaffected.

## Definition of Done
- O(N) network bottleneck eliminated.
- Dashboard redesigned as a high-density console without excessive floating cards.
- React Query manages data fetching, caching, and partial failure states.
- Metric semantics precisely match documented backend reality.
- No fake activity or status indicators.
- Skeletons do not spam screen readers.
- Zero new dependencies added.
- Backend tests verify authentication and SQL safety of `/api/metrics`.
- All non-Dashboard UI files remain unchanged.
