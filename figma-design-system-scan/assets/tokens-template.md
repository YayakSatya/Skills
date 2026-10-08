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
