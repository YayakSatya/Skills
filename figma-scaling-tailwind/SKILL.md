---
name: figma-scaling-tailwind
description: Next.js + Tailwind CSS version of the figma-scaling standard. Registers the 3-point fluid clamp() model (1440px floor, 1920px Figma baseline, 2560px ceiling) as named Tailwind tokens (p-fluid-32, text-fluid-24, max-w-layout) for Tailwind v3 config or v4 @theme, and gives the Tailwind-specific rules for arbitrary clamp() classes, flex column sizing and resets, max-md/max-lg mobile overrides, negative values, and Next.js App Router setup. Use whenever implementing a Figma design in a Next.js + Tailwind project where the Figma canvas width differs from the viewport, when writing or reviewing fluid-* tokens, tailwind.config fluid scales, @theme clamp tokens, arbitrary clamp() classNames, or fixing pinched flex columns, collapsed or ghost-gap stacked columns, or mobile heading overflow in Tailwind. For plain CSS or another framework, use figma-scaling instead.
metadata:
  version: "1.2"
  last-updated: "2026-10-18"
---

# Figma Scaling for Next.js + Tailwind

Tailwind adaptation of the `figma-scaling` skill (SCALING.md v3.3): same formulas, same breakpoints, expressed as Tailwind tokens and utilities, plus Next.js setup.

**Version:** 1.2 · **Last updated:** 2026-10-18 · Change history: [CHANGELOG.md](CHANGELOG.md)

**Scope:** projects confirmed to run **Next.js + Tailwind CSS** (v3 JIT or v4). Tailwind without Next.js: Sections 1-11 still apply, skip Section 12. Next.js without Tailwind, or plain CSS: use `figma-scaling` instead.

---

## 0. Why this exists

The `figma-scaling` clamp() values are valid CSS anywhere, but pasting raw clamp strings into arbitrary classes (`p-[clamp(1.875rem,2.0833vw,3.3333rem)]`) across many components causes two problems:

1. **Repetition and typos**: the same value retyped in every component.
2. **No single source of truth**: changing `SOURCE_FRAME` or `MAX_FRAME` means find-and-replace across the codebase.

So register the token table once as **named Tailwind theme tokens** and write `p-fluid-32` instead of the clamp string.

### The model in one paragraph

Every scalable value is `clamp(MIN_rem, FLUID_vw, MAX_rem)` with `SOURCE_FRAME = 1920`, `TARGET_FRAME = 1440`, `MAX_FRAME = 2560`, 16px rem base:
- `FLUID_vw = figma_px / 19.2`
- `MIN_rem = round_to_0.5px(figma_px × 0.75) / 16`; for **font-size only**, `MIN` is at least `FONT_FLOOR_PX = 15px` (0.9375rem)
- `MAX_rem = figma_px / 12` (= figma_px × 1.3333 / 16)

Below 1440 the value locks to MIN, 1440-2560 interpolates (exact Figma value at 1920), above 2560 it locks to MAX. Full derivation: the `figma-scaling` skill, Sections 2-3.

**Never compute these by hand.** Use the bundled script:

```bash
python3 scripts/fluid_tokens.py 377 --class 'flex-[0_1_'   # -> flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]
python3 scripts/fluid_tokens.py 22 36 --font                # -> v3 fontSize entries with the 15px floor
python3 scripts/fluid_tokens.py 56 --v4                     # -> --spacing-fluid-56: clamp(...);
python3 scripts/fluid_tokens.py --default --v4              # -> the full Section 1 set as @theme lines
```

---

## 1. Token setup

Spacing tokens are keyed by the Figma px they represent. Font tokens use the same keys but apply the 15px floor, so they differ from spacing below 24px.

### Tailwind v3 (`tailwind.config.ts` / `.js`)

