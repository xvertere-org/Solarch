# Product

## Register

product

## Users

Solo developers to small operations teams (2–5 engineers) managing their own Solarch Backend-as-a-Service instance. They use the Admin panel during development, deployment, and ongoing operations — managing database collections, inspecting records, configuring settings, monitoring logs, running backups, and querying the AI assistant. Context is a focused developer workstation, typically dark-mode, often alongside a code editor or terminal.

## Product Purpose

Solarch Admin is the operational control surface for the Solarch BaaS platform (SQLite + Express + WebSocket, with Auth, Realtime, and File Storage). It provides full infrastructure management: collections/schema CRUD, record management, system settings, real-time logs, backup/restore, and an AI assistant for schema generation and data queries. Success means an engineer can confidently manage their entire backend from a single, information-dense interface without needing CLI access or direct database manipulation.

## Brand Personality

Technical, Precise, Confident. The interface communicates engineering competence through restrained design, strong typography hierarchy, and intentional use of space. Warm dark surfaces, surgically applied accent color, and monospaced technical data create a command-center atmosphere. No decorative flourish — every element earns its place.

## Anti-references

- **Generic SaaS dashboards**: Stripe-clone cream/blue templates, hero-metric cards, gradient accents. Solarch is infrastructure, not a subscription product onboarding flow.
- **Consumer-grade playful tools**: Notion, Airtable, or similar — rounded, colorful, illustrated. Solarch's audience expects engineering precision, not friendly onboarding.
- **Enterprise bloatware**: AWS Console, Azure Portal — dense but chaotic, inconsistent, visually noisy. Solarch should be dense AND polished.
- **AI-generated SaaS templates**: Glassmorphism defaults, gradient text, identical card grids, cream/sand backgrounds, numbered section markers.

Positive references (principles, not copies): Vercel (restrained hierarchy), Linear (information density), Supabase (developer-native dark mode), Raycast (precise interaction states).

## Design Principles

1. **Information density over decoration.** Every pixel should communicate operational state. Use space to create hierarchy, not to fill a viewport.
2. **Infrastructure confidence.** The interface should feel like serious tooling. An engineer should trust it the way they trust a well-maintained CLI.
3. **Warm precision.** Dark surfaces lean warm (brown-black, not blue-gray), creating visual distinction from generic dev tools while maintaining readability.
4. **Surgical accent.** Orange (#ea580c) is applied only where it carries meaning: primary actions, active states, brand identity. The interface should look intentional even with the accent removed.
5. **Technical typography.** Monospaced values (IDs, timestamps, JSON, log entries) signal "this is data." Display type (Outfit) signals "this is interface." The distinction is the hierarchy.

## Accessibility & Inclusion

- WCAG 2.1 AA compliance minimum
- Body text contrast ≥ 4.5:1 against background surfaces
- Focus-visible states on all interactive elements
- Reduced motion support via `prefers-reduced-motion`
- Keyboard-navigable sidebar, dialogs, and forms
- ARIA labels on all icon-only controls
