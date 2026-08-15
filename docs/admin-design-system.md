# Solarch Admin Design System

## Design Principles
- **Developer First:** The UI must feel like serious infrastructure software. Optimize for data density, technical precision, and speed.
- **Restrained:** Avoid excessive gradients, glows, or unnecessary glassmorphism. Prefer sharp contrast and subtle borders.
- **Functional Surfaces:** Don't use "cards" everywhere. Group fields into flat panels and let data tables bleed to the edges.
- **Accessible:** Native semantic HTML must be maintained. Interactions must be fully keyboard accessible with strong focus rings.

## Brand Direction
The Solarch Admin leverages a premium dark mode aesthetic built around a "Void" background, elevating surfaces subtly. The primary brand interaction color is **Solarch Orange**. Orange is used strictly for primary actions, active/focus states, and important indicators, never sprayed across the UI indiscriminately.

## Color Tokens (Tailwind `@theme`)
The following tokens are mapped directly into Tailwind's theme variables.

### Backgrounds
- `bg-void` (`#05050A`): The deepest level background (app shell).
- `bg-surface` (`#0D0D16`): The standard surface for sidebars and primary content areas.
- `bg-elevated` (`#13131F`): Elevated surfaces for inputs, dropdowns, and modals.
- `bg-hover` (`#1C1C2A`): Interactive row hover states.

### Borders
- `border-subtle` (`#1E1E30`): Standard structural borders and dividers.
- `border-strong` (`#2A2A40`): Focus rings and active borders.

### Text
- `text-primary` (`#F0F2FF`): Primary readable text.
- `text-secondary` (`#8892B0`): Secondary descriptions and labels.
- `text-muted` (`#4A5270`): De-emphasized text and placeholders.
- `text-disabled` (`#2A2E40`): Inactive text.

### Brand (Orange)
- `brand-primary` (`#FF6B00`): Primary actions and accents.
- `brand-primary-hover` (`#E56000`): Primary action hover state.
- `brand-primary-muted`: `color-mix(in srgb, #FF6B00 15%, transparent)`
- `brand-primary-subtle`: `color-mix(in srgb, #FF6B00 5%, transparent)`

### Semantic
- `status-success` (`#00E676`)
- `status-warning` (`#FFB300`)
- `status-danger` (`#FF5252`)
- `status-info` (`#00D4FF`)

## Typography
- **Primary Font:** System UI Sans-Serif (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`). *Note: Future phases will migrate to Inter.*
- **Monospace Font:** `JetBrains Mono`.

## Spacing
Built on a 4px scale, using standard Tailwind spacing (`p-1`, `p-2`, `p-4`, etc.).

## Border Radius
- `xs` (4px): Small elements (badges, checkboxes).
- `sm` (6px): Interactive elements (buttons, inputs).
- `md` (8px): Structural elements (panels).
- `lg` (12px): Floating surfaces (modals, dialogs).

## Elevation
Shadows are minimized. Depth is established through subtle border changes (`border-subtle` vs `border-strong`) and background color steps (`bg-void` -> `bg-surface` -> `bg-elevated`). 

## Surface Philosophy
- **Flat Section:** Default content container for high-density tables or lists. No border, no background change.
- **Panel:** Used to group related form fields or content. Uses a `border-subtle` and `bg-surface`.
- **Card:** Reserved strictly for distinct interactive widgets or high-emphasis metrics. DO NOT use cards as standard content wrappers.
- **Drawer/Inspector:** Preferred for contextual editing to avoid losing background context.
- **Modal/Dialog:** Used for quick confirmations or short isolated forms.

## Component Principles
Primitives should be composed using utility classes (`clsx` + `tailwind-merge`). Use `class-variance-authority` (CVA) ONLY when a component genuinely has multiple visual variants.

## Button
Uses CVA. 
- Variants: `default` (orange primary), `secondary` (subtle border, elevated bg), `ghost` (transparent), `danger` (red bg).
- Sizes: `default` (height 36px), `sm` (height 32px), `lg` (height 44px), `icon` (square).

## IconButton
A wrapper around Button restricted to `icon` size, typically using the `ghost` or `outline` variant.

## Input
A fixed-height (36px) structural input. Must use `bg-elevated`, `border-subtle`, and transition to `ring-border-strong` on focus. No glowing shadows.

## Textarea
Shares visual styling with Input, supporting multi-line text and resizing options.

## Badge
Uses CVA.
- Variants: `default` (elevated bg), `success`, `warning`, `danger`, `info`.

## Panel
A structural container primitive ensuring consistent `border-subtle` and `radius-md`.

## Divider
A horizontal or vertical rule using `border-subtle`.

## Empty States
Standardized format: A central muted icon, a short `text-primary` heading, a `text-secondary` description, and an optional action button. Never overly large.

## Loading States
Prefer inline loading states (e.g., button spinners) over full-page blocking spinners.

## Skeletons
Used for data-fetching placeholders to prevent layout shift. Uses an animated pulse effect on `bg-elevated`.

## Error States
Standardized format to display API or boundary errors gracefully without crashing the UI.

## Future Components
The following are specified but deferred until required by future phases:
- `Select`, `Toggle`, `Checkbox`, `Tooltip`, `Toast`, `Dialog`, `Drawer`, `Tabs`

## Iconography
- Library: `lucide-react`
- Standard Size: `16px` for inline actions, `20px` for navigation.
- Stroke Weight: Default `2px`.

## Motion
- Interaction (hover, focus): `150ms ease-out`
- Layout shifts (drawers, modals): `200ms ease-in-out`
- **Strict Rule:** Motion must never be decorative.

## Accessibility
- All inputs must have an associated `id` and semantic label.
- Focus rings are mandatory (`focus-visible:ring-2`).
- Contrast must meet WCAG AA standards.

## Responsive Rules
- `lg` (1024px+): Standard extended grid. Sidebar visible.
- `md` (768px-1024px): Sidebar collapses.
- `sm` (<768px): Mobile stack. Bottom navigation or hidden drawer.

## Legacy CSS Migration Strategy
For Phase 1, `admin/src/index.css` is preserved exactly as-is. New Tailwind components run alongside legacy classes. Future phases will swap out legacy DOM elements for new UI primitives until the old CSS can be completely deleted.

## Anti-Patterns
> [!CAUTION]
> - **Card-Everywhere:** Wrapping every piece of content in a card wastes space.
> - **Excessive Glowing/Gradients:** Keep the UI flat and professional.
> - **Excessive Rounded Corners:** Do not exceed `radius-md` for standard structural elements.
> - **Arbitrary Colors:** Never use arbitrary hex values (e.g., `bg-[#123]`) in components. Always map to `@theme` tokens.
> - **Mixing Legacy Classes:** Never combine old `.btn` classes with new Tailwind primitives.
