# Phase 6B — Consolidation Implementation Plan

Based on the Phase 6A Visual QA audit, the following plan addresses all P0/P1/P2 issues in logical batches. P3 issues are included in the final polish batch.

---

## Batch 1 — Login Redesign (P1 blocker)

The Login page is the single largest visual inconsistency. It uses legacy blue CSS from a pre-Phase 4C era.

### 1.1 [MODIFY] `admin/src/pages/Login.tsx`
- **Problem**: Uses `.btn .btn-primary` (blue), `.form-group` inputs (blue focus), `.login-orb` (blue gradient)
- **Solution**: Rewrite Login to use Tailwind classes and brand tokens exclusively. Use `<Input>`, `<Button>` components. Replace blue orb gradient with `brand-primary` orange or a neutral gradient.
- **Dependencies**: None
- **Risk**: Low — Login is self-contained
- **Verification**: Visual comparison at 1440×900, 768×900, 480×800

### 1.2 [MODIFY] `admin/src/index.css`
- **Problem**: Legacy `.btn-*`, `.form-group`, `.login-*`, `:root` blue tokens
- **Solution**: After Login migration, remove all legacy selectors and `:root` blue variables. Keep `.page-content` and `.spinner` (or migrate spinner to Tailwind).
- **Dependencies**: Must complete 1.1 first
- **Risk**: Medium — must confirm no other consumers exist via grep
- **Verification**: `grep -r "btn-primary\|form-group\|login-" admin/src/`

---

## Batch 2 — Global Token & Component Fixes (P1/P2)

### 2.1 Add missing Tailwind tokens to `admin/src/tailwind.css`
- **Problem**: `text-text-tertiary`, `bg-bg-primary`, `bg-bg-surface-hover` used but not defined
- **Solution**: Add `--color-text-tertiary`, `--color-bg-primary`, `--color-bg-surface-hover` to `@theme` block, OR replace all usages with existing tokens
- **Dependencies**: None
- **Risk**: Low
- **Verification**: `npx tsc --noEmit` + browser check

### 2.2 [NEW] `admin/src/components/ui/Select.tsx`
- **Problem**: 4+ inline `<select>` elements with inconsistent styling
- **Solution**: Create `<Select>` component with same styling contract as `<Input>`: `h-9`, `rounded-sm`, `border-border-subtle`, `bg-bg-elevated`, `focus-visible:ring-2 ring-border-strong`
- **Dependencies**: None
- **Risk**: Low
- **Verification**: Replace all `<select>` usages across Collections, CollectionDetail, Settings, Logs

### 2.3 Normalize page heading sizes
- **Problem**: Dashboard, CollectionDetail, Backups, AI use `text-2xl` or `text-xl`; standard is `text-lg`
- **Files**:
  - `admin/src/pages/Dashboard.tsx` — change `text-2xl` → `text-lg`
  - `admin/src/pages/CollectionDetail.tsx` — change `text-2xl` → `text-lg`
  - `admin/src/pages/Backups.tsx` — change `text-xl sm:text-2xl` → `text-lg`
  - `admin/src/pages/AIAssistant.tsx` — change `text-xl` → `text-lg`
- **Risk**: Low
- **Verification**: Visual comparison across all pages

---

## Batch 3 — Layout & Spacing Fixes (P1)

### 3.1 Fix Backups double padding
- **File**: `admin/src/pages/Backups.tsx`
- **Problem**: Page wraps content in `p-4 sm:p-6 lg:p-8` but is already inside `.page-content` (padding: 24px)
- **Solution**: Remove the outer padding from Backups. Use same pattern as Collections/Logs (no extra padding wrapper).
- **Risk**: Low
- **Verification**: Browser check at all viewports

### 3.2 Fix CollectionDetail sticky save bar offset
- **File**: `admin/src/pages/CollectionDetail.tsx`
- **Problem**: Save bar uses `sm:left-64` (256px) but sidebar is `lg:w-[220px]` and hidden below `lg`
- **Solution**: Change to `lg:left-[220px]` — matches sidebar visibility and width
- **Risk**: Low
- **Verification**: Resize between 768px and 1280px to confirm alignment

---

## Batch 4 — Table & Data Consistency (P2)

### 4.1 Normalize table header backgrounds
- **Files**: `Backups.tsx`, `CollectionDetail.tsx`
- **Problem**: Backups uses `bg-bg-surface`, CollectionDetail uses `bg-bg-surface-hover/50`
- **Solution**: Standardize all table headers to `bg-bg-elevated` (matching Collections, Logs, Records)
- **Risk**: Low
- **Verification**: Visual comparison of all tables

### 4.2 Normalize empty states
- **Files**: `Logs.tsx`, `Backups.tsx`
- **Problem**: Custom inline empty states instead of `<EmptyState>` component
- **Solution**: Replace with `<EmptyState>` using appropriate icon, title, description, action
- **Risk**: Low
- **Verification**: Navigate to pages with no data

