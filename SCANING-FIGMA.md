---
name: figma-design-system-scan
description: Use this skill whenever the user shares a Figma frame/page and wants it analyzed for reusable components and design tokens BEFORE any layout or code is generated — i.e. "scan this frame", "extract components and tokens", "catalog this design", or any request to build/update a component-and-token inventory from Figma. Also trigger this at the START of any Figma-to-code task (even if the user just pastes a Figma link and asks for a layout) to check whether a components-inventory.md / tokens.md already exists for that project — if it does, consult it and reuse matches instead of re-analyzing the frame from scratch or handing the AI coding agent (Cursor, Windsurf, Claude Code) a full raw re-description of the design. The point of this skill is to separate "understanding the design system" (cheap, one-time, cacheable) from "generating layout code" (expensive, repeated) to reduce AI credit usage across a project's lifetime.
---

# Figma Design System Scan

A skill for turning a Figma frame into a persistent, **agent-ready component + token catalog** (`components-inventory.md` + `tokens.md`) — without generating any layout or implementation code. The catalog becomes the reference future layout-generation tasks check first, so the AI coding agent gets a short "reuse Button-primary, see components-inventory.md" instruction instead of a full re-description of the design every time.

## Why this exists

In a vibe-coding workflow (Figma → Cursor/Windsurf/Claude Code), the expensive, repeated cost is generating layout/implementation code. Re-deriving "what are the colors, what is this button's anatomy" from the raw frame every single time wastes tokens/credits on work that doesn't change between tasks. Scanning once and reusing the catalog turns that into a one-time cost. The catalog entries should be detailed and prose-rich enough that an agent can build a *new but consistent* component from them without seeing the original frame again — that's the difference between a real reference and a bare style-guide table.

