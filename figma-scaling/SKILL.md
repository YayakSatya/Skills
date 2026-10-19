---
name: figma-scaling
description: Converts Figma px values into fluid clamp() values for sites designed only on a 1920 desktop frame: 1440 laptop floor, 1920 baseline, 2560 2K ceiling, and phone values derived from the desktop ones (or taken from a Figma mobile frame or Mobile variable mode) so tablet and mobile scale proportionally (360-1440), for plain CSS and Tailwind CSS v3/v4 (fluid-* tokens in tailwind.config or @theme, arbitrary clamp classes, Next.js setup). A bundled script computes every value. Use whenever slicing a Figma design into HTML/CSS or Tailwind, when writing or reviewing clamp()/vw/rem sizing or fluid-* tokens, making a desktop-only design responsive, fixing flex columns that look pinched ("menyempit") on wide screens or collapse/leave ghost gaps when stacked, handling negative clamp() values, font-size floors or mobile heading overflow, or when the user mentions Figma scaling, SCALING.md, fluid typography, or pixel-perfect-but-responsive implementation.
metadata:
  version: "5.2"
  last-updated: "2026-10-19"
---

# Figma Scaling Strategy: Figma → Implementation

Reusable standard for any Figma canvas built on a fixed frame width (Desktop Fluid + Responsive Tiers).

**Version:** 5.2 · **Last updated:** 2026-10-19 · Change history: [CHANGELOG.md](CHANGELOG.md)

**By stack:** this file is the standard for every stack (model, values, rules, checklist).
- **Plain CSS / CSS Modules / SCSS** (also inside Next.js): this file is enough. Tokens as CSS custom properties: `python3 scripts/fluid_tokens.py --default --css`.
- **Tailwind CSS v3 or v4** (with or without Next.js): also read [references/tailwind.md](references/tailwind.md) before writing classes. It maps these values to `fluid-*` tokens and covers the Tailwind-only pitfalls.

**Never compute values by hand.** `scripts/fluid_tokens.py` applies the formulas below, including rounding, the font floor and the mobile line:

```bash
python3 scripts/fluid_tokens.py 120 --css       # spacing (with the mobile line) as a custom property
python3 scripts/fluid_tokens.py 377 --grid --css # a grid-bound width: column, card, page margin
python3 scripts/fluid_tokens.py 48 --size --css  # a physical size: icon, avatar, button
python3 scripts/fluid_tokens.py 22 36 --font    # font sizes, 15px floor applied
python3 scripts/fluid_tokens.py --default --css # the Section 3 set as :root custom properties
```

---

## 1. Configurable Parameters

Configure these variables at project kickoff. All formulas and tables throughout this document derive from these values; if a project changes them, change the constants at the top of `scripts/fluid_tokens.py` to match (the Section 3 table and the tests assume the defaults):

```
// --- Viewport Reference Frames (px) ---
SOURCE_FRAME     = 1920   // Figma canvas base width (1.0x baseline match)
TARGET_FRAME     = 1440   // Primary compact laptop width (minimum floor)
MAX_FRAME        = 2560   // 2K desktop width (maximum ceiling)

// --- Derived Scaling Ratios ---
SCALE_RATIO_MIN  = TARGET_FRAME / SOURCE_FRAME   // = 0.75  (-25%)
SCALE_RATIO_MAX  = MAX_FRAME / SOURCE_FRAME      // = 1.3333 (+33.3%)

// --- Mobile (the Figma file has only the 1920 desktop frame) ---
MOBILE_FRAME     = 390    // phone width the mobile value is derived for
MOBILE_MIN_FRAME = 360    // smallest phone width; the line stops here
CURVE_BASE_PX    = 16     // values up to this size are not reduced further
SPACE_EXPONENT   = 0.6    // spacing: mobile = 16 * (px / 16) ^ 0.6
FONT_EXPONENT    = 0.5    // font-size: mobile = 16 * (px / 16) ^ 0.5 (headings compress more)
GRID_FLOOR_FRAME = 1024   // grid-bound sizes are proportional down to the tablet tier

// --- Font floors per role (never above the Figma value: floor = min(role, figma_px)) ---
FONT_FLOOR_BODY    = 16   // running text (iOS/Android body guidance 16–17px)
FONT_FLOOR_UI      = 14   // eyebrow, label (nav and buttons are safer at 15)
FONT_FLOOR_CAPTION = 12   // legal, meta, badge, footnote; 12px is the hard minimum

// --- Foundations ---
BASE_REM_PX      = 16     // Standard browser default font-size (100%)
ROUNDING_STEP    = 0.5    // Round px to nearest 0.5px before converting to rem
FONT_FLOOR_PX    = 15     // Absolute minimum body/label font size for readability
```

