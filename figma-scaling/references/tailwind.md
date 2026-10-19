# Tailwind CSS (and Next.js)

Read this when the project uses **Tailwind CSS** (v3 JIT or v4). Same model and the same values as `SKILL.md`, expressed as Tailwind tokens and utilities, plus Next.js setup. Sections here are numbered on their own; "SKILL.md Section N" points to the main file, which still applies in full.

**Scope:** Tailwind without Next.js: Sections 1-11 apply, skip Section 12. No Tailwind (plain CSS, CSS Modules, SCSS, also inside Next.js): `SKILL.md` alone.

---

## 0. Why this exists

The `SKILL.md` clamp() values are valid CSS anywhere, but pasting raw clamp strings into arbitrary classes (`p-[clamp(1.875rem,2.0833vw,3.3333rem)]`) across many components causes two problems:

1. **Repetition and typos**: the same value retyped in every component.
2. **No single source of truth**: changing `SOURCE_FRAME` or `MAX_FRAME` means find-and-replace across the codebase.

So register the token table once as **named Tailwind theme tokens** and write `p-fluid-32` instead of the clamp string.

### The model in one paragraph

Same values as SKILL.md Section 2: from 1440 up, `clamp(MIN_rem, FLUID_vw, MAX_rem)` on the 1920 → 2560 line (exact Figma value at 1920). Below 1440, spacing and font tokens follow a line from a derived **phone value at 390px** to the 1440 value, so tablet falls proportionally between them; larger values shrink more on phones (120px padding → 53.5px, a 64px H1 → 32px). Sizes never follow the phone curve: grid-bound sizes (columns, gutters, composed boxes) are proportional from 1024 up (`--grid`), physical sizes (icons, buttons) hold their 1440 value (`--size`). A phone value from the design (a Figma Mobile mode) replaces the derived one with `--mobile`. Full derivation and tables: SKILL.md Sections 2, 3 and 8.

**Never compute these by hand.** Use the bundled script:

```bash
python3 scripts/fluid_tokens.py 377 --grid --class 'flex-[0_1_'  # column width -> flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]
python3 scripts/fluid_tokens.py 22 --font body              # -> v3 fontSize entry, body floor (16px, never above Figma)
python3 scripts/fluid_tokens.py 88 --font --mobile 46 --v4  # -> h2 with the phone size from a Figma Mobile mode
python3 scripts/fluid_tokens.py 210 88 72 --font --min-ratio 1.15 --v4  # -> heading set with visible steps on phones
python3 scripts/fluid_tokens.py 56 --v4                     # -> --spacing-fluid-56: clamp(...); (spacing, with the phone line)
python3 scripts/fluid_tokens.py --default --v4              # -> the full Section 1 set as @theme lines
```

---

## 1. Token setup

Spacing tokens are keyed by the Figma px they represent. Font tokens use the same keys with the 15px floor and a stronger phone curve, so they differ from spacing below 20px and from 32px up. Below 11.25px the floor is above the 2560 value, so the script locks the size at 15px (`clamp(0.9375rem, …, 0.9375rem)`); CSS would resolve a hand-written MIN > MAX the same way, but the locked form says what it does.

### Tailwind v3 (`tailwind.config.ts` / `.js`)

