# Design System Specification: The Kinetic Terminal

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Terminal."** 

This system rejects the static, boxy nature of traditional SaaS dashboards. Instead, it merges the high-velocity data density of a **Bloomberg Terminal** with the intimate, frosted aesthetics of **iMessage** and the surgical precision of **Linear**. We aim for a "living software" feel—where AI agents aren't just rows in a database, but luminous entities existing within a pressurized, translucent environment. 

The layout breaks the "template" look by using **intentional asymmetry**: sidebar elements may overlap glass containers, and typography scales jump aggressively between massive, thin-weight displays and micro-labeling to create an editorial cadence.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep nocturnal tones, using light not as a "fill," but as a way to define physical presence.

### Core Tones
*   **Background (Deep Navy/Charcoal):** `#111319` (Token: `surface`). This is our void.
*   **Primary Accent:** `#c2c1ff` (Token: `primary`). A soft, electric lavender that cuts through the dark.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined by **background color shifts** or **tonal transitions**. 
*   Use `surface-container-low` for a section sitting on `surface`. 
*   Use `surface-container-highest` only for the most elevated interactive elements.
*   Let the negative space (using our **Spacing Scale**) do the heavy lifting.

### The "Glass & Gradient" Rule
Floating elements (Modals, Popovers, Agent Cards) must utilize **Glassmorphism**.
*   **Fill:** `surface-variant` at 60% opacity.
*   **Effect:** `backdrop-blur: 24px`.
*   **Signature Textures:** Use a subtle linear gradient (from `primary` to `primary-container` at 10% opacity) for hero backgrounds to provide "visual soul."

### Agent-Specific Accents (Gradients)
Each AI agent is a light source. Use these for status pips, progress bars, and glows:
*   **Dante (Purple):** `linear-gradient(135deg, #8B5CF6, #D8B4FE)`
*   **Brent (Blue):** `linear-gradient(135deg, #3B82F6, #93C5FD)`
*   **Rex (Green):** `linear-gradient(135deg, #10B981, #6EE7B7)`
*   **Scout (Orange):** `linear-gradient(135deg, #F59E0B, #FCD34D)`
*   **Nova (Pink):** `linear-gradient(135deg, #EC4899, #FBCFE8)`
*   **Victor (Gold):** `linear-gradient(135deg, #EAB308, #FEF08A)`

---

## 3. Typography: Editorial Precision
We use **Inter** with a heavy emphasis on **Tabular Lining Figures** (`font-variant-numeric: tabular-nums`) for all metrics to maintain the Bloomberg-terminal rigor.

*   **Display (lg/md/sm):** Used for "Big Numbers" (Revenue, Total Tasks). Tracking should be set to `-0.02em`.
*   **Headline (lg/md):** Used for section starts. High contrast against body text.
*   **Body (md/sm):** Our workhorse. Use `on-surface-variant` for secondary body text to reduce visual noise.
*   **Label (md/sm):** All-caps with `+0.05em` letter spacing. Used for technical metadata and agent IDs.

---

## 4. Elevation & Depth: Tonal Layering
We do not use drop shadows to indicate "modernity"; we use **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "recessed" or "lifted" look.
*   **Ambient Shadows:** For floating elements (Command Palettes), use a `primary` tinted shadow: `0 20px 40px -12px rgba(194, 193, 255, 0.08)`.
*   **The "Ghost Border":** If a border is required for accessibility, use `outline-variant` at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Input Fields & Command Bars
*   **Style:** Minimalist. No background fill when inactive—only a `surface-container-high` bottom border.
*   **Active State:** Transitions to a glassmorphic fill with a `primary` glow. 
*   **Micro-copy:** Use `label-sm` for field descriptions to maintain the "Terminal" feel.

### Buttons
*   **Primary:** `primary` background with `on-primary` text. Use `xl` (0.75rem) corner radius.
*   **Secondary:** Glassmorphic (`surface-variant` at 40%) with a `ghost-border`. 
*   **Interaction:** Smooth spring transitions (`stiffness: 400, damping: 28`) on hover—subtle scale up (1.02x).

### Data Lists
*   **The Divider Ban:** Do not use line dividers. Separate list items using `0.4rem` (Spacing 2) of vertical padding and a subtle `surface-container-low` hover state.
*   **Leading Elements:** Use thin-stroke icons (Lucide style) at 1.25px weight.

### Agent Status Chips
*   **Style:** Pill-shaped (`full` roundedness). 
*   **Fill:** A 10% opacity version of the Agent's specific gradient.
*   **Indicator:** A 4px solid pulse of the Agent's primary color.

---

## 6. Do's and Don'ts

### Do
*   **Use Tabular Numerals:** Every metric, time-stamp, and currency must use tabular lining for vertical alignment.
*   **Embrace "Breathable Density":** Use high padding (`spacing-12` or `16`) between major modules, but keep internal module data tight and efficient.
*   **Use Motion as Feedback:** UI elements should feel like they have mass. Use spring physics for all drawer and modal entries.

### Don't
*   **Don't use pure white:** It breaks the nocturnal immersion. Use `on-surface` (`#e2e2eb`) or `on-surface-variant` (`#c7c4d7`).
*   **Don't use standard "Card" layouts:** Avoid four rounded corners with a shadow. Use full-bleed glass panes or bottom-sheet-inspired containers.
*   **Don't use heavy icons:** Avoid filled icons. Use 1pt or 1.25pt stroke weights to maintain the "Terminal" sophistication.