---

## 2. The Fluid Model (360 → 390 → 1440 → 1920 → 2560)

Most projects only have the **1920 desktop frame** in Figma. The model therefore derives the phone value from the desktop value, and every scalable property is still one CSS `clamp()`, with no media query.

**1440px and up (unchanged since 3.x):** three points on a line through the origin:

$$\text{value}(w) = \text{figma\_px} \times \frac{w}{\text{SOURCE\_FRAME}}$$

```css
property: clamp(MIN_rem, FLUID_vw, MAX_rem);
```

**Below 1440px:** a straight line from the derived **mobile value at 390px** to the **1440 value**, so tablet sizes fall proportionally between the two, extended down to 360px. Spacing (padding, margin, gap) and font sizes use it. Sizes do not: **grid-bound** sizes (columns, cards, page margin, gutters, section heights, positions inside a composed box) are proportional down to 1024 (formula 6, `--grid`), and **physical** sizes (icons, avatars, buttons, tap targets) hold their 1440 value (`--size`). Section 11 step 1 says which is which. Small values keep the 1440 value (spacing up to 32px, font up to 24px), so their `clamp()` is the three-point form above. Larger values get:

```css
property: clamp(LOW_rem, max(min(A_rem + B_vw, MIN_rem), FLUID_vw), MAX_rem);
/* LOW = value at 360px, A + B·w = the mobile line (capped at the 1440 value MIN_rem), FLUID_vw = the desktop line */
```

### Formulas:

1. **Fluid Term (`vw`):**
   ```
   fluid_vw = (figma_px / (SOURCE_FRAME / 100)) vw
   // Example for 1920 base: fluid_vw = figma_px / 19.2
   ```

2. **Laptop Floor (`MIN_rem` at TARGET_FRAME):**
   ```
   min_px  = round_to_0.5(figma_px * SCALE_RATIO_MIN)
   MIN_rem = max(min_px, FONT_FLOOR_PX) / BASE_REM_PX rem
   ```

3. **2K Ceiling (`MAX_rem` at MAX_FRAME):**
   ```
   max_px  = figma_px * SCALE_RATIO_MAX        // not rounded, as in the Section 3 table
   MAX_rem = max_px / BASE_REM_PX rem          // 4 decimals
   // For 1920 -> 2560 (1.3333x): MAX_rem = figma_px / 12 rem
   // Font only: if MAX_rem < MIN_rem (Figma text under 11.25px), set MAX_rem = MIN_rem (locks at 15px)
   ```

4. **Mobile value (at MOBILE_FRAME 390):**
   ```
   mobile_px = round_to_0.5(16 * (figma_px / 16) ^ exponent)   // 0.6 spacing, 0.5 font
   mobile_px = max(mobile_px, FONT_FLOOR_PX)                   // font only
   mobile_px = max(mobile_px, round_to_0.5(figma_px * 0.25))   // never under a quarter of desktop
   mobile_px = min(mobile_px, min_px)                          // never above the 1440 value
   ```
   Large values shrink most: 120px section padding → 53.5px, a 64px H1 → 32px, a 16px gap stays at its 1440 value (12px).

   **When the design gives a phone value, use it** (`--mobile PX`): a Figma mobile frame, or a variable collection with a "Mobile" mode (common for Typography even without a mobile frame), or a size the client approved. It replaces the derived `mobile_px`; the line and the `clamp()` form stay the same. A phone value above the 1440 value is allowed (an 18px phone body over a 16px laptop body): the line then slopes down to the 1440 value, written `clamp(MIN_rem, max(A_rem - B_vw, FLUID_vw), MAX_rem)`.

5. **Mobile line (390 → 1440), only when `mobile_px < min_px`:**
   ```
   B_px_per_px = (min_px - mobile_px) / (TARGET_FRAME - MOBILE_FRAME)
   A_px        = mobile_px - B_px_per_px * MOBILE_FRAME
   B_vw        = B_px_per_px * 100
   LOW_px      = A_px + B_px_per_px * MOBILE_MIN_FRAME            // font: at least FONT_FLOOR_PX
   clamp(LOW_rem, max(min(A_rem + B_vw, MIN_rem), FLUID_vw), MAX_rem)
   ```
   Below 1440 the mobile line is above the desktop line, so `max()` picks it; from 1440 up, `min()` holds it at the 1440 value and `max()` gives exactly the three-point result, so every value from 1440 up is unchanged. Verified in Chromium at 360, 390, 768, 1024, 1440, 1920 and 2560 (within 0.02px of the script); the tests check 1440–3000 against the three-point model.

