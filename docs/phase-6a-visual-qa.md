# Phase 6A — Solarch Admin Visual QA & Consolidation Audit

## 1. Executive Summary

This audit systematically examines every Solarch Admin page, component, and CSS file against the established Phase 4C design direction: **premium, dark, technical, compact, infrastructure-oriented, developer-grade, restrained, intentional**.

The overall system is architecturally sound — the Tailwind design tokens, component primitives, and page layouts follow a consistent strategy. However, the audit reveals **two systemic problems** and **~30 individual findings** across visual consistency, responsive behavior, and legacy CSS conflicts.

> **IMPORTANT — Browser Verification Status**: The browser subagent was rate-limited during this audit. All findings below are derived from exhaustive source-code inspection. Each finding that requires visual confirmation is marked `[NEEDS BROWSER]`. A browser verification pass must be completed before proceeding to Phase 6B implementation.

---

## 2. Environment & Credentials

| Item | Status |
|------|--------|
| Backend | Running on `localhost:8090` (`npm run dev`) |
| Frontend dev server | Running (`admin/npm run dev`) |
| Admin URL | `http://localhost:8090/_/` |
| Installer/Login | Installer screen visible at `/register` |
| Superuser credentials | `admin` / `password123` (from test setup) |
| API proxy | Configured in `vite.config.ts` → `localhost:8090` |

---

## 3. Browser Verification Status

| Check | Status |
|-------|--------|
| Browser subagent available | ❌ Rate-limited (~2h43m remaining) |
| Desktop 1440×900 screenshots | ❌ Deferred |
| Desktop 1280×800 screenshots | ❌ Deferred |
| Tablet 1024×768 screenshots | ❌ Deferred |
| Tablet 768×900 screenshots | ❌ Deferred |
| Mobile 480×800 screenshots | ❌ Deferred |
| Source-level audit complete | ✅ Complete |

---

## 4. SYSTEMIC ISSUES

### S1. Dual CSS Architecture Conflict (P1)

**Problem**: Two parallel CSS systems are active and partially conflicting:

1. **`index.css`** — Legacy vanilla CSS with `:root` variables using `--blue-core`, `--blue-glow`, `--bg-void`, etc.
2. **`tailwind.css`** — Tailwind v4 `@theme` block with `--color-brand-primary: #FF6B00` (orange), `--color-bg-void`, etc.