```js
module.exports = {
  theme: {
    extend: {
      spacing: {
        'fluid-4':   'clamp(0.1875rem, 0.2083vw, 0.3333rem)',  // 4px
        'fluid-8':   'clamp(0.375rem, 0.4167vw, 0.6667rem)',  // 8px
        'fluid-10':  'clamp(0.46875rem, 0.5208vw, 0.8333rem)',  // 10px
        'fluid-12':  'clamp(0.5625rem, 0.625vw, 1rem)',  // 12px
        'fluid-16':  'clamp(0.75rem, 0.8333vw, 1.3333rem)',  // 16px
        'fluid-20':  'clamp(0.9375rem, 1.0417vw, 1.6667rem)',  // 20px
        'fluid-24':  'clamp(1.125rem, 1.25vw, 2rem)',  // 24px
        'fluid-28':  'clamp(1.3125rem, 1.4583vw, 2.3333rem)',  // 28px
        'fluid-32':  'clamp(1.5rem, 1.6667vw, 2.6667rem)',  // 32px
        'fluid-40':  'clamp(1.7143rem, max(min(1.6607rem + 0.2381vw, 1.875rem), 2.0833vw), 3.3333rem)',  // 40px
        'fluid-48':  'clamp(1.9286rem, max(min(1.8214rem + 0.4762vw, 2.25rem), 2.5vw), 4rem)',  // 48px
        'fluid-64':  'clamp(2.2929rem, max(min(2.0571rem + 1.0476vw, 3rem), 3.3333vw), 5.3333rem)',  // 64px
        'fluid-80':  'clamp(2.5929rem, max(min(2.2071rem + 1.7143vw, 3.75rem), 4.1667vw), 6.6667rem)',  // 80px
        'fluid-120': 'clamp(3.2786rem, max(min(2.4964rem + 3.4762vw, 5.625rem), 6.25vw), 10rem)',  // 120px
        'fluid-160': 'clamp(3.8679rem, max(min(2.6571rem + 5.381vw, 7.5rem), 8.3333vw), 13.3333rem)',  // 160px
      },
      fontSize: {
        'fluid-12':  'clamp(0.9375rem, 0.625vw, 1rem)',  // 12px
        'fluid-16':  'clamp(0.9375rem, 0.8333vw, 1.3333rem)',  // 16px
        'fluid-18':  'clamp(0.9375rem, 0.9375vw, 1.5rem)',  // 18px
        'fluid-20':  'clamp(0.9375rem, 1.0417vw, 1.6667rem)',  // 20px
        'fluid-24':  'clamp(1.125rem, 1.25vw, 2rem)',  // 24px
        'fluid-28':  'clamp(1.3125rem, 1.4583vw, 2.3333rem)',  // 28px
        'fluid-32':  'clamp(1.4036rem, max(min(1.3714rem + 0.1429vw, 1.5rem), 1.6667vw), 2.6667rem)',  // 32px
        'fluid-40':  'clamp(1.5857rem, max(min(1.4893rem + 0.4286vw, 1.875rem), 2.0833vw), 3.3333rem)',  // 40px
        'fluid-48':  'clamp(1.7036rem, max(min(1.5214rem + 0.8095vw, 2.25rem), 2.5vw), 4rem)',  // 48px
        'fluid-64':  'clamp(1.9714rem, max(min(1.6286rem + 1.5238vw, 3rem), 3.3333vw), 5.3333rem)',  // 64px
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
  --spacing-fluid-40: clamp(1.7143rem, max(min(1.6607rem + 0.2381vw, 1.875rem), 2.0833vw), 3.3333rem);
  --spacing-fluid-48: clamp(1.9286rem, max(min(1.8214rem + 0.4762vw, 2.25rem), 2.5vw), 4rem);
  --spacing-fluid-64: clamp(2.2929rem, max(min(2.0571rem + 1.0476vw, 3rem), 3.3333vw), 5.3333rem);
  --spacing-fluid-80: clamp(2.5929rem, max(min(2.2071rem + 1.7143vw, 3.75rem), 4.1667vw), 6.6667rem);
  --spacing-fluid-120: clamp(3.2786rem, max(min(2.4964rem + 3.4762vw, 5.625rem), 6.25vw), 10rem);
  --spacing-fluid-160: clamp(3.8679rem, max(min(2.6571rem + 5.381vw, 7.5rem), 8.3333vw), 13.3333rem);

  --text-fluid-12: clamp(0.9375rem, 0.625vw, 1rem);
  --text-fluid-16: clamp(0.9375rem, 0.8333vw, 1.3333rem);
  --text-fluid-18: clamp(0.9375rem, 0.9375vw, 1.5rem);
  --text-fluid-20: clamp(0.9375rem, 1.0417vw, 1.6667rem);
  --text-fluid-24: clamp(1.125rem, 1.25vw, 2rem);
  --text-fluid-28: clamp(1.3125rem, 1.4583vw, 2.3333rem);
  --text-fluid-32: clamp(1.4036rem, max(min(1.3714rem + 0.1429vw, 1.5rem), 1.6667vw), 2.6667rem);
  --text-fluid-40: clamp(1.5857rem, max(min(1.4893rem + 0.4286vw, 1.875rem), 2.0833vw), 3.3333rem);
  --text-fluid-48: clamp(1.7036rem, max(min(1.5214rem + 0.8095vw, 2.25rem), 2.5vw), 4rem);
  --text-fluid-64: clamp(1.9714rem, max(min(1.6286rem + 1.5238vw, 3rem), 3.3333vw), 5.3333rem);

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

`px-fluid-32` resolves to `padding-inline: clamp(1.5rem, 1.6667vw, 2.6667rem)` in v4 (`padding-left` + `padding-right` in v3). Spacing, sizing, gap, inset and position utilities all draw from the spacing scale.

**Widths, heights and positions are sizes, not spacing.** `w-fluid-*` / `h-fluid-*` / `top-fluid-*` would follow the phone curve (a 64px icon at 37px on a phone). Register sizes from the script by kind (SKILL.md Section 11, step 1):

```bash
python3 scripts/fluid_tokens.py 315 377 --grid --v4   # --spacing-grid-315 ...  -> w-grid-315, h-, top-, max-w-grid-315
python3 scripts/fluid_tokens.py 24 48 --size --v4     # --spacing-size-24 ...   -> size-size-24, w-size-48, h-size-48
```

Both print into `--spacing-*` on purpose: in v4 that namespace feeds `w-`, `h-`, `size-`, `inset-`/`top-`, `max-w-`, `p-`, `m-` and `gap-`. A `--size-*` variable would only feed `size-*` (verified with Tailwind 4.1.11). In v3 put the default output under `theme.extend.spacing` (`w-`, `h-`, `top-`, `size-`), and repeat a key under `maxWidth` if you need `max-w-grid-N`.

Use `--grid` for columns, cards, gutters, section heights and everything inside a composed box (absolute `top`/`left`, inner padding), so the whole box shrinks with the screen between 1024 and 1440. Use `--size` for icons, avatars, logos and button heights.

**Grid tokens only from `lg:`.** Below 1024 a grid token holds its 1024 value (about 53% of Figma). Write `lg:w-grid-427`, never a bare `w-grid-427` or `md:w-grid-427`, and give tablet and phone their own width (`w-full`, a rem, or an em measure).

**Text widths are em, not grid** (SKILL.md Section 8): `lg:max-w-[6.2857em]` for a heading, `max-w-[28.5em]` for a paragraph measure, from `fluid_tokens.py --measure WIDTH FONT --class 'max-w-['`. Beside a grid-positioned photo, cap it: `w-[min(28.5em,var(--spacing-grid-640))]`. Paragraphs get `text-pretty`.

### Line height: always pair `text-fluid-*` with a leading

Tailwind's own `text-xl` etc. set a line-height; the `text-fluid-*` tokens above set **font-size only**. Without a leading, a heading inherits the body's line-height (often 1.5) and reads loose. Pick one, per project:

- **Per element**: `text-fluid-32 leading-tight`, or the shorthand `text-fluid-32/tight` (v3.3+ and v4).
- **Baked into the token** (verified with 3.4.17 and 4.1.11; `leading-*` still overrides it):
  ```js
  // v3
  fontSize: { 'fluid-32': ['clamp(1.4036rem, max(min(1.3714rem + 0.1429vw, 1.5rem), 1.6667vw), 2.6667rem)', { lineHeight: '1.2' }] }
  ```
  ```css
  /* v4 */
  --text-fluid-32: clamp(1.4036rem, max(min(1.3714rem + 0.1429vw, 1.5rem), 1.6667vw), 2.6667rem);
  --text-fluid-32--line-height: 1.2;
  ```

Take the value from Figma (line height ÷ font size, unitless) so it follows the fluid size. Never a px or rem line-height: it would not scale with the clamp.

**Body text on phones** that lands under about 18px usually needs `1.5` or more; override it for the narrow tier only, e.g. `text-fluid-24 leading-[1.4167] max-lg:leading-normal`. This is an accepted exception, not a model violation.

---

## 2. Arbitrary values for one-off sizes

Values without a token (13px, 377px) get an arbitrary class. Generate it with the script; it already formats the class correctly:

```bash
python3 scripts/fluid_tokens.py 377 --grid --class 'flex-[0_1_'   # a column width: --grid
# flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]
python3 scripts/fluid_tokens.py 96 --class 'py-['                 # a one-off spacing value
# py-[clamp(2.8929rem,max(min(2.3571rem_+_2.381vw,4.5rem),5vw),8rem)]
```

**Underscore rule.** Inside the brackets, top-level spaces must be underscores, or the class is never generated:

```
✅ flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]
❌ flex-[0 1 clamp(12.5625rem, 19.6354vw, 31.4167rem)]
```

Commas inside `clamp(...)` are fine. The spaces separating values (here grow / shrink / basis) and the spaces around `+` / `-` in the phone line need `_`; the script writes both. This is the most common breakage when an agent pastes a clamp string into a class.

**Promote at 3 uses.** A one-off value used 3 or more times becomes a named token (Section 1), ideally with a semantic name in `flexBasis` / `maxWidth` (v3) or `--container-*` / `--spacing-*` (v4), e.g. `footer-col`.

---

## 3. Flex child sizing

Same rule as SKILL.md Section 4: when the container grows to 2560px, inner flex children must grow with it. Never cap a child at a 1920px-derived fixed value while the parent scales past it; use the clamp whose MAX is the 2560 value.

```html
<!-- Figma: a 377px column on the 1920 canvas -->
<div class="mx-auto flex max-w-layout justify-between">
  <div class="flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]">...</div>
