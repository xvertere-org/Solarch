# Phase 4 — Collections + Records

## Executive Summary

Phase 4 undertakes the core of the Solarch Admin interface: the database management experience. The goal is to transform the legacy `Collections` and `Records` pages from generic, card-heavy CRUD screens into a high-density, professional developer infrastructure console. This redesign will establish a precise, technical aesthetic using Phase 1 primitives, the official Solarch typography, and Tailwind v4. It introduces scalable data grids, a robust schema inspector, proper Dialog and Toast primitives, and comprehensive React Query architecture—all fully compatible with the Phase 2 AppShell.

## Repository Findings

### Current UX Audit

- **Collections (`Collections.tsx`)**: 
  - **Visuals**: Uses legacy `.card`, `.table-wrapper`, and `.badge` classes. Extensive padding leads to low information density.
  - **Controls**: A generic modal for collection creation. No ability to sort or filter collections easily.
  - **Problems**: Visually indistinct from generic admin templates. Does not convey "database management."
- **Collection Detail (`CollectionDetail.tsx`)**:
  - **Schema Editor**: Uses basic inputs and native `<select>` dropdowns for field types. No drag-and-drop; adding/removing fields feels primitive and error-prone.
  - **API Rules**: Plain text inputs for rules like `listRule` or `createRule`.
- **Records (`Records.tsx`)**:
  - **Data Grid**: A standard HTML `<table>`. Limits to exactly 4 non-system fields regardless of available width.
  - **Cell Rendering**: Simplistic text casting (`JSON.stringify` truncated to 40 chars, `slice(0,60)` for strings). Breaks visually on complex nested data.
  - **Pagination**: Basic prev/next buttons.
  - **Modals**: Record creation uses a crude generic modal that iterates fields and maps them to `<input>` tags.
- **Record Detail (`RecordDetail.tsx`)**:
  - **Editor**: Enormous, undifferentiated form. Textareas for JSON with a fragile `try/catch JSON.parse` inline event handler. No contextual help or clear layout structure.
- **Destructive Actions**: Both collections and records use blocking browser `confirm('Delete this...')` which is a major UX flaw.

## Current Data Architecture

- **Collections**: Fetched via `GET /api/collections`. The backend provides `name`, `type`, `system`, `fields`, `indexes`, `listRule`, `viewRule`, etc.
- **Records**: Fetched via `GET /api/collections/:id/records?page=X&perPage=Y&filter=Z`.
- **Mutations**: Standard RESTful operations (`POST`, `PATCH`, `DELETE` on collections and records). Schema sync triggers on collection save.
- **React Query**: Not currently used for Collections/Records. The implementation relies entirely on raw `useEffect` and `useState` loops.

## Solarch Collections/Records Visual Language

The visual specification mandates a premium, technical database console aesthetic. 

- **Typography**:
  - **Major Headings**: `font-display` (Syne) for page titles and major structural headings.
  - **UI / Body / Controls**: `font-sans` (DM Sans) for all labels, buttons, and table data.
  - **Technical Values**: `font-mono` (JetBrains Mono) for IDs, JSON, SQL, dates, and database properties.
- **Surfaces & Borders**:
  - **Backgrounds**: Flat `bg-bg-primary` for the canvas, `bg-bg-surface` for structured panels.
  - **Borders**: Thin, sharp 1px borders (`border-border-subtle`). Rounded corners should be extremely restrained (e.g., `rounded-md` maximum for panels, `rounded` for small inputs). Avoid pill-shapes unless explicitly defined for Badges.
- **Spacing**:
  - **Compact page spacing**: Tighten horizontal padding compared to standard SaaS apps. Max-width constraints should allow edge-to-edge data tables.
  - **Restrained section spacing**: Minimize gaps between headers, filters, and data tables (`gap-4` or `mb-4`).
- **Interactive States**:
  - **Hover**: Subtle `bg-bg-surface-hover`. No floating shadows.
  - **Selected**: Light semantic tint (e.g., `bg-brand-primary/10`).
  - **Focus**: Hard 2px solid ring (`focus:ring-2 focus:ring-brand-primary`), zero offset.
- **Accent Usage**:
  - **Solarch Orange**: Used sparingly for primary CTA buttons, active tabs, and Auth collection badges. Do NOT overuse.
- **Destructive Styling**:
  - Pure red text (`text-status-danger`) or subtle red background tints (`bg-status-danger/10`) for dangerous actions, rather than solid red buttons for non-primary destructive flows.

## Collections Information Architecture

The Collections page relies on a dense data list to prioritize schema visibility.

- **Page Header**: Title ("Collections"), Collection Count badge, and the primary "New Collection" CTA.
- **Search**: A 100% width (or large fixed-width) input above the list filtering `name` and `type` client-side, debounced at 300ms.
- **Table Structure**:
  - **Name**: Bold `DM Sans`.
  - **Type**: Specific badge (see below).
  - **Field Count**: Calculated from `fields.length` (available in the payload).
  - **System Status**: Explicit "System" badge.
  - **Actions**: View Records (Primary ghost), Edit Schema (Ghost), Delete (Destructive ghost).