**Conflicts identified**:
- `index.css` `.btn-primary` uses `--blue-core` (#1A6FFF) → blue buttons
- Tailwind `Button.tsx` uses `bg-brand-primary` → orange buttons (#FF6B00)
- Login page uses `.btn .btn-primary` (blue) while all other pages use `<Button>` (orange)
- `index.css` `.form-group input:focus` uses `--blue-core` focus ring
- Tailwind `Input.tsx` uses `focus-visible:ring-border-strong` (gray)
- The login page uses `login-page`, `login-card`, `login-orb` classes with blue radial gradient

**Impact**: The Login page visually belongs to a **different product** than the authenticated admin pages. Blue login → orange admin is jarring.

### S2. `select` Elements Are Not Componentized (P2)

**Problem**: Native `<select>` elements are styled ad-hoc across 4+ pages with inconsistent class strings:
- `Collections.tsx:229` — `bg-bg-primary` (undefined token)
- `CollectionDetail.tsx:186` — `bg-bg-surface`
- `Settings.tsx:247` — `bg-bg-elevated`
- `Logs.tsx:103` — `bg-bg-elevated`

No `<Select>` UI primitive exists. Each `<select>` has different background, focus ring, height, and border radius.

---

## 5. Per-Page Findings

### 5.1 Login / Installer

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| L1 | P1 | Visual | Login uses `.btn-primary` (blue `#1A6FFF`) — inconsistent with admin orange brand |
| L2 | P1 | Visual | Login radial gradient orb is blue — should be orange or removed |
| L3 | P2 | Visual | Login uses `.form-group` legacy CSS inputs — not `<Input>` component |
| L4 | P2 | Typography | Login uses inline `style={{ fontSize: 14 }}` on button — bypasses design system |
| L5 | P2 | Responsive | Login has no explicit mobile breakpoint handling — relies on `max-width: 400px` |
| L6 | P3 | Architecture | MobileDrawer line 92 uses hardcoded `fontFamily: 'ui-sans-serif...'` instead of `font-display` |

### 5.2 Dashboard

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| D1 | P2 | Visual | Metric values use `font-mono` (correct) but `text-2xl` is oversized for infrastructure console density |
| D2 | P2 | Visual | `text-text-tertiary` class used on metric icons — this token is not defined in `tailwind.css`, will render as default `[NEEDS BROWSER]` |
| D3 | P2 | Visual | Quick Action items use `rounded` (default 4px) instead of `rounded-sm` (6px) — inconsistent with Button `rounded-sm` |
| D4 | P3 | Spacing | `mb-8` between Overview heading and Quick Actions — slightly excessive |
| D5 | P1 | Visual | Dashboard heading uses `text-2xl` (24px) — oversized compared to other page headings at `text-lg` (18px) |

### 5.3 Collections

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| C1 | P2 | Visual | Auth badge overrides `variant="warning"` with `className` that replaces all badge colors — defeating the variant system |
| C2 | P3 | Visual | Table uses `divide-border-subtle/50` — consistent across tables ✓ |
| C3 | P2 | Architecture | `select` in create dialog uses `bg-bg-primary` — undefined token `[NEEDS BROWSER]` |

### 5.4 Collection Detail

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| CD1 | P1 | Visual | Heading uses `text-2xl` — oversized vs other pages at `text-lg` |
| CD2 | P2 | Visual | `select` in General section uses `bg-bg-surface` — different from other `select` elements |
| CD3 | P2 | Visual | Field type `select` uses `bg-bg-primary` — undefined token |
| CD4 | P2 | Visual | Schema table uses `bg-bg-surface-hover/30` and `bg-bg-surface-hover/50` — undefined tokens `[NEEDS BROWSER]` |
| CD5 | P1 | Responsive | Sticky save bar uses `sm:left-64` — should be `lg:left-[220px]` to match actual sidebar width |
| CD6 | P2 | Visual | API Rules inputs use raw `<input>` with `bg-bg-surface-hover` instead of `<Input>` component |

### 5.5 Records

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| R1 | P3 | Visual | Consistent with Collections table styling ✓ |
| R2 | P2 | Visual | JSON viewer dialog uses different background patterns than Logs detail dialog |

### 5.6 Record Detail

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| RD1 | P2 | Visual | Field editors use mix of `<Input>` component and raw `<input>` elements |
| RD2 | P2 | Visual | Metadata section uses custom Badge rendering different from shared Badge component |

### 5.7 Settings

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| S1 | P2 | Visual | Tab navigation uses `bg-bg-hover` for active — no left border accent like sidebar nav |
| S2 | P2 | Visual | AI provider `select` uses `bg-bg-elevated` — inconsistent with other `select` elements |
| S3 | P3 | Visual | Checkbox uses raw `<input type="checkbox">` — not componentized |
| S4 | P2 | Responsive | Settings sidebar tabs scroll horizontally without visible scrollbar at 480px |

### 5.8 Logs

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| LG1 | P2 | Visual | Level badge for `info` uses `bg-brand-primary/10 text-brand-primary` (orange) — semantically wrong, info should be `status-info` (cyan) |
| LG2 | P2 | Visual | Log detail dialog nests `DialogContent` with `DialogHeader` inside `DialogContent` — potentially double-padding `[NEEDS BROWSER]` |
| LG3 | P3 | UX | No `DialogClose` button on log detail dialog |
| LG4 | P2 | Visual | Pagination buttons use `size="icon"` with `variant="secondary"` |

### 5.9 Backups

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| B1 | P1 | Visual | Page has own `p-4 sm:p-6 lg:p-8` padding — already inside `.page-content` (padding: 24px). **Double padding** `[NEEDS BROWSER]` |
| B2 | P2 | Visual | Table header uses `bg-bg-surface` — Collections/Logs use `bg-bg-elevated` |
| B3 | P2 | Visual | Delete button is raw `<button>` instead of `<IconButton variant="danger">` |
| B4 | P2 | Visual | Heading uses `text-xl sm:text-2xl` — inconsistent with `text-lg` standard |

### 5.10 AI Assistant

| ID | Priority | Category | Finding |
|----|----------|----------|---------|
| AI1 | P2 | Visual | User message bubble uses `rounded-lg rounded-tr-none` — `rounded-lg` (12px) larger than system `rounded-sm` (6px) |
| AI2 | P2 | Visual | Markdown `code` uses `({node, inline, ...props}: any)` — `inline` prop removed in react-markdown v9+ `[NEEDS BROWSER]` |
| AI3 | P3 | Visual | Quick action pills at `h-6` may be hard to tap on mobile |
| AI4 | P2 | UX | `ToastContainer` rendered per-page — positioning may conflict |

---

## 6. Typography Audit

| Check | Status | Notes |
|-------|--------|-------|
| Syne for headings | ✅ | `font-display` applied in index.css and sidebar |
| DM Sans for body | ✅ | Body default |
| JetBrains Mono for code | ✅ | Used for IDs, timestamps, file names |
| Consistent heading sizes | ❌ P1 | Dashboard/CollectionDetail `text-2xl`, others `text-lg` |
| MobileDrawer brand | ❌ P2 | Hardcoded system font instead of Syne |

---

## 7. Color Audit

| Check | Status | Notes |
|-------|--------|-------|
| Brand orange as accent | ✅ | Used for nav active, primary buttons, hover |
| No legacy blue | ❌ P1 | Login uses `--blue-core` (#1A6FFF) |
| Semantic status colors | ✅ | danger=red, warning=amber, success=green, info=cyan |
| Log info badge color | ❌ P2 | Uses orange instead of cyan |
| Undefined tokens | ❌ P2 | `text-text-tertiary`, `bg-bg-primary`, `bg-bg-surface-hover` |

---

## 8. Surface Hierarchy

| Check | Status |
|-------|--------|
| Three-level system (void → surface → elevated) | ✅ |
| No nested panels | ✅ Mostly |
| Backups double padding | ❌ P1 |

---

## 9. Accessibility Audit

| Check | Status | Notes |
|-------|--------|-------|
| Keyboard navigation | ✅ | `focus-visible:ring-2` on all interactive elements |
| Dialog focus management | ✅ | Focus trapped, Escape closes |
| aria-current on nav | ✅ | NavItem sets `aria-current="page"` |
| Input label associations | ❌ P2 | Settings inputs lack `htmlFor`/`id` pairing |
| Buttons vs clickable divs | ✅ | All interactive elements are proper `<button>` or `<a>` |

---

## 10. Legacy CSS Audit

| Selector | Consumer | Conflict | Strategy |
|----------|----------|----------|----------|
| `.btn`, `.btn-primary` | Login.tsx | Blue vs orange | Migrate to `<Button>` |
| `.form-group input` | Login.tsx | Blue focus ring | Migrate to `<Input>` |
| `.login-*` classes | Login.tsx | Blue orb, separate design | Redesign with Tailwind |
| `.page-content` | AppShell.tsx | Active, compatible | Keep or inline |
| `.spinner` | Login.tsx | Blue spinner | Migrate |
| `:root` variables | Legacy selectors | Blue tokens unused outside Login | Remove with Login migration |

---

## 11. Cross-Page Consistency Summary

| Component | Consistent? | Issue |
|-----------|-------------|-------|
| `<Button>` | ✅ | Except Login (legacy) |
| `<Input>` | ✅ | Except Login, CollectionDetail rules |
| `<select>` | ❌ | 4 different background tokens |
| Page headings | ❌ | 4 different sizes |
| Table headers | ❌ | bg-surface vs bg-elevated |
| Empty states | ❌ | `<EmptyState>` vs custom inline |
| Toasts | ❌ | Per-page `<ToastContainer>` placement |

---

## 12. Scorecard

| Dimension | Score |
|-----------|-------|
| Branding | 6/10 |
| Typography | 7/10 |
| Layout | 7/10 |
| Density | 8/10 |
| Color | 6/10 |
| Components | 7/10 |
| Data presentation | 8/10 |
| Responsiveness | 6/10 |
| Accessibility | 7/10 |
| Consistency | 6/10 |
| **Overall** | **6.5/10** |

---

## 13. Final Verdict

### NOT READY FOR CONSOLIDATION

**Blocking P1 issues**:

1. Login page uses entirely different color system (blue vs orange)
2. Cross-page heading size inconsistency (text-2xl vs text-lg)
3. Backups page double padding
4. Sticky save bar sidebar offset mismatch
5. Undefined Tailwind tokens may render incorrectly

**Must complete before consolidation**:
- Browser verification at all 5 viewports
- Confirm undefined tokens actually fail visually
- Confirm Markdown `inline` prop behavior in AI page