</div>
```

A column that holds an em-width heading gets `min-w-0`, or the em width grows the column and the page scrolls sideways.

---

## 4. Responsive flex reset

SKILL.md Section 5: when a row stacks into a column, the fluid flex-basis must be reset, or the child collapses to 0px (`flex-basis: 0`) or leaves a giant ghost gap (`flex-basis: clamp(...)` acting as a height).

**Direction matters.** Tailwind's `md:` / `lg:` are **min-width** ("this width and up"). SKILL.md's tiers are **max-width** ("this width and below"). Two correct ways to write it; pick one per project and keep it consistent.

**A. Desktop-first, mirrors SKILL.md (recommended when porting existing plain-CSS media queries):**

```html
<div class="flex flex-row max-lg:flex-col">
  <div class="flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)] max-lg:flex-none max-lg:w-full">...</div>
</div>
```

**B. Mobile-first, idiomatic Tailwind:**

```html
<div class="flex flex-col lg:flex-row">
  <div class="w-full lg:w-auto lg:flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]">...</div>
</div>
```

❌ `flex flex-row lg:flex-col` with `lg:flex-none lg:w-full`: this stacks on **desktop** and keeps the row on mobile, the opposite of the intent.

Keep the fluid sizing utility and its reset in the **same className string**, never in a separate override, so an edit to one cannot drift from the other.

---

## 5. Breakpoint mapping

| SKILL.md tier | Meaning | Tailwind desktop-first | Tailwind mobile-first |
|---|---|---|---|
| Mobile `max-width: 768px` | 768 and below | `max-md:` (below 768) | default (no prefix) |
| Tablet `max-width: 1024px` | 1024 and below | `max-lg:` (below 1024) | `md:` (768 and up) |
| Desktop fluid | 1025 and up | default (no prefix) | `lg:` (1024 and up) |
| `TARGET_FRAME` 1440 | clamp floor | none | none |
| `MAX_FRAME` 2560 | clamp ceiling | none | none |

Tailwind's thresholds sit 1px off SKILL.md's (`max-lg:` is `< 1024px`, SKILL.md includes 1024). Accept that; do not add custom breakpoints to chase the pixel.

1440 and 2560 are the **ends of the clamp interpolation**, not places where layout changes. Do not add custom `1440:` / `2560:` breakpoints: they invite snapping values at those widths with separate classes, which reintroduces the pinching bug the continuous clamp prevents. Use `md` / `lg` only for structural changes: nav collapse, column-to-stack, the flex reset, lateral padding tiers.

### Lateral padding tiers (SKILL.md Section 6)

Fluid desktop padding (e.g. 80px) would crush content on small screens, so lock it per tier:

```html
<!-- mobile-first -->
<section class="px-4 md:px-8 lg:px-fluid-80">...</section>
<!-- desktop-first -->
<section class="px-fluid-80 max-lg:px-8 max-md:px-4">...</section>
```

Mobile tier also stacks form rows (`max-md:flex-col max-md:w-full`) and gives maps/embeds `aspect-[4/3] min-h-[280px]`. Tablet puts short groups (contact blocks, link lists) in two columns: `md:grid md:grid-cols-2 lg:flex`.

### First screen

A hero built from a grid height keeps a viewport floor from `lg` too: `lg:h-grid-1380 min-h-svh` (never `lg:min-h-0`). Without it a 1024×768 tablet shows the next section under the first screen.

### Input, not width (SKILL.md Section 6)

`lg:` means wide, not "has a mouse": a tablet in landscape is `lg` with touch. Put mouse-only layout (cursor trails, hover reveals, held full-screen sections) behind a mouse variant:

```css
/* v4, app/globals.css */
@custom-variant mouse (@media (hover: hover) and (pointer: fine));
```
```js
// v3, tailwind.config.js
plugins: [require('tailwindcss/plugin')(({ addVariant }) => addVariant('mouse', '@media (hover: hover) and (pointer: fine)'))]
```
```html
<section class="py-fluid-120 mouse:lg:h-svh mouse:lg:py-0">...</section>
```

v4's built-in `pointer-fine:` is `@media (pointer: fine)` only, without the hover check, and v3 has no pointer variant (both verified by compiling 4.1.11 and 3.4.17).

---

## 6. Negative values

The negative prefix works with fluid tokens and arbitrary clamp values. For anything it cannot negate by flipping the sign (var, calc, clamp), Tailwind wraps it in `calc(value * -1)`:

```
-mt-[10px]                                     → margin-top: -10px
-mt-[var(--nav-h)]                             → margin-top: calc(var(--nav-h) * -1)
-bottom-fluid-4                                → bottom: calc(clamp(0.1875rem, 0.2083vw, 0.3333rem) * -1)
-bottom-[clamp(0.1875rem,0.2083vw,0.3333rem)]  → same
```

So negate with the prefix and keep the clamp positive. This is the Tailwind form of SKILL.md Section 7's preferred `calc(-1 * clamp(...))`. The swapped-ends rule there applies only to a **negative clamp() written by hand**.

---

## 7. Mobile heading check

`text-fluid-*` already brings large headings down on phones (`text-fluid-64` is 32px at 390, SKILL.md Section 8). Still check the longest word of each display heading at 360px. If one overflows, override that heading only, with the `max-md:` variant (Tailwind v3.2+ and v4):

```html
<h1 class="text-fluid-64 max-md:text-[clamp(1.85rem,7vw,2.6rem)]">...</h1>
```

❌ `md:text-[clamp(1.85rem,7vw,2.6rem)]` applies the mobile size on tablet and desktop instead.

On Tailwind older than v3.2 (no `max-*` variants), add a custom screen `{ 'mobile': { max: '768px' } }` and use `mobile:`.

**Designed line count.** A heading held to N lines with an em max-width can gain a line on a narrow phone, because the em width grows past the content box. Cap the font so the em width always fits (2rem = both lateral paddings):

```html
<h1 class="max-w-[6.08em] text-[min(var(--text-fluid-210),calc((100vw_-_2rem)/6.08))]">...</h1>
```

---

## 8. Exceptions (do not scale)

Tailwind's defaults already behave correctly for these; do not create fluid tokens for them:

- **Border width**: `border` is a fixed 1px.
- **Box shadow**: `shadow-*` values are fixed; scale only if a design explicitly asks.
- **Pill / circle radius**: `rounded-full` is 9999px.
- **Line height**: `leading-*` is unitless and follows the fluid font size.
- **Letter spacing**: `tracking-*` is em-based and follows the fluid font size.
- **Tap targets**: give interactive text `min-h-11 inline-flex items-center` (44px) by default, instead of relying on line height × padding: a smaller font token shrinks a padded link below 44px. Inputs use the `body` font role (16px or more) or iOS Safari zooms on focus.

---

## 9. Container sizing

```html
<div class="mx-auto w-full max-w-layout">
  <div class="mx-auto max-w-layout-content">...</div>