### 4.3 Fix Logs info badge color
- **File**: `admin/src/pages/Logs.tsx`
- **Problem**: Info badge uses `brand-primary` (orange) instead of `status-info` (cyan)
- **Solution**: Change info case to `bg-status-info/10 text-status-info border-status-info/20`
- **Risk**: Low
- **Verification**: Create a test log entry and check badge color

---

## Batch 5 — Component Normalization (P2)

### 5.1 Normalize raw inputs to `<Input>` component
- **Files**: `CollectionDetail.tsx` (API rules inputs), `RecordDetail.tsx`
- **Problem**: Raw `<input>` elements with ad-hoc styling
- **Solution**: Replace with `<Input>` or `<Textarea>` components
- **Risk**: Low
- **Verification**: Visual consistency check

### 5.2 Normalize Backups delete button
- **File**: `admin/src/pages/Backups.tsx`
- **Problem**: Delete button is raw `<button>` with custom classes
- **Solution**: Replace with `<IconButton variant="danger">`
- **Risk**: Low
- **Verification**: Visual check

### 5.3 Fix Collection badge overrides
- **Files**: `Collections.tsx`, `CollectionDetail.tsx`
- **Problem**: Auth badge uses `variant="warning"` but then overrides all colors with `className`
- **Solution**: Either create a proper `variant="brand"` in Badge, or use `variant="default"` with custom class
- **Risk**: Low
- **Verification**: Check badge rendering

---

## Batch 6 — AI & Mobile Fixes (P2)

### 6.1 Fix AI message bubble radius
- **File**: `admin/src/pages/AIAssistant.tsx`
- **Problem**: User messages use `rounded-lg` (12px) — larger than system standard
- **Solution**: Change to `rounded-md` (8px) to match system `--radius-md`
- **Risk**: Low
- **Verification**: Visual check

### 6.2 Fix react-markdown `inline` prop
- **File**: `admin/src/pages/AIAssistant.tsx`
- **Problem**: Code component uses `inline` prop which may not exist in react-markdown v10
- **Solution**: Check if `inline` is available. If not, detect block vs inline via presence of parent `<pre>` element
- **Risk**: Medium — requires testing
- **Verification**: Send a message with backtick code and code block

### 6.3 Fix MobileDrawer brand font
- **File**: `admin/src/components/layout/MobileDrawer.tsx`
- **Problem**: Line 92 uses hardcoded system font instead of `font-display` (Syne)
- **Solution**: Replace inline `style` with `className="font-display"`
- **Risk**: Low
- **Verification**: Open mobile drawer, check brand text

---

## Batch 7 — Accessibility & Final Polish (P2/P3)

### 7.1 Add label associations in Settings
- **File**: `admin/src/pages/Settings.tsx`
- **Problem**: Labels don't have `htmlFor`/`id` associations
- **Solution**: Add unique `id` to each input and matching `htmlFor` to labels
- **Risk**: Low

### 7.2 Add DialogClose to Logs detail dialog
- **File**: `admin/src/pages/Logs.tsx`
- **Problem**: No close button on log detail modal
- **Solution**: Add `<DialogClose>` to `<DialogHeader>`
- **Risk**: Low

### 7.3 Consolidate ToastContainer
- **Problem**: Multiple pages render their own `<ToastContainer>`
- **Solution**: Move single `<ToastContainer>` to `App.tsx` or `AppShell.tsx`
- **Risk**: Low — singleton pattern already handles dedup
- **Verification**: Trigger toasts from different pages

### 7.4 Dashboard Quick Action border radius
- **File**: `admin/src/pages/Dashboard.tsx`
- **Problem**: Quick actions use `rounded` instead of `rounded-sm`
- **Solution**: Change to `rounded-sm`
- **Risk**: Low

---

## Batch 8 — Browser Verification Pass

After all Batches 1-7 are implemented:

1. Start application (`npm run dev`)
2. Capture screenshots at all 5 viewports for every page
3. Test all interactions (create, edit, delete, search, filter, dialog, toast)
4. Verify mobile drawer, responsive tables, dialog viewport fit
5. Produce final visual QA confirmation document

---

## Execution Order

```
Batch 1 (Login)         → Highest visual impact, unblocks brand consistency
Batch 2 (Tokens/Select) → Unblocks cross-page consistency
Batch 3 (Layout)        → Fixes broken layouts
Batch 4 (Tables/Data)   → Visual consistency
Batch 5 (Components)    → Component normalization
Batch 6 (AI/Mobile)     → Edge cases
Batch 7 (A11y/Polish)   → Final refinements
Batch 8 (Verification)  → Browser confirmation
```

## Estimated Scope

- **Files modified**: ~15
- **Files created**: 1 (`Select.tsx`)
- **Files deleted**: 0
- **Risk level**: Low-Medium (Login redesign is the largest change)
- **Dependencies**: None external