```js
module.exports = {
  theme: {
    extend: {
      spacing: {
        'fluid-4':   'clamp(0.1875rem, 0.2083vw, 0.3333rem)',   // 4px
        'fluid-8':   'clamp(0.375rem, 0.4167vw, 0.6667rem)',    // 8px
        'fluid-10':  'clamp(0.46875rem, 0.5208vw, 0.8333rem)',  // 10px
        'fluid-12':  'clamp(0.5625rem, 0.625vw, 1rem)',         // 12px
        'fluid-16':  'clamp(0.75rem, 0.8333vw, 1.3333rem)',     // 16px
        'fluid-20':  'clamp(0.9375rem, 1.0417vw, 1.6667rem)',   // 20px
        'fluid-24':  'clamp(1.125rem, 1.25vw, 2rem)',           // 24px
        'fluid-28':  'clamp(1.3125rem, 1.4583vw, 2.3333rem)',   // 28px
        'fluid-32':  'clamp(1.5rem, 1.6667vw, 2.6667rem)',      // 32px
        'fluid-40':  'clamp(1.875rem, 2.0833vw, 3.3333rem)',    // 40px
        'fluid-48':  'clamp(2.25rem, 2.5vw, 4rem)',             // 48px
        'fluid-64':  'clamp(3rem, 3.3333vw, 5.3333rem)',        // 64px
        'fluid-80':  'clamp(3.75rem, 4.1667vw, 6.6667rem)',     // 80px
        'fluid-120': 'clamp(5.625rem, 6.25vw, 10rem)',          // 120px
        'fluid-160': 'clamp(7.5rem, 8.3333vw, 13.3333rem)',     // 160px
      },
      fontSize: {
        'fluid-12': 'clamp(0.9375rem, 0.625vw, 1rem)',       // 12px, floored to 15px
        'fluid-16': 'clamp(0.9375rem, 0.8333vw, 1.3333rem)', // 16px, floored to 15px
        'fluid-18': 'clamp(0.9375rem, 0.9375vw, 1.5rem)',    // 18px, floored to 15px
        'fluid-20': 'clamp(0.9375rem, 1.0417vw, 1.6667rem)', // 20px, exactly at floor
        'fluid-24': 'clamp(1.125rem, 1.25vw, 2rem)',         // 24px and up: same as spacing
        'fluid-28': 'clamp(1.3125rem, 1.4583vw, 2.3333rem)',
        'fluid-32': 'clamp(1.5rem, 1.6667vw, 2.6667rem)',
        'fluid-40': 'clamp(1.875rem, 2.0833vw, 3.3333rem)',
        'fluid-48': 'clamp(2.25rem, 2.5vw, 4rem)',
        'fluid-64': 'clamp(3rem, 3.3333vw, 5.3333rem)',
      },
      maxWidth: {
        'layout': '160rem',                                       // 2560px
        'layout-content': 'clamp(75rem, 83.3333vw, 133.3333rem)', // 1200 -> 1600 -> 2133px
      },
    },
  },
}
```

### Tailwind v4 (`@theme` in `app/globals.css`, no config file)

v4 reads tokens from theme-variable **namespaces**, and the namespace decides which utilities a token feeds (verified with Tailwind 4.1):

| Utilities | Use | Note |
|---|---|---|
| `p-*`, `m-*`, `gap-*`, `w-*`, `h-*`, `inset-*`, `top-*` ... | `--spacing-*` | |
| `text-*` (font-size) | `--text-*` | `--font-size-*` generates nothing |
| `max-w-*` | `--container-*` | documented v4 namespace; `--max-width-*` also works, keep one convention |