6. **Grid-bound sizes (`--grid`):** the three-point form with its floor at 1024 instead of 1440:
   ```
   grid_min_px = round_to_0.5(figma_px * GRID_FLOOR_FRAME / SOURCE_FRAME)
   clamp(grid_min_rem, FLUID_vw, MAX_rem)
   ```
   Between 1024 and 1440 every column, gutter and composed box shrinks with the screen, so a row designed for 1920 still fits: the desktop composition is kept down to 1024 (Section 6), and at 1024 the 12-column grid is exactly 1024 wide. From 1440 up it equals `--size` (within the 0.25px of the 1440 rounding). Below 1024 it holds the 1024 value; columns stack to 100% there anyway (Section 5).

### Viewport Behavior:
- **< 360px:** locks to the 360 value.
- **360px – 1440px (Phone to laptop):** spacing and font follow the mobile line: the phone value at 390, proportional through tablet, the 1440 value at 1440. Small values and physical sizes stay at the 1440 value (`MIN_rem`). Grid-bound sizes are proportional from 1024 to 1440 and hold below. Layout changes (stacking, nav, lateral padding) still come from Section 6.
- **1440px – 1920px (Laptop to 1080p):** Interpolates linearly. Exactly matches Figma at 1920px (`vw` includes a classic scrollbar, so on Windows the match is within ~1%).
- **1920px – 2560px (1080p to 2K):** Interpolates linearly. Expands proportionally to eliminate empty lateral space on 2K displays.
- **> 2560px (Ultrawide / 4K):** `clamp()` locks to `MAX_rem`. Container centers with `margin-inline: auto` (luxury pillarbox) preventing text distortion and exaggerated vertical scrolling on 21:9 monitors.

---

## 3. Precomputed Token Reference (spacing)

Spacing values (padding, margin, gap) in px at each viewport, from `python3 scripts/fluid_tokens.py --default`. Font sizes: Section 8. Element sizes: `--size` (three-point form, Section 2).

| Figma (1920) | 390 | 768 | 1440 | 1920 | 2560 | Production `clamp()` |
|---|---|---|---|---|---|---|
| **4px** | 3 | 3 | 3 | 4 | 5.3 | `clamp(0.1875rem, 0.2083vw, 0.3333rem)` |
| **8px** | 6 | 6 | 6 | 8 | 10.7 | `clamp(0.375rem, 0.4167vw, 0.6667rem)` |
| **10px** | 7.5 | 7.5 | 7.5 | 10 | 13.3 | `clamp(0.46875rem, 0.5208vw, 0.8333rem)` |
| **12px** | 9 | 9 | 9 | 12 | 16 | `clamp(0.5625rem, 0.625vw, 1rem)` |
| **16px** | 12 | 12 | 12 | 16 | 21.3 | `clamp(0.75rem, 0.8333vw, 1.3333rem)` |
| **20px** | 15 | 15 | 15 | 20 | 26.7 | `clamp(0.9375rem, 1.0417vw, 1.6667rem)` |
| **24px** | 18 | 18 | 18 | 24 | 32 | `clamp(1.125rem, 1.25vw, 2rem)` |
| **28px** | 21 | 21 | 21 | 28 | 37.3 | `clamp(1.3125rem, 1.4583vw, 2.3333rem)` |
| **32px** | 24 | 24 | 24 | 32 | 42.7 | `clamp(1.5rem, 1.6667vw, 2.6667rem)` |
| **40px** | 27.5 | 28.4 | 30 | 40 | 53.3 | `clamp(1.7143rem, max(min(1.6607rem + 0.2381vw, 1.875rem), 2.0833vw), 3.3333rem)` |
| **48px** | 31 | 32.8 | 36 | 48 | 64 | `clamp(1.9286rem, max(min(1.8214rem + 0.4762vw, 2.25rem), 2.5vw), 4rem)` |
| **64px** | 37 | 41 | 48 | 64 | 85.3 | `clamp(2.2929rem, max(min(2.0571rem + 1.0476vw, 3rem), 3.3333vw), 5.3333rem)` |
| **80px** | 42 | 48.5 | 60 | 80 | 106.7 | `clamp(2.5929rem, max(min(2.2071rem + 1.7143vw, 3.75rem), 4.1667vw), 6.6667rem)` |
| **120px** | 53.5 | 66.6 | 90 | 120 | 160 | `clamp(3.2786rem, max(min(2.4964rem + 3.4762vw, 5.625rem), 6.25vw), 10rem)` |
| **160px** | 63.5 | 83.8 | 120 | 160 | 213.3 | `clamp(3.8679rem, max(min(2.6571rem + 5.381vw, 7.5rem), 8.3333vw), 13.3333rem)` |