</div>
```

`max-w-layout` (2560px cap, centered beyond) and `max-w-layout-content` (1200 → 1600 → 2133px) are the Section 1 tokens, equal to `--layout-max` and `--layout-content-max` in SKILL.md Section 10.

---

## 10. Agent workflow

1. Read `figma_px` from Figma inspect (on the 1920 canvas).
2. Token exists for that px (Section 1)? Use it: `p-fluid-32`, `text-fluid-24`.
3. No token, one-off: generate with `scripts/fluid_tokens.py` with the kind's flag (spacing by default, `--font ROLE`, `--grid` for columns, gutters and composed boxes, `--size` for icons and buttons; `--mobile` when the design has a phone value) and use it as an arbitrary value; `--class` writes the underscores.
4. Same one-off value 3+ times: promote it to a named token.
5. Flex child columns: clamp with the 2560 MAX, never a fixed 1920-derived cap (Section 3).
6. Row stacks into a column: pair the fluid basis with its reset in the same className, in the right direction (Section 4).
7. Mobile-only overrides: `max-md:` / `max-lg:`, never `md:` / `lg:` (Section 7).
8. Negative offsets: negative prefix on a positive token or clamp (Section 6).
9. Every `text-fluid-*` gets a unitless leading from Figma, per element or baked into the token (Section 1).

---

## 11. Verification checklist

Everything in SKILL.md Section 12, plus:

- [ ] No arbitrary class has a literal space inside the brackets.
- [ ] v4 tokens use the right namespaces: `--spacing-*`, `--text-*` (never `--font-size-*`), `--container-*` (Section 1).
- [ ] Every fluid flex-basis has its reset in the same className, and the reset fires on the narrow side (`max-lg:` / `max-md:`, or the mobile-first pattern).
- [ ] Mobile-only overrides use `max-md:` / `max-lg:` (or a custom max-width screen), not `md:` / `lg:`.
- [ ] Negative fluid offsets use the negative prefix on a positive value; any hand-written negative clamp has MIN ≤ MAX.
- [ ] Values reused 3+ times are tokens, not repeated arbitrary classes.
- [ ] Every `text-fluid-*` has a unitless line-height (a `leading-*`, the `/leading` shorthand, or one baked into the token).
- [ ] Tailwind scans every file containing `fluid-*` or arbitrary clamp classes (v3 `content` globs; v4 automatic detection or `@source` for paths outside the project).
- [ ] No custom `1440:` / `2560:` breakpoints.
- [ ] Widths, heights and positions come from `--grid` / `--size` tokens (`w-grid-*`, `size-size-*`), never `w-fluid-*` / `h-fluid-*` / `top-fluid-*`.
- [ ] Interactive text has `min-h-11`; tap targets re-measured after font token changes.
- [ ] Grid tokens only behind `lg:` / `xl:`; text widths in em (`max-w-[Nem]`), paragraphs `text-pretty`.
- [ ] Mouse-only layout behind `mouse:` (not `lg:` alone, not v4 `pointer-fine:` alone).
- [ ] Hero keeps `min-h-svh` at `lg`.
- [ ] `node scripts/check_layout.mjs <url>` clean, at real sizes with touch (SKILL.md Section 12).

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

3. **Do not disable zoom.** Root `font-size: 100%` (SKILL.md Section 9) only helps if users can zoom. In `app/layout.tsx`, never export `viewport` with `userScalable: false` or `maximumScale: 1`.

4. **`next/font` does not set the rem base.** It sets `font-family` (and optionally a CSS variable) only. Keep `html { font-size: 100%; }` explicit in `app/globals.css` (or leave it unset); never 62.5% or 75%, which would compound the scale.

5. **Server vs Client Components do not matter here.** Everything resolves in CSS at paint time; no `'use client'` is needed for scaling.

