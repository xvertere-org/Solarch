# Solarch Admin — Visual Design System & Brand Specification (DESIGN.md)

This document defines the visual design system, design tokens, color palette, typography, and component specs extracted directly from the official **Solarch** brand platform (`solarch.in`).

---

## 1. Brand Core & Aesthetics

- **Brand Tone**: Modern, high-performance, developer-first TypeScript Backend-as-a-Service. Sleek obsidian dark-mode interface with vibrant Ember Orange accents (`#ff5a1f`).
- **Typography System**: 
  - **Primary & Display**: `Outfit`, sans-serif (Google Fonts)
  - **Monospace & Code**: `JetBrains Mono`, monospace (Google Fonts)
- **Logo Asset**: `/solarch-logo.svg` (Official geometric ember flame mark).

---

## 2. Solarch Color Tokens (CSS Variables)

```css
:root {
  /* Surface & Backgrounds */
  --bg-void: #0a0603;          /* Rich obsidian warm black */
  --bg-surface: #0a0603;       /* Surface cards & panels */
  --bg-elevated: #150d08;      /* Elevated dropdowns & inputs */
  --bg-border: #3a2214;        /* Warm ember border accent */

  /* Solarch Core Palette (Ember Flame) */
  --blue-core: #ff5a1f;        /* Primary Solarch Ember Orange */
  --blue-glow: #ff7a1a;        /* Active / Hover Ember Glow */
  --blue-bright: #ff9854;      /* Highlight / Link Ember */
  --blue-dim: #ffb892;         /* Muted Ember text */
  --cyan-spark: #ff5a1f;       /* Spark accent */
  --cyan-muted: #e04812;

  /* Typography & Foreground */
  --text-primary: #fdf3ec;     /* Warm white primary text */
  --text-secondary: #c9a894;   /* Warm beige secondary text */
  --text-muted: #8b6d5b;       /* Muted brown text */
  --text-code: #fdf3ec;        /* Code text color */

  /* Semantics */
  --success: #10b981;          /* Emerald Green */
  --warning: #f59e0b;          /* Amber */
  --error: #ef4444;            /* Red */

  /* Fonts & Radii */
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Outfit', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 3. Shadcn Theme Mapping

Semantic variables in HSL format map to Solarch CSS tokens:

```css
@layer base {
  :root {
    --background: 20 50% 2%;
    --foreground: 24 80% 96%;
    --card: 20 50% 2%;
    --card-foreground: 24 80% 96%;
    --popover: 22 45% 6%;
    --popover-foreground: 24 80% 96%;
    --primary: 16 100% 56%;
    --primary-foreground: 0 0% 100%;
    --secondary: 22 45% 6%;
    --secondary-foreground: 24 80% 96%;
    --muted: 22 35% 12%;
    --muted-foreground: 23 35% 57%;
    --accent: 16 100% 56%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 23 45% 15%;
    --input: 23 45% 15%;
    --ring: 16 100% 56%;
    --radius: 0.5rem;
  }
}
```

---

## 4. Typography Rules

- Headers (`h1`, `h2`, `h3`, `h4`, `.font-display`) must use `Outfit` with bold/semibold weight (`700`/`600`).
- Body text uses `Outfit` (`400`/`500`) with smooth antialiased rendering.
- Technical IDs, logs, code blocks, and rules must use `JetBrains Mono`.