---

## 4. Layouts, Columns, and Flex Child Sizing

> [!IMPORTANT]
> **The Flex Child Sizing Rule (Preventing Column Pinching / "Menyempit"):**  
> If an outer container (`--layout-content-max` or `.o-container`) expands up to 2560px (`MAX_FRAME`), any inner column or child element with `flex: 0 1 clamp(...)` or `max-width: clamp(...)` **MUST ALSO expand up to 2560px**.

### Why columns look "menyempit" if misconfigured:
When an outer container widens to 2133px on 2K, but child columns are capped at 1920px values (e.g. 377px in footer or 512px in landmarks):
1. With `justify-content: space-between`, columns get pulled apart to the extreme opposite edges.
2. The void in the center balloons to >1000px.
3. The columns fail to expand, text wraps prematurely into narrow strips, and the layout looks broken and pinched.

### Solution:
Always calculate child column `flex-basis` or `max-width` using the full 3-point formula:
```css
/* Example: column is 377px in Figma 1920 (grid-bound: fluid_tokens.py 377 --grid) */
/* 1024 min = 201.07px → rounded to 201px (12.5625rem); proportional from 1024 up */
/* mid      = (377 / 19.2)vw = 19.6354vw */
/* 2560 max = (377 * 1.3333) / 16 = 31.4167rem (502.7px) */
.c-column {
  flex: 0 1 clamp(12.5625rem, 19.6354vw, 31.4167rem);
}
```

---

## 5. The Responsive Flex Reset Rule (Column Transitions)

> [!WARNING]
> **Crucial Responsive Bug Prevention:**  
> When switching a flex container from `flex-direction: row` to `flex-direction: column` at responsive breakpoints (`<= 1024px` or `<= 768px`), all fluid flex child sizing **MUST BE RESET**.

### Why unreset flex causes severe visual defects:
1. **0px Height Collapse (Disappearing Cards):**  
   If a child has `flex: 1 1 0` or `flex-basis: 0` in horizontal layout, switching to vertical column turns the main axis to vertical. With no explicit parent height, `flex-basis: 0` calculates item height as **0px**, causing components (e.g. facility/highlight cards) to completely vanish.
2. **Giant Vertical Ghost Gaps:**  
   If a child has `flex: 0 1 clamp(12.5625rem, ...)`, switching to vertical column causes the browser to treat that clamp value as the **minimum vertical height reservation**, generating massive unwanted blank gaps between stacked columns (e.g. footer sections).

### Standard Fix:
Always reset child sizing when stacking to column in media queries:
```css
@media (max-width: 1024px) {
  .p-highlights-row > *,
  .c-footer__col,
  .c-location__content {
    flex: 0 0 auto;
    width: 100%;
    max-width: 100%;
  }
}
```

---

## 6. Responsive Breakpoint Architecture (< 1024px & < 768px)

Spacing and font sizes already shrink below 1440, and grid-bound sizes from 1440 to 1024 (Section 2), so these tiers only change **layout**: what stacks, what collapses, and the lateral padding. Above 1024 the desktop composition stays, which is why every column, gutter and composed box in it must be `--grid`: a `--size` row holds its 1440 width and overlaps or overflows between 1024 and 1440.

- **Grid tokens belong to the desktop tier.** Below 1024 a `--grid` value holds its 1024 value, about 53% of Figma (a 427px column is 228px on a phone). Use grid tokens only from the desktop tier up (`lg:` in Tailwind, or inside `@media (min-width: 1025px)`), and give tablet and phone their own widths: 100%, a fixed rem, or an em measure (Section 8).
- **Width says nothing about the input.** A tablet in landscape is 1024–1366 wide with touch. Layout that exists because of a mouse (cursor trails, hover reveals, pinned or held full-screen sections) goes behind `@media (hover: hover) and (pointer: fine)`, not behind a width. Without a mouse the section falls back to the stacked tier's padding and height.