```css
@import "tailwindcss";

@theme {
  --spacing-fluid-4: clamp(0.1875rem, 0.2083vw, 0.3333rem);
  --spacing-fluid-8: clamp(0.375rem, 0.4167vw, 0.6667rem);
  --spacing-fluid-10: clamp(0.46875rem, 0.5208vw, 0.8333rem);
  --spacing-fluid-12: clamp(0.5625rem, 0.625vw, 1rem);
  --spacing-fluid-16: clamp(0.75rem, 0.8333vw, 1.3333rem);
  --spacing-fluid-20: clamp(0.9375rem, 1.0417vw, 1.6667rem);
  --spacing-fluid-24: clamp(1.125rem, 1.25vw, 2rem);
  --spacing-fluid-28: clamp(1.3125rem, 1.4583vw, 2.3333rem);
  --spacing-fluid-32: clamp(1.5rem, 1.6667vw, 2.6667rem);
  --spacing-fluid-40: clamp(1.875rem, 2.0833vw, 3.3333rem);
  --spacing-fluid-48: clamp(2.25rem, 2.5vw, 4rem);
  --spacing-fluid-64: clamp(3rem, 3.3333vw, 5.3333rem);
  --spacing-fluid-80: clamp(3.75rem, 4.1667vw, 6.6667rem);
  --spacing-fluid-120: clamp(5.625rem, 6.25vw, 10rem);
  --spacing-fluid-160: clamp(7.5rem, 8.3333vw, 13.3333rem);

  --text-fluid-12: clamp(0.9375rem, 0.625vw, 1rem);
  --text-fluid-16: clamp(0.9375rem, 0.8333vw, 1.3333rem);
  --text-fluid-18: clamp(0.9375rem, 0.9375vw, 1.5rem);
  --text-fluid-20: clamp(0.9375rem, 1.0417vw, 1.6667rem);
  --text-fluid-24: clamp(1.125rem, 1.25vw, 2rem);
  --text-fluid-28: clamp(1.3125rem, 1.4583vw, 2.3333rem);
  --text-fluid-32: clamp(1.5rem, 1.6667vw, 2.6667rem);
  --text-fluid-40: clamp(1.875rem, 2.0833vw, 3.3333rem);
  --text-fluid-48: clamp(2.25rem, 2.5vw, 4rem);
  --text-fluid-64: clamp(3rem, 3.3333vw, 5.3333rem);

  --container-layout: 160rem;
  --container-layout-content: clamp(75rem, 83.3333vw, 133.3333rem);
}
```

### Usage (both versions)

```html
<div class="px-fluid-32 py-fluid-24 gap-fluid-16">
  <h2 class="text-fluid-32 leading-tight">Heading</h2>
  <p class="text-fluid-16">Body text</p>
</div>
```

`px-fluid-32` resolves to `padding-inline: clamp(1.5rem, 1.6667vw, 2.6667rem)`. Spacing, sizing, gap, inset and position utilities all draw from the spacing scale, so one token set covers them.

---

## 2. Arbitrary values for one-off sizes

Values without a token (13px, 377px) get an arbitrary class. Generate it with the script; it already formats the class correctly:

```bash
python3 scripts/fluid_tokens.py 377 --class 'flex-[0_1_'
# flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]
```

**Underscore rule.** Inside the brackets, top-level spaces must be underscores, or the class is never generated:

```
✅ flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]
❌ flex-[0 1 clamp(17.6875rem, 19.6354vw, 31.4167rem)]
```

Commas inside `clamp(...)` are fine. Only the spaces separating values (here grow / shrink / basis) need `_`. This is the most common breakage when an agent pastes a clamp string into a class.

**Promote at 3 uses.** A one-off value used 3 or more times becomes a named token (Section 1), ideally with a semantic name in `flexBasis` / `maxWidth` (v3) or `--container-*` / `--spacing-*` (v4), e.g. `footer-col`.

---

## 3. Flex child sizing

Same rule as `figma-scaling` Section 4: when the container grows to 2560px, inner flex children must grow with it. Never cap a child at a 1920px-derived fixed value while the parent scales past it; use the clamp whose MAX is the 2560 value.

```html
<!-- Figma: a 377px column on the 1920 canvas -->
<div class="mx-auto flex max-w-layout justify-between">
  <div class="flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]">...</div>
</div>
```

---

## 4. Responsive flex reset

`figma-scaling` Section 5: when a row stacks into a column, the fluid flex-basis must be reset, or the child collapses to 0px (`flex-basis: 0`) or leaves a giant ghost gap (`flex-basis: clamp(...)` acting as a height).

**Direction matters.** Tailwind's `md:` / `lg:` are **min-width** ("this width and up"). SCALING.md's tiers are **max-width** ("this width and below"). Two correct ways to write it; pick one per project and keep it consistent.

**A. Desktop-first, mirrors SCALING.md (recommended when porting existing SCALING.md CSS):**

```html
<div class="flex flex-row max-lg:flex-col">
  <div class="flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)] max-lg:flex-none max-lg:w-full">...</div>
</div>
```

