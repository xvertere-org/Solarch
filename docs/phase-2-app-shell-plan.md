# Phase 2 — Solarch Admin App Shell + Navigation

## Executive Summary

This plan replaces the current generic Layout component with a new Solarch-branded AppShell built entirely on the Phase 1 design tokens and Tailwind utilities. The existing page content will render unchanged inside the new shell. The shell introduces responsive behavior (desktop, tablet, mobile), a redesigned sidebar with navigation groups, a compact topbar, and a user menu — all using the established Solarch visual identity.

## Repository Findings

### Current Shell Architecture

The shell consists of exactly **two files**:

1. **[Layout.tsx](file:///d:/Solarch/admin/src/components/Layout.tsx)** (88 lines): A single React component containing the sidebar, topbar, and main content wrapper. It receives `onLogout` and `admin` props from `App.tsx`.
2. **[index.css](file:///d:/Solarch/admin/src/index.css)** (lines 50–130): Legacy CSS classes `.admin-layout`, `.sidebar`, `.sidebar-header`, `.sidebar-nav`, `.sidebar-footer`, `.main-content`, `.top-bar`, `.page-content`.

**Layout.tsx import verification:** Only imported by `App.tsx` (line 3: `import Layout from './components/Layout'` and lines 68/81 for JSX usage). No other files reference it. Safe to delete.

### Current Routing

[App.tsx](file:///d:/Solarch/admin/src/App.tsx) uses `BrowserRouter` with `basename="/_/"`. Authentication state is managed via `useState` with `localStorage` key `tb_admin_auth`. When unauthenticated, `<Login />` renders outside the shell. When authenticated, `<Layout>` wraps all routes.

### Current Navigation Data

```typescript
const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/collections', icon: Database, label: 'Collections' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/backups', icon: Archive, label: 'Backups' },
  { path: '/ai', icon: Bot, label: 'AI Assistant' },
]
```

### Active Route Detection

Current implementation: exact path match only (`location.pathname === item.path`). This means `/collections/abc` does NOT highlight the Collections nav item — a bug.

### User Information

- Source: `auth.admin` object from `App.tsx`, containing `{ id, username }`.
- Display: Username shown in sidebar footer. Avatar shows first character of username.
- Logout: Clears `tb_admin_auth` from localStorage, resets API token, sets auth to null.

### Responsive Behavior

**None.** The sidebar is a fixed 240px with no media queries. The layout breaks on screens narrower than ~800px.

### Scroll Behavior Audit

- **Shell:** `.main-content` has `overflow: hidden`. `.page-content` has `overflow-y: auto` — this is the primary scroll container.
- **AI Assistant:** `.chat-container` uses `height: calc(100vh - 140px)` with `.chat-messages` having `overflow-y: auto`. This page manages its own internal scroll.
- **Logs/Collections/Records:** Standard tables inside `.page-content`; they scroll with the parent `.page-content` container. `.table-wrapper` has `overflow-x: auto` for horizontal table overflow.
- **Settings:** A single tall form; scrolls via `.page-content`.
- **Modals:** `.modal` has `max-height: 85vh` and `overflow-y: auto` — independent scroll, overlaid.

### Stale Branding

`tb_admin_auth` localStorage key exists in `App.tsx` (5 occurrences). This is a legacy TspoonBase artifact but is NOT safe to rename in Phase 2 because it would log out existing users. Document for future migration.

## Route / Navigation Inventory

| Route | Page Component | Current Nav Label | Current Icon | Visible in Sidebar | Group |
|---|---|---|---|---|---|
| `/` | `Dashboard` | Dashboard | `LayoutDashboard` | Yes | Workspace |
| `/collections` | `Collections` | Collections | `Database` | Yes | Workspace |
| `/collections/:id` | `CollectionDetail` | — | — | No (child route) | Workspace |
| `/records/:collectionId` | `Records` | — | — | No (child route) | Workspace |
| `/records/:collectionId/:recordId` | `RecordDetail` | — | — | No (child route) | Workspace |
| `/settings` | `Settings` | Settings | `Settings` | Yes | System |
| `/logs` | `Logs` | Logs | `FileText` | Yes | System |
| `/backups` | `Backups` | Backups | `Archive` | Yes | System |
| `/ai` | `AIAssistant` | AI Assistant | `Bot` | Yes | System |

## Proposed Information Architecture

Two navigation groups:

### 1. **Workspace**
Routes that deal with the core BaaS data.
- Dashboard (`/`)
- Collections (`/collections`)

### 2. **System**
Routes that configure and monitor the infrastructure.
- Settings (`/settings`)
- Logs (`/logs`)
- Backups (`/backups`)
- AI Assistant (`/ai`)

**Rationale:** Only two groups because there are only 6 top-level nav items. More groups would create clutter. "Workspace" captures the user's primary workflow. "System" captures everything operational.

> **Note:** AI Assistant placement under System is provisional. AI navigation placement will be reevaluated during the later AI Assistant redesign phase, when the product may treat AI as a first-class workspace feature or a global utility (e.g., command palette / drawer).

## Sidebar Specification

- **Width (target):** ~220px. Final width will be verified during implementation to ensure the logo, labels, and username fit with correct typography and spacing. Small adjustments (±10px) are acceptable if they produce materially better visual results.
- **Background:** `bg-surface` (`#0D0D16`).
- **Border:** 1px solid `border-subtle` (`#1E1E30`) on the right edge.
- **Logo Area:** ~48px height. Solarch logo (24×24px) + "Solarch" text (system UI sans-serif, 15px, font-semibold, `text-primary`). Separated from nav by `border-subtle` divider.
- **Nav Groups:** Group label rendered as uppercase 11px `text-muted`, letter-spacing 0.05em, with 16px top margin and 4px bottom margin.
- **Nav Item Height:** 36px.
- **Nav Item Icon Size:** 16px.
- **Nav Item Font:** 13px, font-medium.
- **Nav Item Spacing:** 2px gap between items.
- **Nav Item Padding:** 8px horizontal, 8px vertical.
- **Hover State:** `bg-hover` (`#1C1C2A`), `text-primary`.
- **Active State:** `brand-primary-subtle` background, `brand-primary` (`#FF6B00`) text and icon, 2px left border indicator using `brand-primary`.
- **Focus State:** `focus-visible:ring-2 ring-border-strong` (`#2A2A40`).
- **Footer:** Username display with initial avatar, Sign Out button. Separated by `border-subtle`.
- **Collapsed Mode:** Not included in Phase 2. The current 6 nav items fit comfortably.

## Topbar Specification

- **Height:** 48px (reduced from 52px for density).
- **Background:** `bg-void` (`#05050A`) — same as page background for a seamless feel.
- **Border:** 1px solid `border-subtle` on the bottom.
- **Left:** Page title (15px, font-semibold, `text-primary`).
- **Right:** Empty for now. Architectural space exists but no non-functional controls are rendered. Command palette belongs to a later phase.
- **Mobile:** Adds a hamburger menu button on the left (before the page title).

## Page Context / Header Specification

The topbar displays the current page title. Title resolution is handled by a small metadata helper (`navigation.ts`) rather than scattered pathname checks in the Topbar component.

**Resolution logic:**
1. Match the current pathname against navigation items using React Router's `matchPath` utility.
2. For exact top-level routes (e.g., `/collections`): show that route's label.
3. For child routes (e.g., `/collections/:id`, `/records/:collectionId`): show the parent group's label or a contextual label defined in the route metadata.
4. For `/` (Dashboard): exact match only to prevent false positives from prefix matching.

Breadcrumbs are NOT included in Phase 2. Individual page redesigns will add page-specific breadcrumbs.

## User Menu Specification

- **Location:** Sidebar footer.
- **Avatar:** 28×28px circle, `bg-brand-primary` background, first character of `username` in white, 12px font-semibold.
- **Username:** 13px, font-medium, `text-primary`. Truncated with ellipsis.
- **Role Label:** "Admin" in 11px `text-muted` below username.
- **Sign Out:** A ghost button spanning the footer width with `LogOut` icon (14px).
- **No dropdown menu** — the footer already shows all needed actions.

## Responsive Strategy

| Breakpoint | Sidebar | Topbar | Content |
|---|---|---|---|
| `≥1024px` (lg) | Visible, ~220px fixed | Standard (page title only) | Full width minus sidebar |
| `768–1023px` (md) | Hidden, accessible via hamburger | Shows hamburger + page title | Full width |
| `<768px` (sm) | Hidden, accessible via hamburger | Shows hamburger + page title | Full width |

## Mobile Navigation

- **Trigger:** Hamburger `IconButton` in the topbar (left side), visible only below `lg` breakpoint.
- **Implementation:** Self-contained `MobileDrawer` component. No generic Drawer/Dialog abstraction. No new dependencies.
- **Drawer Width:** 280px, slides from left.
- **Overlay:** Semi-transparent black backdrop (`bg-black/50`).
- **Close:** Click overlay, press Escape, or click X button inside drawer.
- **Focus Trapping:** Manual focus management within the drawer using `useEffect` and DOM focus APIs.
- **Body Scroll Lock:** Apply `overflow: hidden` to `document.body` while drawer is open.
- **Navigation:** Clicking a nav item closes the drawer and navigates.
- **Accessible Labels:** `aria-modal="true"`, `role="dialog"`, `aria-label="Navigation menu"`.
- **Reduced Motion:** Slide transition wrapped in `motion-safe:` so it is instant under `prefers-reduced-motion`.

## Content Container

- **Relationship:** `flex: 1`, positioned to the right of the sidebar (desktop) or full-width (mobile).
- **Page Padding:** The new shell does NOT add its own content-area padding. The existing `.page-content` class (from legacy `index.css`) already provides `padding: 24px`. Adding shell padding would double it. Page-level spacing migration belongs to later page redesign phases.
- **Max Width:** None. Developer tools need full horizontal space.
- **Min Width:** 0 with `min-w-0` to prevent flex overflow.

## Scroll Architecture

**Primary scroll owner:** The `<main>` element (the content area that wraps `{children}`). It has `overflow-y: auto` and fills the remaining vertical space below the topbar.

**Fixed elements:** The sidebar and topbar do not scroll. They are either fixed-position or part of a flex layout where only `<main>` scrolls.

**Nested scroll containers (page-owned, not shell-owned):**
- **AI Assistant:** `.chat-container` uses `height: calc(100vh - 140px)` with `.chat-messages` having its own `overflow-y: auto`. This will need adjustment in a future AI redesign phase (the `100vh` assumption may break when the shell height changes), but it is NOT modified in Phase 2.
- **Tables:** `.table-wrapper` uses `overflow-x: auto` for horizontal scroll. Vertical scroll comes from `<main>`.
- **Modals:** `.modal` has `max-height: 85vh` and `overflow-y: auto` — fully independent.

**Rule:** The shell provides exactly one vertical scroll container (`<main>`). Pages may add their own nested scroll only when they have a specific layout requirement (e.g., AI chat). The shell does NOT introduce additional scrollbars.

## Shell States

| State | Behavior |
|---|---|
| **Loading Auth** | Full-screen loading indicator (existing `loading-screen` class). |
| **Unauthenticated** | `<Login />` renders directly, no shell. |
| **Authenticated** | Full shell with sidebar, topbar, and content area. |
| **Mobile Drawer Open** | Overlay sidebar with backdrop, body scroll locked. |

## Component Architecture

### New Components (Phase 2)

| Component | Path | Purpose |
|---|---|---|
| `AppShell` | `components/layout/AppShell.tsx` | Root layout wrapper: sidebar + topbar + content |
| `Sidebar` | `components/layout/Sidebar.tsx` | Desktop sidebar with groups, logo, footer |
| `NavGroup` | `components/layout/NavGroup.tsx` | Group label + child nav items |
| `NavItem` | `components/layout/NavItem.tsx` | Individual navigation link with active state using React Router `matchPath` |
| `Topbar` | `components/layout/Topbar.tsx` | Top header bar, page title from route metadata |
| `MobileDrawer` | `components/layout/MobileDrawer.tsx` | Self-contained mobile sidebar overlay with focus trapping |
| `UserFooter` | `components/layout/UserFooter.tsx` | Avatar + username + sign out |
| `navigation.ts` | `components/layout/navigation.ts` | Navigation config (routes, groups, icons, titles) and route-matching helpers |

### Reused Phase 1 Primitives

- `Button` (for Sign Out)
- `IconButton` (for hamburger trigger, drawer close)
- `Divider` (for sidebar section separators)

### Active Route Matching

`NavItem` will use React Router's `matchPath()` utility to determine active state:
- `/` uses `{ path: '/', end: true }` (exact match only).
- `/collections` uses `{ path: '/collections', end: false }` so `/collections/:id` also highlights.
- `/records/:collectionId` is a child context of Collections but lives under `/records`. The navigation config will define explicit parent mappings where needed.

This approach avoids naive `startsWith()` string checks and leverages React Router's own pattern matching.

## State Management

- **Sidebar mobile drawer:** `useState<boolean>` in `AppShell`, passed to `MobileDrawer`.
- **No global state library.** No persistence of sidebar state (no collapsed mode).
- **Drawer closes on navigation:** `useEffect` listening to `location.pathname` changes.

## Accessibility

- `<aside>` wrapping the sidebar.
- `<nav aria-label="Main navigation">` inside `<aside>` wrapping the navigation items.
- `<header>` for topbar.
- `<main>` for content area.
- Active item: `aria-current="page"`.
- Mobile drawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation menu"`, focus trap, Escape handling.
- Focus-visible rings on all interactive elements.
- All nav items are `<a>` (via React Router `<Link>`).

## Motion

- **Nav hover/active:** `transition-colors duration-150 ease-out`.
- **Mobile drawer slide:** `motion-safe:transition-transform duration-200 ease-out` (open), `ease-in` (close).
- **Backdrop fade:** `motion-safe:transition-opacity duration-200`.
- **Reduced motion:** All transitions use `motion-safe:` prefix so they are instant under `prefers-reduced-motion`.

## Iconography

Retain `lucide-react`. No changes to the current icon selections except:
- **Hamburger:** `Menu` (16px) for mobile trigger.
- **Close:** `X` (16px) for mobile drawer close.
- All nav icons: 16px, stroke-width 2 (default).

## Branding Cleanup

- `tb_admin_auth` localStorage key: **DO NOT rename in Phase 2.** Renaming would log out all existing users. Document for a future migration phase that reads both old and new keys.
- The sidebar avatar currently uses a blue-cyan gradient. The new avatar will use solid `brand-primary` (orange).
- The active nav state currently uses `rgba(26,111,255,0.12)` (blue). The new active state will use `brand-primary-subtle` (orange).

## Legacy Page Compatibility

Existing pages depend on these legacy CSS classes from `index.css`:
- `.card`, `.card-header`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`
- `.form-group`, `.table-wrapper`, `table`, `.badge-*`
- `.stat-grid`, `.stat-card`, `.welcome-banner`, `.search-bar`
- `.modal-overlay`, `.modal`, `.chat-container`, `.login-page`
- `.empty-state`, `.pagination`, `.field-row`, `.spinner`

**Strategy:** `index.css` is NOT modified. The new `AppShell` replaces only `Layout.tsx` and its associated CSS classes (`.admin-layout`, `.sidebar`, `.sidebar-*`, `.main-content`, `.top-bar`, `.page-content`). The new shell does NOT add its own padding to the content area — the legacy `.page-content` class continues to provide `padding: 24px` for existing pages. This means the `<main>` element in AppShell must NOT duplicate `.page-content`'s role; it should simply wrap children and provide the scrollable container. The existing pages already render their content inside their own structures.

**Important:** The legacy `.page-content` class is applied by the current `Layout.tsx`. Since we are deleting `Layout.tsx`, we must ensure the new `AppShell` renders children inside an element that either uses the same `.page-content` class or provides equivalent scroll/overflow behavior without duplicating padding.

## Performance Considerations

- Navigation items are a static array — no unnecessary computation.
- `useLocation()` is called once in the shell, not per-item.
- Mobile drawer uses conditional rendering to avoid rendering off-screen DOM.
- No new data fetching or API calls introduced.

## Exact File Changes

### NEW
| File | Purpose |
|---|---|
| `admin/src/components/layout/AppShell.tsx` | Root shell layout |
| `admin/src/components/layout/Sidebar.tsx` | Desktop sidebar |
| `admin/src/components/layout/NavGroup.tsx` | Navigation group with label |
| `admin/src/components/layout/NavItem.tsx` | Individual nav link with `matchPath` active detection |
| `admin/src/components/layout/Topbar.tsx` | Top header bar |
| `admin/src/components/layout/MobileDrawer.tsx` | Self-contained mobile navigation overlay |
| `admin/src/components/layout/UserFooter.tsx` | User info + sign out |
| `admin/src/components/layout/navigation.ts` | Navigation config data and route-matching helpers |

### MODIFY
| File | What Changes | What Does NOT Change |
|---|---|---|
| `admin/src/App.tsx` | Replace `import Layout` with `import AppShell`. Replace `<Layout>` with `<AppShell>`. Pass same `onLogout` and `admin` props. | Routing, authentication, localStorage behavior, `tb_admin_auth` key — all unchanged. |

### DELETE
| File | Reason |
|---|---|
| `admin/src/components/Layout.tsx` | Replaced entirely by the new `layout/` components. Verified: only imported by `App.tsx`. |

### UNCHANGED
| File | Reason |
|---|---|
| `admin/src/index.css` | Legacy styles preserved for existing pages. |
| `admin/index.html` | No changes. |
| `admin/src/main.tsx` | No changes. |
| `admin/src/tailwind.css` | No changes. |
| All `admin/src/pages/*.tsx` | No page content changes. |
| All `admin/src/components/ui/*.tsx` | Phase 1 primitives unchanged. |
| `admin/src/api/client.ts` | No changes. |
| `admin/src/api/queryClient.ts` | No changes. |
| All `src/` files | No backend changes. |

## Dependency Changes

**None.** All required dependencies are already installed from Phase 1.

## Verification Plan

### Build
```
cd admin && npm run build
```

### Typecheck
```
cd admin && npx tsc --noEmit
```

### Visual Verification
- Dashboard: renders inside new shell, old content unchanged.
- Collections: table and modals work.
- Settings: form renders.
- Logs: table and pagination work.
- Backups: table renders.
- AI Assistant: chat interface works (verify internal scroll still functions).
- Sidebar: groups render, active state highlights correctly, orange accent visible.
- Topbar: page title updates on navigation.
- User menu: username displays, Sign Out works.

### Responsive Verification
- **1440px:** Full sidebar visible, content fills remaining space.
- **1024px:** Sidebar visible, content adapts.
- **768px:** Sidebar hidden, hamburger appears, drawer opens on tap.
- **Mobile (375px):** Full mobile layout, drawer navigation works.

### Authentication
- Existing session (`tb_admin_auth`) still loads.
- Username displays correctly in sidebar footer.
- Logout clears session and redirects to Login.
- Login page renders without shell (unchanged).

### Active Route Matching
- `/` highlights Dashboard only.
- `/collections` highlights Collections.
- `/collections/abc123` also highlights Collections.
- `/records/abc123` does NOT incorrectly highlight any other item.
- `/settings` highlights Settings.

### Regression
- No backend changes.
- No page content migration.
- No broken routes.
- No console errors.
- No doubled padding on page content.

## Risks

1. **Legacy padding interaction:** The new shell must not add padding that stacks on top of legacy `.page-content` padding. Mitigation: the shell's `<main>` wrapper provides only scroll behavior, not spacing.
2. **AI chat height:** The AI Assistant uses `height: calc(100vh - 140px)` which assumes a specific shell height. If the new topbar height differs from the old one, the chat area may be slightly too tall or short. This is a known issue to be addressed in the AI redesign phase, not Phase 2.
3. **Active route edge cases:** `/records/:id` routes are not directly represented in the sidebar. `matchPath` will correctly return no match, so no nav item will be incorrectly highlighted.

## Rollback Strategy

1. Restore `Layout.tsx` from git.
2. Revert `App.tsx` to import `Layout` instead of `AppShell`.
3. Delete `admin/src/components/layout/` directory.
4. All legacy CSS and pages remain untouched, so rollback is clean.

## Definition of Done

Phase 2 is complete only when:
- The new AppShell is implemented using Phase 1 design tokens.
- Sidebar is redesigned with navigation groups and orange active state.
- Topbar is compact and displays page context via route metadata.
- No non-functional placeholder controls are displayed.
- Username is displayed (not email).
- Responsive shell works: desktop sidebar, mobile drawer.
- Mobile drawer is accessible (focus trap, Escape, overlay close, reduced motion).
- Active nav detection uses React Router `matchPath`, not string checks.
- All existing routes continue to work.
- All existing page content renders unchanged inside the new shell.
- No duplicated page padding.
- No backend code modified.
- Legacy `index.css` untouched.
- `index.html` untouched.
- `tb_admin_auth` key unchanged.
- No new dependencies added.
- TypeScript passes.
- Production build passes.
- No new console errors.