### 1. Tablet Tier (`@media (max-width: 1024px)`):
- **Section Lateral Padding:** Lock to a **fixed** `2rem` (32px), e.g. `padding: 3rem 2rem`, to prevent large fluid desktop padding (e.g. 90px) from crushing content width. Use fixed rem here, never a fluid token: the lateral padding is a fixed gutter on a narrow screen, not a scaled desktop value.
- **Navigation:** Transition desktop link row to collapsed hamburger overlay menu.
- **2-Column Layouts:** Transition complex multi-column side-by-side rows (e.g. Location map + text, 3-card highlights) to vertical stack.
- **Reading measure:** stacked running text keeps its Figma measure in em (`max-width: 28.5em` for a 570px column of 20px text, Section 8) when the column is wider, so lines stay at about 60–75 characters instead of 100.
- **Short groups in two columns:** groups of short items (contact blocks, link lists, specs) go to two columns from 768 instead of keeping the phone stack, which leaves half a tablet empty.

### 2. Mobile Tier (`@media (max-width: 768px)`):
- **Section Lateral Padding:** Lock to a fixed `1rem` (16px), e.g. `padding: 2rem 1rem`.
- **Form Rows:** Form fields (`.c-field-row`) must stack vertically with `flex-direction: column` and `width: 100%`.
- **Embedded Media & Maps:** Provide explicit `aspect-ratio: 4 / 3` (or `16 / 9`) and a safety floor `min-height: 280px` to prevent layout collapse.

### First-screen boxes
A box meant to be the first screen (hero, full-screen intro) is a `--grid` height with a viewport-height floor: `min-height: 100svh` next to the grid height, or `height: max(var(--spacing-grid-1380), 100svh)`. A grid height alone scales with width only: a 1380px hero is 736px on a 1024×768 tablet, so the next section peeks in under the first screen.

### Stacked sections without a Figma padding
A section that is fixed-height (or `100svh`) with centred content in Figma has no vertical padding to derive from, but needs one once it stacks. Use the design's most common section padding token (usually the section top padding), so the vertical rhythm on phones stays consistent, and switch the fixed height to `min-height`.

---

## 7. Negative Values in `clamp()`

CSS resolves `clamp(MIN, VAL, MAX)` as `max(MIN, min(VAL, MAX))`. When MIN > MAX the rule is **not** rejected: MIN wins at every width, so the value silently stops scaling.

For negative values (negative margins, tracking, negative absolute positioning), the more negative number is the smaller one, so copying the positive order breaks it:

```css
/* WRONG: MIN (-3px) > MAX (-5.33px), so it is -3px at every width (verified in Chromium) */
bottom: clamp(-0.1875rem, -0.2083vw, -0.3333rem);

/* PREFERRED: keep the clamp positive and negate it */
bottom: calc(-1 * clamp(0.1875rem, 0.2083vw, 0.3333rem));   /* -3px → -4px → -5.33px */

/* ALSO CORRECT: hand-written negative clamp with the ends swapped */
/* MIN = -0.3333rem (-5.33px at 2560px), VAL = -0.2083vw (-4px at 1920px), MAX = -0.1875rem (-3px at 1440px) */
bottom: clamp(-0.3333rem, -0.2083vw, -0.1875rem);
```

---

## 8. Font-Size Floor, Display Typography & Exceptions

### Font-Size Floor (per role)
Small text strains readability on phones and laptops, but a floor must not make text bigger than the design.
- Spacing and sizes have no floor.
- **Give every font value a role** (`--font body|ui|caption`); its floor is `min(role floor, figma_px)`, so text never rises above Figma at any width:
  ```
  floor        = min(FONT_FLOOR_role, figma_px)      // body 16, ui 14, caption 12
  min_font_rem = max(round_to_0.5(figma_px * SCALE_RATIO_MIN), floor) / 16 rem
  ```
  A 20px body copy is 16px from 1440 down; a 14px caption is 12px at 1440 and 14px at 1920.
  A role moves the **1440 value** too, not only the phone value: the floor applies at every width below the point where the Figma line crosses it (20px body: 16px at 1440 with `body`, 15px with plain `--font`). Re-check the laptop size when a project switches to roles.
- `--font` without a role keeps the older single `FONT_FLOOR_PX = 15` (the Section 3 / default tables use it). Note what it does to small text: a 14px caption becomes 15px even at 1920, and text under 11.25px is 15px everywhere. Prefer a role.
- **Form inputs need 16px or more** on phones, or iOS Safari zooms the page on focus: give inputs, selects and textareas the `body` role or a fixed `1rem`.
- 12px is the hard minimum for any text; below it, serif faces break up on low-DPR screens.
- Font sizes follow the mobile line with `FONT_EXPONENT` (Section 2), so headings shrink more than spacing. Values in px at each viewport, from `python3 scripts/fluid_tokens.py --default`:

| Figma (1920) | 390 | 768 | 1440 | 1920 | 2560 | Production `clamp()` |
|---|---|---|---|---|---|---|
| **12px** | 15 | 15 | 15 | 15 | 16 | `clamp(0.9375rem, 0.625vw, 1rem)` |
| **16px** | 15 | 15 | 15 | 16 | 21.3 | `clamp(0.9375rem, 0.8333vw, 1.3333rem)` |
| **18px** | 15 | 15 | 15 | 18 | 24 | `clamp(0.9375rem, 0.9375vw, 1.5rem)` |
| **20px** | 15 | 15 | 15 | 20 | 26.7 | `clamp(0.9375rem, 1.0417vw, 1.6667rem)` |
| **24px** | 18 | 18 | 18 | 24 | 32 | `clamp(1.125rem, 1.25vw, 2rem)` |
| **28px** | 21 | 21 | 21 | 28 | 37.3 | `clamp(1.3125rem, 1.4583vw, 2.3333rem)` |
| **32px** | 22.5 | 23 | 24 | 32 | 42.7 | `clamp(1.4036rem, max(min(1.3714rem + 0.1429vw, 1.5rem), 1.6667vw), 2.6667rem)` |
| **40px** | 25.5 | 27.1 | 30 | 40 | 53.3 | `clamp(1.5857rem, max(min(1.4893rem + 0.4286vw, 1.875rem), 2.0833vw), 3.3333rem)` |
| **48px** | 27.5 | 30.6 | 36 | 48 | 64 | `clamp(1.7036rem, max(min(1.5214rem + 0.8095vw, 2.25rem), 2.5vw), 4rem)` |
| **64px** | 32 | 37.8 | 48 | 64 | 85.3 | `clamp(1.9714rem, max(min(1.6286rem + 1.5238vw, 3rem), 3.3333vw), 5.3333rem)` |

  Under 11.25px the floor is above the 2560 value; the size locks at 15px (MAX raised to MIN).

### Line Height & Letter Spacing from Figma
Figma inspect gives line height in px and letter spacing in % or px. Convert both to relative units so they follow the fluid font size:
- **Line height:** `figma_line_height_px / figma_font_px`, unitless, 2–3 decimals (e.g. 28 / 20 = `1.4`). Never paste the px value: a fixed line height does not scale with the clamp and overlaps lines at 2560.
- **Letter spacing:** `%` ÷ 100 → `em` (e.g. -2% = `-0.02em`); px ÷ font px → `em`.
- **Body text on phones:** the Figma ratio fits the desktop size. Body text that lands under about 18px on a phone usually needs a line height of `1.5` or more. A per-tier line-height override below 1024 for body text is an accepted exception, not a model violation.

### Heading Hierarchy on Phones
`FONT_EXPONENT` compresses ratios: a 88 / 72 h2 / h3 pair (1.22) becomes 37.5 / 34 on a phone (1.10), nearly the same size. Generate a project's heading sizes together with a minimum step: `fluid_tokens.py 210 88 72 --font --min-ratio 1.15` raises each phone value until it is at least 1.15 times the next smaller one (never more than their desktop ratio, never above the 1440 value). When the client approved specific phone sizes, or Figma has a Mobile mode, set each with `--mobile` instead. A larger phone size can break a designed line count: re-run the 360 check after `--min-ratio` or any font token change.

### Text-Block Widths (em, not grid)
A heading's max-width and a paragraph's measure are **text**, not grid, even when the Figma width is a column. Between 1024 and 1440 a `--grid` width shrinks to 0.53 of Figma while the text in it stays between 0.63 and 0.8, so a column-wide heading gains lines (3 → 4) and a one-word last line appears.
- **Width in em from Figma:** `figma_width / figma_font_px`, from `fluid_tokens.py --measure WIDTH FONT` (1320 / 210 = `6.2857em`, 570 / 24 = `23.75em`). At 1920 it equals the Figma width, and the line breaks hold at every size of the font.
- **Beside grid-positioned media,** cap it by the space the grid leaves: `width: min(28.5em, var(--spacing-grid-640))`, so the gap to the photo stays visible at 1024.
- **In a flex column,** give the column `min-width: 0`: an em width wider than the column otherwise grows the column and scrolls the page sideways.
- **Paragraphs:** `text-wrap: pretty` by default; it removes most one-word last lines more cheaply than an em width.
- `scripts/check_layout.mjs` prints every heading whose line count differs from 1920, every one-word last line, and each block's longest line in em (the value to use in a width or in the line-count cap below).

### Display & Heading Check on Mobile
Font tokens already bring large headings down on phones (a 64px H1 is 32px at 390, Section 2). Two checks at 360px:
- **Longest word:** every display word fits the content box. If one overflows, override that heading only:
  ```css
  @media (max-width: 768px) {
    .p-hero__quote { font-size: clamp(1.85rem, 7vw, 2.6rem); }
  }
  ```
