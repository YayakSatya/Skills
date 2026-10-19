---
name: figma-scaling
description: Converts Figma px values into fluid clamp() values for sites designed only on a 1920 desktop frame: 1440 laptop floor, 1920 baseline, 2560 2K ceiling, and phone values derived from the desktop ones so tablet and mobile scale proportionally (360-1440), for plain CSS and Tailwind CSS v3/v4 (fluid-* tokens in tailwind.config or @theme, arbitrary clamp classes, Next.js setup). A bundled script computes every value. Use whenever slicing a Figma design into HTML/CSS or Tailwind, when writing or reviewing clamp()/vw/rem sizing or fluid-* tokens, making a desktop-only design responsive, fixing flex columns that look pinched ("menyempit") on wide screens or collapse/leave ghost gaps when stacked, handling negative clamp() values, font-size floors or mobile heading overflow, or when the user mentions Figma scaling, SCALING.md, fluid typography, or pixel-perfect-but-responsive implementation.
metadata:
  version: "5.0"
  last-updated: "2026-10-19"
---

# Figma Scaling Strategy: Figma → Implementation

Reusable standard for any Figma canvas built on a fixed frame width (Desktop Fluid + Responsive Tiers).

**Version:** 5.0 · **Last updated:** 2026-10-19 · Change history: [CHANGELOG.md](CHANGELOG.md)

**By stack:** this file is the standard for every stack (model, values, rules, checklist).
- **Plain CSS / CSS Modules / SCSS** (also inside Next.js): this file is enough. Tokens as CSS custom properties: `python3 scripts/fluid_tokens.py --default --css`.
- **Tailwind CSS v3 or v4** (with or without Next.js): also read [references/tailwind.md](references/tailwind.md) before writing classes. It maps these values to `fluid-*` tokens and covers the Tailwind-only pitfalls.

**Never compute values by hand.** `scripts/fluid_tokens.py` applies the formulas below, including rounding, the font floor and the mobile line:

```bash
python3 scripts/fluid_tokens.py 120 --css       # spacing (with the mobile line) as a custom property
python3 scripts/fluid_tokens.py 377 --size --css # an element size: column width, icon, image
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

**Below 1440px:** a straight line from the derived **mobile value at 390px** to the **1440 value**, so tablet sizes fall proportionally between the two, extended down to 360px. Spacing (padding, margin, gap) and font sizes use it; element sizes (column widths, icons, images, buttons) do not (`--size`, Section 8 Exceptions). Small values keep the 1440 value (spacing up to 32px, font up to 24px), so their `clamp()` is the three-point form above. Larger values get:

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

5. **Mobile line (390 → 1440), only when `mobile_px < min_px`:**
   ```
   B_px_per_px = (min_px - mobile_px) / (TARGET_FRAME - MOBILE_FRAME)
   A_px        = mobile_px - B_px_per_px * MOBILE_FRAME
   B_vw        = B_px_per_px * 100
   LOW_px      = A_px + B_px_per_px * MOBILE_MIN_FRAME            // font: at least FONT_FLOOR_PX
   clamp(LOW_rem, max(min(A_rem + B_vw, MIN_rem), FLUID_vw), MAX_rem)
   ```
   Below 1440 the mobile line is above the desktop line, so `max()` picks it; from 1440 up, `min()` holds it at the 1440 value and `max()` gives exactly the three-point result, so every value from 1440 up is unchanged. Verified in Chromium at 360, 390, 768, 1024, 1440, 1920 and 2560 (within 0.02px of the script); the tests check 1440–3000 against the three-point model.

### Viewport Behavior:
- **< 360px:** locks to the 360 value.
- **360px – 1440px (Phone to laptop):** spacing and font follow the mobile line: the derived phone value at 390, proportional through tablet, the 1440 value at 1440. Small values and element sizes stay at the 1440 value (`MIN_rem`). Layout changes (stacking, nav, lateral padding) still come from Section 6.
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
/* Example: column is 377px in Figma 1920 (an element size: fluid_tokens.py 377 --size) */
/* 1440 min = 282.75px → rounded to 283px (17.6875rem) */
/* mid      = (377 / 19.2)vw = 19.6354vw */
/* 2560 max = (377 * 1.3333) / 16 = 31.4167rem (502.7px) */
.c-column {
  flex: 0 1 clamp(17.6875rem, 19.6354vw, 31.4167rem);
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
   If a child has `flex: 0 1 clamp(17.6875rem, ...)`, switching to vertical column causes the browser to treat that clamp value as the **minimum vertical height reservation**, generating massive unwanted blank gaps between stacked columns (e.g. footer sections).

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

Spacing and font sizes already shrink below 1440 (Section 2), so these tiers only change **layout**: what stacks, what collapses, and the lateral padding.

### 1. Tablet Tier (`@media (max-width: 1024px)`):
- **Section Lateral Padding:** Lock to a **fixed** `2rem` (32px), e.g. `padding: 3rem 2rem`, to prevent large fluid desktop padding (e.g. 90px) from crushing content width. Use fixed rem here, never a fluid token: the lateral padding is a fixed gutter on a narrow screen, not a scaled desktop value.
- **Navigation:** Transition desktop link row to collapsed hamburger overlay menu.
- **2-Column Layouts:** Transition complex multi-column side-by-side rows (e.g. Location map + text, 3-card highlights) to vertical stack.

### 2. Mobile Tier (`@media (max-width: 768px)`):
- **Section Lateral Padding:** Lock to a fixed `1rem` (16px), e.g. `padding: 2rem 1rem`.
- **Form Rows:** Form fields (`.c-field-row`) must stack vertically with `flex-direction: column` and `width: 100%`.
- **Embedded Media & Maps:** Provide explicit `aspect-ratio: 4 / 3` (or `16 / 9`) and a safety floor `min-height: 280px` to prevent layout collapse.

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

### Font-Size Floor (`FONT_FLOOR_PX = 15px`)
Text below 15px strains readability regardless of scale ratios.
- Spacing and element sizes have no floor.
- Font sizes must never fall below `FONT_FLOOR_PX`:
  ```
  min_font_rem = max(round_to_0.5(figma_px * SCALE_RATIO_MIN), FONT_FLOOR_PX) / 16 rem
  ```
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

### Display & Heading Check on Mobile
Font tokens already bring large headings down on phones (a 64px H1 is 32px at 390, Section 2). Still check the longest word of every display heading at 360px. If a single word overflows, add an override for that heading only:
```css
@media (max-width: 768px) {
  .p-hero__quote { font-size: clamp(1.85rem, 7vw, 2.6rem); }
}
```

### Exceptions (Do NOT Scale):
- **Border-width:** Keep `1px` for hairlines (`--border-hairline: 1px`).
- **Box-shadow:** Blur and spread stay constant unless explicitly specified.
- **Pill/Circle radius:** `9999px` or `50%` are symbolic constants; do not scale.
- **Element sizes** (column widths, max-widths, icons, avatars, image heights, button heights): scale with the three-point form only (`fluid_tokens.py <px> --size`), not the mobile curve. Below 1024px columns become 100% wide anyway (Section 5). Tap targets (buttons, links, form controls) stay at least `2.75rem` (44px) tall on mobile.
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

1. **Read `figma_px`** from Figma inspect (e.g., width, padding, gap, font-size), and decide its kind: **spacing** (padding, margin, gap), **font** (font-size), or **size** (width, height, icon, image, button).
2. **Use the project's token if one exists** for that px (its tokens file, e.g. `tokens.css`; name tokens by the Figma px they represent, so a token never means two sizes).
3. **Otherwise generate it with `scripts/fluid_tokens.py`**: spacing by default, `--font` for font sizes, `--size` for element sizes; `--css` for a custom property. The script applies the Section 2 formulas (4 decimals, as in Section 3). Never write the mobile line by hand.
4. **If styling columns inside a flex container:**
   - Ensure column's `flex-basis` or `max-width` uses 2K ceiling `MAX_rem` to prevent pinching.
   - For responsive breakpoints (`<= 1024px`), apply **The Responsive Flex Reset Rule** (`flex: 0 0 auto; width: 100%;`).

---

## 12. Verification Checklist

Before finalizing any PR or feature:

- [ ] All scaled properties use a generated `clamp()` with the 2K ceiling: spacing and font from the default / `--font` output (mobile line), element sizes from `--size`.
- [ ] Root `html { font-size: 100%; }` remains unchanged.
- [ ] Container `--layout-max` is set to `160rem` (2560px) and centers with `margin-inline: auto`.
- [ ] No flex child column inside `--layout-content-max` has a max-width hardcoded to 1920px.
- [ ] Multi-column flex children transitioning to `column` at responsive breakpoints apply `flex: 0 0 auto; width: 100%`.
- [ ] Negative fluid values use `calc(-1 * clamp(...))`, or a hand-written negative clamp with `MIN <= MAX` (e.g. `clamp(-0.33rem, ..., -0.18rem)`).
- [ ] Border-width (`1px`) is unscaled; line-heights are unitless and letter-spacing is in `em` (no px from Figma inspect).
- [ ] Typography checked against `FONT_FLOOR_PX` (15px minimum floor); the longest display word fits at 360px.
- [ ] Tap targets are at least 44px tall on mobile.
- [ ] Tablet/mobile lateral padding is a fixed rem, not a fluid token.
- [ ] Verified at **360px**, **390px** (Mobile), **768px** (Tablet portrait), **1024px** (Tablet landscape), **1440px** (Compact laptop), **1920px** (Desktop baseline), and **2560px** (2K ceiling) viewports without horizontal scrollbar or element collapse.

---

## Files

| File | Read or run when |
|---|---|
| `references/tailwind.md` | The project uses Tailwind CSS (v3 or v4), with or without Next.js. |
| `scripts/fluid_tokens.py` | Any value is needed: `--css` (custom properties), default (Tailwind v3 entries), `--v4` (`@theme` lines), `--class PREFIX` (arbitrary class); `--font` applies the floor; `--default` prints the Section 3 set. |
| `scripts/test/test_fluid_tokens.py` | After editing the script or any table here or in `references/tailwind.md`: keeps them in sync. Python 3.9+, standard library only. |