- **Row Interaction**: Hover highlights the row. Clicking the primary identifier (Name) routes to the Collection Detail (Schema) page. Do not make the entire row ambiguously clickable.
- **Record Counts**: Explicitly excluded from the list to preserve `O(1)` frontend efficiency, per Phase 3 conclusions.

## Collection Types

The UI must immediately distinguish the three core `CollectionType` values:

- **Base (Regular Data)**: Neutral `Badge` (`bg-bg-elevated text-text-primary`), `Database` icon.
- **Auth (User Accounts)**: Solarch Orange `Badge` (`bg-brand-primary/10 text-brand-primary`), `Users` icon. Exposes `authOptions` in schema.
- **View (Read-Only)**: Muted Blue `Badge` (`bg-status-info/10 text-status-info`), `Eye` icon.
  - **Behavior**: Schema editing is disabled. Replaced entirely by a structured `viewOptions.query` SQL viewer (using JetBrains Mono). Records are read-only (Create/Update/Delete buttons vanish).

## System Collections

System collections (e.g., internal migrations, admin records) demand strict UI constraints:
- **Visuals**: A distinct "System" badge.
- **Restrictions**: Name, type, and system-defined fields are strictly immutable (inputs disabled). Deletion action disappears entirely. Records can be viewed, but structural deletion of the collection is disabled.

## Collection Detail Navigation

The detail page utilizes a lightweight tab structure to prevent vertical exhaustion:
1. **Schema**: The field builder and core configuration. The primary developer workspace.
2. **API Rules**: Independent tab for access control. Keeps the schema view clean.
3. **Options**: Appears only for specific types (e.g., `authOptions` for Auth collections).

## Schema Builder / Inspector

A robust, dense table replacing the legacy generic inputs. 
- **Field Row**: Contains Name (input), Type (Select), Required (checkbox). System fields lock to the top, fully disabled. 
- **Expanded Properties**: Clicking a field row expands a secondary panel inline (or side drawer) exposing advanced properties: `unique`, `default`, `constraints`, `relation` configuration, `indexes`, and `validation`. 
- **Unsaved Changes**:
  - **Dirty State**: Modifying any field activates a sticky "Save Changes" / "Discard" action bar.
  - **Protection**: Navigating away with unsaved changes throws a warning Dialog. Changes are never silently discarded.
  - **Loading/Errors**: Saving triggers mutation loading state; server errors map back to specific field validation if possible.

## API Rule Editing