- **Designed line count:** a heading designed to break into N lines (often held with `max-width: 6.08em` or similar) keeps N lines. An em-based max-width grows with the font and can exceed the content box on a narrow phone, adding a line while no word overflows. Cap the font so the em width always fits:
  ```css
  .p-hero__title {
    max-width: 6.08em;
    font-size: min(var(--text-fluid-210), calc((100vw - 2rem) / 6.08));  /* 2rem = both lateral paddings */
  }
  ```

### Exceptions (Do NOT Scale):
- **Border-width:** Keep `1px` for hairlines (`--border-hairline: 1px`).
- **Box-shadow:** Blur and spread stay constant unless explicitly specified.
- **Pill/Circle radius:** `9999px` or `50%` are symbolic constants; do not scale.
- **Sizes** never follow the phone curve:
  - **Grid-bound** (`--grid`): column and card widths, max-widths of content blocks, page margin, gutters, section heights, image boxes in a composition, and every offset and inner padding of a composed box (below). Proportional from 1024 up.
  - **Physical** (`--size`): icons, avatars, logos, button and input heights. Hold their 1440 value below 1440.
- **Composed boxes:** a box with a fixed height, or with absolutely positioned children, is one picture: its height, its children's `top`/`left`/width and its inner padding all use `--grid`, so they shrink together between 1024 and 1440. Mixing a `--size`/`--grid` height with a spacing padding inside makes the content drift (the padding shrinks, the height does not). Better still, use `min-height` plus padding instead of a fixed height, and always when the box holds text: text does not shrink like the grid, so the free space in a fixed-height box shrinks faster than the box and longer copy can overflow at 1024 (hidden by `overflow: hidden`).
- **Tap targets:** buttons, links and form controls are at least `2.75rem` (44px) tall on mobile. Give interactive text a `min-height: 2.75rem` (with flex centring) instead of relying on line height × padding: a smaller font token shrinks a padded link below 44px.
- **Unitless line-height:** Unitless multipliers (e.g. `1.6`, `1.2`) scale automatically with font size (convert from Figma, see above).
- **Relative letter-spacing:** Values expressed in `em` (e.g. `0.025em`) scale automatically.

---

## 9. Root Font-Size & Accessibility

- Always declare `html { font-size: 100%; }` (or omit declaration).
- **NEVER** set `html { font-size: 75%; }` when using rem values calculated from a 16px base — that would compound the scale ratio twice.
- Using `100%` root respects user browser zoom and OS accessibility preferences.

---

## 10. Container Sizing Architecture

```css
/* 1. Global Shell Container (centers and safe-caps on ultrawide) */
.o-container {
  width: 100%;
  max-width: var(--layout-max); /* 160rem = 2560px */
  margin-inline: auto;
}

/* 2. Inner Content Boundaries */
:root {
  --layout-max: 160rem;                                         /* 2560px */
  --layout-content-max: clamp(75rem, 83.3333vw, 133.3333rem);   /* 1200px -> 1600px -> 2133px */
}
```

---

## 11. Developer / AI Agent Step-by-Step Workflow

When translating any dimension from Figma inspect mode:

0. **Check the file for phone values first:** a mobile frame, or a variable collection (often Typography) with a "Mobile" mode. Where one exists, its value is the phone value: pass it with `--mobile`.
1. **Read `figma_px`** from Figma inspect, and decide its kind:
   - **spacing** (default): padding, margin, gap between blocks;
   - **font** (`--font body|ui|caption`): font-size, with its role;
   - **grid** (`--grid`): column/card widths, page margin, gutters, heights of boxes inside the desktop composition, absolute offsets and inner padding inside a composed box; first-screen boxes add a `100svh` floor (Section 6);
   - **size** (`--size`): icons, avatars, logos, button and input heights, and heights that matter on phones outside the desktop composition (reveal windows onto a fixed photo, sticky offsets);
   - **text width** (`--measure WIDTH FONT`): heading max-widths and paragraph measures, in em (Section 8), even when the Figma width is a column.