**B. Mobile-first, idiomatic Tailwind:**

```html
<div class="flex flex-col lg:flex-row">
  <div class="w-full lg:w-auto lg:flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]">...</div>
</div>
```

❌ `flex flex-row lg:flex-col` with `lg:flex-none lg:w-full`: this stacks on **desktop** and keeps the row on mobile, the opposite of the intent.

Keep the fluid sizing utility and its reset in the **same className string**, never in a separate override, so an edit to one cannot drift from the other.

---

## 5. Breakpoint mapping

| SCALING.md tier | Meaning | Tailwind desktop-first | Tailwind mobile-first |
|---|---|---|---|
| Mobile `max-width: 768px` | 768 and below | `max-md:` (below 768) | default (no prefix) |
| Tablet `max-width: 1024px` | 1024 and below | `max-lg:` (below 1024) | `md:` (768 and up) |
| Desktop fluid | 1025 and up | default (no prefix) | `lg:` (1024 and up) |
| `TARGET_FRAME` 1440 | clamp floor | none | none |
| `MAX_FRAME` 2560 | clamp ceiling | none | none |

Tailwind's thresholds sit 1px off SCALING.md's (`max-lg:` is `< 1024px`, SCALING.md includes 1024). Accept that; do not add custom breakpoints to chase the pixel.

1440 and 2560 are the **ends of the clamp interpolation**, not places where layout changes. Do not add custom `1440:` / `2560:` breakpoints: they invite snapping values at those widths with separate classes, which reintroduces the pinching bug the continuous clamp prevents. Use `md` / `lg` only for structural changes: nav collapse, column-to-stack, the flex reset, lateral padding tiers.

### Lateral padding tiers (SCALING.md Section 6)

Fluid desktop padding (e.g. 80px) would crush content on small screens, so lock it per tier:

```html
<!-- mobile-first -->
<section class="px-4 md:px-8 lg:px-fluid-80">...</section>
<!-- desktop-first -->
<section class="px-fluid-80 max-lg:px-8 max-md:px-4">...</section>
```

Mobile tier also stacks form rows (`max-md:flex-col max-md:w-full`) and gives maps/embeds `aspect-[4/3] min-h-[280px]`.

---

## 6. Negative values

The negative prefix works with fluid tokens and arbitrary clamp values. For anything it cannot negate by flipping the sign (var, calc, clamp), Tailwind wraps it in `calc(value * -1)`:

```
-mt-[10px]                                     → margin-top: -10px
-mt-[var(--nav-h)]                             → margin-top: calc(var(--nav-h) * -1)
-bottom-fluid-4                                → bottom: calc(clamp(0.1875rem, 0.2083vw, 0.3333rem) * -1)
-bottom-[clamp(0.1875rem,0.2083vw,0.3333rem)]  → same
```

So negate with the prefix and keep the clamp positive. `figma-scaling` Section 7's "MIN must be ≤ MAX, so the most negative value is MIN" rule applies only when you write a **literal negative clamp() by hand** in plain CSS.

---

## 7. Mobile heading overrides

`figma-scaling` Section 8: large display headings need a mobile clamp, or single words overflow at 360-375px. Because the original is a max-width rule, use the `max-md:` variant (Tailwind v3.2+ and v4):

```html
<h1 class="text-fluid-48 max-md:text-[clamp(1.85rem,7vw,2.6rem)]">...</h1>
```

❌ `md:text-[clamp(1.85rem,7vw,2.6rem)]` applies the mobile size on tablet and desktop instead.

On Tailwind older than v3.2 (no `max-*` variants), add a custom screen `{ 'mobile': { max: '768px' } }` and use `mobile:`.

---

## 8. Exceptions (do not scale)

Tailwind's defaults already behave correctly for these; do not create fluid tokens for them:

- **Border width**: `border` is a fixed 1px.
- **Box shadow**: `shadow-*` values are fixed; scale only if a design explicitly asks.
- **Pill / circle radius**: `rounded-full` is 9999px.
- **Line height**: `leading-*` is unitless and follows the fluid font size.
- **Letter spacing**: `tracking-*` is em-based and follows the fluid font size.

---