- **Implementation**: Plain text inputs with JetBrains Mono typography for `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.
- **UX**: Retain standard `<input>` elements but styled as technical code fields (`font-mono bg-bg-surface-hover border-border-strong px-3 py-2`). No Monaco/CodeMirror dependencies added.

## Records Data Grid

A high-performance, developer-grade data grid tailored for large schemas.
- **Row Height**: Dense `36px` to `40px` height.
- **Horizontal Scrolling**: Enforced via `overflow-x-auto` on the table wrapper. No forced field truncation to 4 columns. 
- **Column Strategy**: All non-system fields are rendered by default. Sticky `<thead>` for vertical scrolling.
- **Row Interaction**: Hover state active. Clicking the primary ID routes to the Record Editor. A separate "Edit" icon action exists on the right edge.
- **Pagination**: Dense pagination strip at the bottom (`default page size: 50`). Supports Next/Prev, calculating `totalPages` from backend `totalItems`. Does not fetch all records.

## Data Cell Rendering

Semantic renderers ensure complex values do not destroy table layouts:
- **String**: `max-w-[200px] truncate`.
- **Boolean**: Compact dot (Green for True, Muted for False) and label.
- **Date**: Formatted string in `text-text-secondary`.
- **ID / Relation**: `font-mono text-xs text-text-tertiary`.
- **JSON / Object**: A muted `{...}` pill. Clicking opens a JSON Value Dialog.
- **Null**: Muted em-dash (`—`).

## JSON Value Dialog

- **Trigger**: Clicking a JSON cell in the Data Grid.
- **Content**: A lightweight `Dialog` rendering formatted `JSON.stringify(val, null, 2)` inside a scrollable `<pre>` tag with `font-mono`.
- **Features**: Read-only by default. Max height `70vh`. Includes a "Copy" button.

## Record Detail / Editor

- **Desktop Structure**: Two-column layout. The left column (70%) houses standard field inputs; the right column (30%) houses structural metadata (ID, Created, Updated, Collection Type).
- **Mobile Structure**: Stacks vertically.
- **Controls**: Checkboxes for booleans, Mono textareas for JSON fields (with basic syntax validation on blur), standard inputs for strings. 

## Destructive Actions & Dialog Primitive

- **Dialog Primitive**: A reusable, headless-style component (`Dialog`, `DialogHeader`, `DialogTitle`, `DialogContent`, `DialogFooter`).
  - Supports focus traps, Escape key dismissal, overlay clicks, and `aria-modal="true"`.
- **Destructive Flow**: Replaces all `confirm()` calls. Requires the user to explicitly click a red "Delete" button inside the Dialog.

## Feedback / Toasts

- **Toast Primitive**: A lightweight notification queue rendering fixed at `bottom-4 right-4`.
- **Design**: Success (Green border/icon), Error (Red border/icon).
- **Behavior**: Auto-dismisses after 4000ms. Persistent close button. Screen-reader accessible (`aria-live="polite"` or `assertive`). Eliminates all `alert()` usage.

## Search Debounce

- **Strategy**: Search inputs use a `300ms` debounce before triggering React Query invalidation/refetches. 
- **Justification**: 300ms perfectly balances typing fluidity with API protection, matching the standard debounce rate for database text queries on the backend without overwhelming SQLite.

## React Query Architecture

Transitioning from raw `useEffect` loops to strict, cached query architecture.

**Queries**:
- `useCollections()`: Keys `['collections']`. 
- `useCollection(id)`: Keys `['collections', id]`.
- `useRecords(collectionId, page, filter)`: Keys `['records', collectionId, page, filter]`. `staleTime: 10000ms`.

**Mutations**:
- `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`: Invalidates `['collections']`.
- `useCreateRecord`, `useUpdateRecord`, `useDeleteRecord`: Invalidates `['records', collectionId]`.

All API logic belongs inside `admin/src/hooks/`, strictly separating data fetching from UI rendering.

## Mobile UX Breakpoints

- **768px (Tablet)**:
  - **Data Grid**: Requires horizontal scrolling. Sticky first column (ID) if feasible via CSS.
  - **Record Detail**: Two-column layout collapses to a single stacked vertical flow.
- **480px (Mobile)**:
  - **Collections List**: Table rows transform into condensed block layouts (Name top, Type badge right, Actions below) to avoid microscopic table cells.
  - **Schema Builder**: Field rows stack their inputs (Name above Type above Required).

## Visual Acceptance Criteria

The final implementation must pass this checklist:
- [ ] Looks undeniably like the same product as Phase 2 AppShell and Phase 3 Dashboard.
- [ ] Incorporates Syne, DM Sans, and JetBrains Mono precisely according to the spec.
- [ ] Uses orange accents sparingly (only for primary CTAs and Auth badges).
- [ ] Avoids legacy "card-everywhere" padding bloat, replacing it with dense `border-border-subtle` separators and flat panels.
- [ ] Row heights sit between 36px–40px, ensuring high information density without feeling cramped.
- [ ] Controls (inputs, buttons) are compact (32px–36px height).
- [ ] Visually distinct representation for Base, Auth, and View collections.

## Implementation Safety

- **Scope**: Modifies **ONLY** Collections and Records files. 
- **Integrity**: Dashboard, AppShell, Settings, Logs, Backups, AI Assistant, and Login must remain completely untouched.
- **Dependencies**: No external grid libraries (e.g., AG Grid, React Table), Code editors (Monaco), or modal/toast libraries (Toastify, SweetAlert) will be installed. Everything uses native React, Lucide, and Tailwind.

## Exact File Changes

**MODIFY**:
- `admin/src/pages/Collections.tsx`
- `admin/src/pages/CollectionDetail.tsx`
- `admin/src/pages/Records.tsx`
- `admin/src/pages/RecordDetail.tsx`

**NEW**:
- `admin/src/components/ui/Dialog.tsx`
- `admin/src/components/ui/Toast.tsx`
- `admin/src/hooks/useCollections.ts`
- `admin/src/hooks/useRecords.ts`

## Implementation Order

1. **Primitives**: Build `Dialog` and `Toast`.
2. **Data Layer**: Implement React Query hooks (`useCollections`, `useRecords`, and all related mutations).
3. **Collections List**: Rewrite `Collections.tsx` using dense grid and search debounce.
4. **Collection Editor**: Rewrite `CollectionDetail.tsx` with tabs, strict system protections, and dirty-state tracking.
5. **Records Grid**: Rewrite `Records.tsx` with horizontal scrolling, pagination, and semantic cell renderers.
6. **Record Editor**: Rewrite `RecordDetail.tsx` with the two-column metadata structure.
7. **Verification**: Run comprehensive UX, responsive, and data tests.

## Definition of Done

- Functional correctness achieved across all CRUD operations.
- Visual consistency matches the high-density Solarch console aesthetic (Phase 3).
- Responsive behavior gracefully handles 768px and 480px breakpoints.
- Accessibility standards met (forms, focus traps, aria-roles).
- Performance limits respected (no full-table fetching, no N+1 collection counts).
- Zero instances of browser `alert()` or `confirm()`.
- Zero legacy CSS classes utilized in the migrated pages.
- Zero regressions to Phase 3 Dashboard or the Phase 2 AppShell.
- Repository compiles cleanly (`tsc --noEmit`).
