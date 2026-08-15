# Solarch Admin Panel — Color & Design Direction

## Reference
Pulled from `DESIGN.md` (`solarch.in`). This direction aligns the admin panel with the core brand identity of the main website and documentation.

---

## Design North Star
**"The Technical Command Center"** — dark, information-dense, precise. Documentation-first clarity over generic SaaS polish. Flat by default, warm dark surfaces, accent color used surgically rather than everywhere.

---

## Color Palette

### Base & Surfaces
Backgrounds and borders lean warm-black, not neutral gray — every surface should read as slightly warm, never cool or blue-tinted.

| Token | Hex Value | Role |
|---|---|---|
| **Void / Background** | `#0a0603` | Main app canvas & base void background |
| **Card Surface** | `#150d08` | Elevated panels, cards, and container surfaces |
| **Border** | `#3a2214` | Subtle borders, dividers, and structural outlines |

### Typography & Text Hierarchy
| Token | Hex Value | Role |
|---|---|---|
| **Text Primary** | `#fdf3ec` | High contrast primary text & headings |
| **Text Secondary** | `#c9a894` | Body text, labels, and secondary information |
| **Text Muted** | `#8b6d5b` | De-emphasized text, captions, and placeholders |

### Brand Accents (Flame & Ember)
Accent color (flame/ember orange) is reserved for active states, primary actions, and glow highlights — not a background color.

| Token | Hex Value | Role |
|---|---|---|
| **Primary** | `#ea580c` | Primary interactive buttons & active elements |
| **Accent** | `#f97316` | Bright accent highlights & hover states |
| **Flame Core** | `#ff5a1f` | Vibrant flame core accent |
| **Ember Glow** | `#ff7a1a` | Ember glow accents & focus rings |

### Status Colors
| Token | Hex Value | Role |
|---|---|---|
| **Success** | `#10b981` | Positive indicators, successful operations |
| **Warning** | `#f59e0b` | Alerts, warnings, and non-blocking issues |
| **Error** | `#ef4444` | Destructive actions, errors, and system failures |

---

## Typography Direction
- **Headings & Body**: `Outfit` — clean, geometric, high contrast against the dark background.
- **Data, Code, Labels**: `JetBrains Mono` — used for anything technical or numeric (IDs, metrics, log entries), reinforcing the command-center feel.
- Keep the type pairing strictly to these two typefaces.

---

## Visual Language Rules
1. **Flat Surfaces**: No heavy drop shadows or decorative gradients.
2. **Surgical Accent Usage**: Flame/ember orange is reserved for active states, primary actions, and selected indicators — never used as a flood background color.
3. **High Contrast**: Legibility over atmosphere at all times. High contrast between text and surface.
4. **Command Center Aesthetic**: Avoid generic corporate SaaS polish — technical, precise, and unapologetic.