## 9. Container sizing

```html
<div class="mx-auto w-full max-w-layout">
  <div class="mx-auto max-w-layout-content">...</div>
</div>
```

`max-w-layout` (2560px cap, centered beyond) and `max-w-layout-content` (1200 → 1600 → 2133px) are the Section 1 tokens, equal to `--layout-max` and `--layout-content-max` in `figma-scaling` Section 10.

---

## 10. Agent workflow

1. Read `figma_px` from Figma inspect (on the 1920 canvas).
2. Token exists for that px (Section 1)? Use it: `p-fluid-32`, `text-fluid-24`.
3. No token, one-off: generate with `scripts/fluid_tokens.py` (`--font` for font sizes) and use it as an arbitrary value with underscores for top-level spaces.
4. Same one-off value 3+ times: promote it to a named token.
5. Flex child columns: clamp with the 2560 MAX, never a fixed 1920-derived cap (Section 3).
6. Row stacks into a column: pair the fluid basis with its reset in the same className, in the right direction (Section 4).
7. Mobile-only overrides: `max-md:` / `max-lg:`, never `md:` / `lg:` (Section 7).
8. Negative offsets: negative prefix on a positive token or clamp (Section 6).

---

## 11. Verification checklist

Everything in `figma-scaling` Section 12, plus:

- [ ] No arbitrary class has a literal space inside the brackets.
- [ ] v4 tokens use the right namespaces: `--spacing-*`, `--text-*` (never `--font-size-*`), `--container-*` (Section 1).
- [ ] Every fluid flex-basis has its reset in the same className, and the reset fires on the narrow side (`max-lg:` / `max-md:`, or the mobile-first pattern).
- [ ] Mobile-only overrides use `max-md:` / `max-lg:` (or a custom max-width screen), not `md:` / `lg:`.
- [ ] Negative fluid offsets use the negative prefix on a positive value; any hand-written negative clamp has MIN ≤ MAX.
- [ ] Values reused 3+ times are tokens, not repeated arbitrary classes.
- [ ] Tailwind scans every file containing `fluid-*` or arbitrary clamp classes (v3 `content` globs; v4 automatic detection or `@source` for paths outside the project).
- [ ] No custom `1440:` / `2560:` breakpoints.
- [ ] Layout checked at 360, 768, 1024, 1440, 1920 and 2560.

---

## 12. Next.js notes

1. **Config file.** TypeScript projects use `tailwind.config.ts` with the same object:
   ```ts
   import type { Config } from 'tailwindcss'
   const config: Config = {
     content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
     theme: { extend: { spacing: { 'fluid-32': 'clamp(1.5rem, 1.6667vw, 2.6667rem)' /* ... */ } } },
   }
   export default config
   ```
   Tailwind v4 + Next.js: tokens live in `app/globals.css` under `@theme`; no config file.

2. **v3 content globs must cover the App Router.** JIT only generates classes it sees:
   ```js
   content: [
     './app/**/*.{js,ts,jsx,tsx,mdx}',
     './components/**/*.{js,ts,jsx,tsx,mdx}',
     './src/**/*.{js,ts,jsx,tsx,mdx}', // if using src/
   ]
   ```
   Class names built by string concatenation (`'p-fluid-' + size`) are never detected in either version; write full class names.

3. **Do not disable zoom.** Root `font-size: 100%` (SCALING.md Section 9) only helps if users can zoom. In `app/layout.tsx`, never export `viewport` with `userScalable: false` or `maximumScale: 1`.

4. **`next/font` does not set the rem base.** It sets `font-family` (and optionally a CSS variable) only. Keep `html { font-size: 100%; }` explicit in `app/globals.css` (or leave it unset); never 62.5% or 75%, which would compound the scale.

5. **Server vs Client Components do not matter here.** Everything resolves in CSS at paint time; no `'use client'` is needed for scaling.

---

## Bundled files

- `scripts/fluid_tokens.py`: computes clamp values with the figma-scaling formulas and prints v3 config entries, v4 `@theme` lines (`--v4`), or a ready arbitrary class (`--class PREFIX`); `--font` applies the 15px floor; `--default` prints the Section 1 set.