2. **Use the project's token if one exists** for that px (its tokens file, e.g. `tokens.css`; name tokens by the Figma px they represent, so a token never means two sizes).
3. **Otherwise generate it with `scripts/fluid_tokens.py`** with the kind's flag (`--css` for a custom property). Generate the heading set together with `--min-ratio 1.15` (Section 8). The script applies the Section 2 formulas (4 decimals, as in Section 3). Never write the mobile line by hand.
4. **If styling columns inside a flex container:**
   - Ensure column's `flex-basis` or `max-width` is a `--grid` value (2K ceiling `MAX_rem`, proportional from 1024) to prevent pinching on 2K and overlap between 1024 and 1440.
   - For responsive breakpoints (`<= 1024px`), apply **The Responsive Flex Reset Rule** (`flex: 0 0 auto; width: 100%;`).

---

## 12. Verification Checklist

Before finalizing any PR or feature:

- [ ] All scaled properties use a generated `clamp()` of the right kind: spacing, font (with a role), grid (columns, gutters, composed boxes) or size (icons, buttons).
- [ ] Phone values from a Figma mobile frame or Mobile variable mode are used (`--mobile`), not the derived ones.
- [ ] Root `html { font-size: 100%; }` remains unchanged.
- [ ] Container `--layout-max` is set to `160rem` (2560px) and centers with `margin-inline: auto`.
- [ ] No flex child column inside `--layout-content-max` has a max-width hardcoded to 1920px.
- [ ] Multi-column flex children transitioning to `column` at responsive breakpoints apply `flex: 0 0 auto; width: 100%`.
- [ ] Negative fluid values use `calc(-1 * clamp(...))`, or a hand-written negative clamp with `MIN <= MAX` (e.g. `clamp(-0.33rem, ..., -0.18rem)`).
- [ ] Border-width (`1px`) is unscaled; line-heights are unitless and letter-spacing is in `em` (no px from Figma inspect).
- [ ] Every font value has a role floor and no text renders above its Figma size at 1920; inputs are at least 16px on phones.
- [ ] **Run `node scripts/check_layout.mjs <url>` after every layout change**, not only after migrating (default sizes: 1920×1080, 1440×900, 1280×800, 1366×768, 1024×768 touch, 768×1024 touch, 390×844 touch, 360×800 touch). It covers most items below; it cannot judge composition, so still look at the screenshots (`--screens`).
- [ ] Every multi-line heading keeps its Figma line count at **1024 and 1280**, and no heading ends in a one-word line there. Text-block widths are em, not grid.
- [ ] At 360px the longest display word fits and every heading keeps its designed line count; adjacent heading levels stay visibly different.
- [ ] Tap targets are at least 44px tall on mobile; re-measured after any font token change.
- [ ] Every composed row checked at **1024** and **1280** for **overlap** (not only scrollbars: `overflow: hidden` hides overlap). A row whose fixed parts add up to more than the screen uses `--grid` or stacks.
- [ ] No box mixes a fixed height with a spacing padding inside (Section 8, composed boxes); at 1024 the content of every fixed-height box fits with room to spare.
- [ ] Text beside a grid-positioned image keeps a visible gap at 1024.
- [ ] No grid token is used below the desktop tier (search for grid tokens without `lg:` / `xl:`, or outside the desktop media query).
- [ ] The first screen fills the viewport at real screen sizes: **1024×768**, **1280×800**, **1366×768**, not only widths.
- [ ] One pass at **1024×768 with touch**: mouse-only layout (cursor trails, hover reveals, held full-screen sections) falls back cleanly.
- [ ] Tablet/mobile lateral padding is a fixed rem, not a fluid token.
- [ ] Verified at **360px**, **390px** (Mobile), **768px** (Tablet portrait), **1024px** (Tablet landscape), **1440px** (Compact laptop), **1920px** (Desktop baseline), and **2560px** (2K ceiling) viewports without horizontal scrollbar or element collapse.

---

## Files

| File | Read or run when |
|---|---|
| `references/tailwind.md` | The project uses Tailwind CSS (v3 or v4), with or without Next.js. |
| `scripts/fluid_tokens.py` | Any value is needed. Kind: spacing (default), `--font [body\|ui\|caption]`, `--grid`, `--size`. Options: `--mobile PX`, `--min-ratio R`. Output: `--css`, default (Tailwind v3 entries), `--v4` (`@theme` lines), `--class PREFIX`; `--default` prints the Section 3 and 8 sets. |
| `scripts/check_layout.mjs` | After every layout change: line counts against 1920, one-word lines, em widths, first screen, overlap, clipped content, tap targets, overflow, at real sizes with touch. Node 22+ and Chrome, no dependencies. |
| `scripts/test/test_fluid_tokens.py` | After editing the script or any table here or in `references/tailwind.md`: keeps them in sync. Python 3.9+, standard library only. |
| `notes/run-<n>.md` | Field notes from real projects; each CHANGELOG entry says which notes it applied. Not needed to use the skill. |