**Two distinct phases — do not blend them:**
1. **Scan phase** (this skill's core job): read the frame, produce/update the catalog. No layout, no component code, no page assembly. Figma access is read-only: the scan writes only to `components-inventory.md` / `tokens.md` — never to project source code, and never to the Figma file itself, unless the user explicitly asks.
2. **Build phase** (a separate, later task): generate an actual layout. This skill's job there is only the *lookup* step — check the catalog first, reuse what matches, and only fall through to analyzing the raw frame for genuinely new pieces.

## Phase 1: Scan a frame into the catalog

### Step 1 — Locate or create the catalog files

Check the project root (or wherever the project's AI-agent context files live, e.g. alongside an existing `DESIGN.md`/`SCALING.md`) for `components-inventory.md` and `tokens.md`. If they don't exist, this is a fresh catalog — create both from the templates below. If they exist, this scan is an **update**: append new components/tokens, and flag near-duplicates for the user to confirm merge vs. keep-separate (e.g. a new "Button" variant that's 90% identical to an existing one).

### Step 2 — Extract design tokens (→ `tokens.md`)

Prefer the file's actual Design Library/Variables over eyeballing the frame, since that's the source of truth and stays valid as the design evolves:
- Use `figma_get_library_variables` to see subscribed library variable collections; use `figma_get_variables` for local variables and values.
- Use `figma_get_design_system_kit` to pull components, tokens, and styles referenced in or near the target frame.
- Fall back to `figma_get_component_for_development` on the frame/component node when a value isn't backed by a library variable (i.e. it's a local/one-off style) — still record it, but flag it as "local, not tokenized" so the user can decide whether to promote it to a real token later.

For each category, capture more than the raw value — capture the *role and rationale*, the same way a real style guide would:
- **Color**: name, hex, token, and a one-line role description (not just "primary" — say *where* it's used and why, e.g. "the only chromatic surface in the system, rationed to one callout per page"). Also derive a **Surfaces** table (canvas/card/section/accent/elevated, in z-order) and an **Elevation** table (named shadow recipes with their actual CSS values).
- **Typography**: for each font family, capture substitute/fallback fonts, every weight actually used, every size actually used, line-height range, letter-spacing per size, and a role description of what that family is for. Then a **Type Scale** table mapping semantic roles (caption/body/heading/display, etc.) to size/line-height/letter-spacing/token.
- **Spacing**: base unit, density feel (compact/comfortable/spacious), and the full scale as used (don't invent a clean 4/8/16/32 scale if the file actually uses 4/8/12/16/20/24/28/32/40/64...).
- **Radius**: per element type (cards, images, inputs, buttons, small cards, elevated cards) — radius is often role-specific, not one global value.
- **Layout**: page max-width, section gap, card padding, element gap.
- **Quick reference**: a short "Quick Color Reference" block (text/background/border/muted/accent/primary-action) an agent can scan in one glance.
- **Code output**: emit a CSS custom-properties block (`:root { --token: value; }`) as a preview inside `tokens.md` — this stays markdown, not a separate `.css` file. It exists so the values are directly copy-pasteable, not just tabulated. Don't emit Tailwind or any other framework-specific format here; the scan phase output is framework-agnostic.

### Step 3 — Identify components (→ `components-inventory.md`)

Walk the frame for **repeated or clearly reusable patterns**, not every single layer. A component is: a button, card, nav bar, input, badge, avatar, tag, modal trigger, stat/chart fragment, etc. — something with a name, a recognizable variant set, and a plausible reuse across other pages. A one-off hero illustration is not a component.

For each component, use `figma_get_component_for_development` on its node, then write an entry with:
- **Name** (match Figma's own component naming if it has one)
- **Role** — one line on when/why this component is used, not just what it looks like
- **Variants observed** (e.g. primary/secondary/ghost × sm/md/lg)
- **Full prose spec** — background, text color, border, border-radius, padding, typography (family/size/weight), shadow, and any notable behavior/anatomy detail (icon slots, hover-only affordances, etc.) — written densely enough that an agent could rebuild the component from this paragraph alone, referencing tokens by name (not raw hex/px)
- **Source** — frame name + node id, so it can be re-fetched if the spec ever needs re-verifying

Also derive, once per project (not per component):
- **Do's and Don'ts** — the handful of rules that keep new components consistent with the system (e.g. "never use bold weight in the display font", "cards never get a shadow, only floating artifacts do"). Pull these from patterns you notice being consistently followed or consistently avoided across the components you scanned.
- **Example Component Prompts** — 3-5 ready-to-paste prompts for the most common component types (a card, a button pair, a hero collage, an input), fully spelled out with real token values, so the user or their coding agent can generate a *new* but consistent component without re-deriving the spec.
- **Imagery** — if the frame has a distinct approach to photography/illustration/product-shots, note it briefly (one paragraph, not a full style essay).

### Step 4 — Write/update the two files

Use the templates below. This is a lookup reference for an AI agent, not marketing documentation — but unlike a bare token table, it should read like a real design-system reference: specific, opinionated, and copy-paste ready.

### Step 5 — Stop here

Do not proceed to generating layout or component code in this phase, even if the user's original message also asked for a layout. For an update, pause only when near-duplicates require a merge-vs-keep-separate decision; fresh or append-only catalogs need no extra approval round. Report the catalog changes, then treat it as source of truth for future builds.

## Phase 2: Reuse during layout generation (a separate, later task)

When a build/layout task comes in for a project that has a catalog:
1. Read `components-inventory.md` + `tokens.md` first.
2. For each element the new layout needs, check for a match in the catalog before analyzing the raw Figma frame for it.
   - **Match found** → reference it by name only (e.g. "uses Button-primary/md, Card-elevated — see components-inventory.md") — don't re-paste its full spec into the agent's context, and don't re-fetch the Figma node.
   - **No match / genuinely new element** → analyze it via `figma_get_component_for_development` as normal, then add it back into the catalog (Phase 1, Step 3/4) so it's caught next time.
3. Pass the AI coding agent a short reference (component names + which catalog file to consult) instead of a full re-description of the design — this is the actual credit savings.

## Templates

### `tokens.md`

```markdown
# Design Tokens — {{PROJECT_NAME}}
> {{ONE_LINE_STYLE_SUMMARY}}

**Theme:** {{light/dark}}
Last scanned: {{DATE}} (frame: {{FRAME_NAME}})

{{One short paragraph describing the overall visual character — the same way a
stylist would describe a system in prose: dominant palette behavior, typographic
personality, how color is rationed, how elevation is used. This paragraph is what
lets an agent "get" the system before reading the tables.}}

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| {{Name}} | `{{hex}}` | `--color-{{slug}}` | {{Where/why it's used, specific enough to disambiguate from similar colors}} |

## Tokens — Typography

### {{FontFamily}} — {{one-line role, e.g. "Display and headline serif"}} · `--font-{{slug}}`
- **Substitute:** {{fallback fonts}}
- **Weights:** {{weights actually used}}
- **Sizes:** {{sizes actually used}}
- **Line height:** {{range}}
- **Letter spacing:** {{per-size values}}

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| {{caption/body/heading/display/...}} | {{px}} | {{ratio}} | {{px or —}} | `--text-{{slug}}` |

## Tokens — Spacing & Shapes

**Base unit:** {{px}}
**Density:** {{compact/comfortable/spacious}}

### Spacing Scale
| Name | Value | Token |
|------|-------|-------|
| {{n}} | {{px}} | `--spacing-{{n}}` |

### Border Radius
| Element | Value |
|---------|-------|
| cards / images / inputs / buttons / smallCards / elevatedCards | {{px per element type}} |

### Shadows
| Name | Value | Token |
|------|-------|-------|
| {{name}} | {{css box-shadow value}} | `--shadow-{{slug}}` |

### Layout
- **Page max-width:** {{px}}
- **Section gap:** {{px}}
- **Card padding:** {{px}}
- **Element gap:** {{px}}

## Surfaces
| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | {{value}} | {{purpose}} |

## Elevation
- **{{name}}:** `{{css box-shadow}}`

## Quick Color Reference
- text: {{hex}} / background: {{hex}} / border: {{hex}} / muted text: {{hex}} / accent: {{hex}} / primary action: {{hex}}

## Quick Start — CSS Custom Properties
```css
:root {
  /* generated from the tables above, one variable per token row */
}
```
```

**Note:** this block is a copy-pasteable preview inside the markdown, not a delivered stylesheet. When a real tokens stylesheet is needed for a build, generate it by mechanically transforming this table/block into the format the project's stack consumes — not by re-deriving values from Figma again. That transform is a separate, later step outside this skill's scope (this skill stops at the markdown catalog).

### `components-inventory.md`

```markdown
# Component Inventory — {{PROJECT_NAME}}
Last scanned: {{DATE}} (frame: {{FRAME_NAME}})

## {{ComponentName}}
**Role:** {{one line — when/why this is used}}

{{Dense prose spec: background, text color, border, border-radius, padding,
typography (family/size/weight), shadow, notable anatomy/behavior — written so
an agent can rebuild it from this paragraph alone. Reference tokens by name,
not raw hex/px.}}

**Variants:** {{e.g. primary / secondary / ghost × sm / md / lg}}
**Source:** node {{NODE_ID}} in {{FRAME_NAME}}

<!-- repeat one section per component -->

## Do's and Don'ts

### Do
- {{Rule pulled from a pattern consistently followed across scanned components}}

### Don't
- {{Rule pulled from a pattern consistently avoided}}

## Example Component Prompts
1. **{{Component/composition name}}**: {{Fully spelled-out, copy-paste-ready prompt
   using real token values — not placeholders — so it can be handed straight to a
   coding agent to generate a new-but-consistent piece.}}

## Imagery
{{One short paragraph on the frame's approach to photography/illustration/product
shots, if it has a distinct one. Omit this section if not applicable.}}
```

## Notes for the agent running this skill

- If the Figma file has no attached Variables/Library, tokens will mostly be "local" — say so plainly rather than inventing semantic names for what are really one-off values; suggest the user promote recurring ones to real variables if they want the catalog to stay accurate as the file grows.
- Ask where the project keeps its AI-agent context files (same place as an existing `DESIGN.md`/`SCALING.md`, if any) rather than assuming a location. Don't ask about token output format during scan — the Quick Start block is always plain CSS custom properties (framework-agnostic); the stack-specific transform (Tailwind `@theme`, MUI theme.ts, etc.) happens later, in the build phase.
- Keep entries name-matched to Figma's own component/variable names wherever they exist — divergent naming between Figma and the catalog defeats the point of a lookup reference.
- Prose density matters more than table completeness: a component entry with one well-written spec paragraph is more useful to an agent than a table with ten sparse columns. Match the level of detail in the templates above, not a stripped-down version of them.
