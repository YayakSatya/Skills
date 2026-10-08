## Scaling Strategy: Figma → Implementation

**Version:** 3.3  
**Last updated:** 2026-09-04  
**Status:** Reusable standard for any Figma canvas built on a fixed frame width (Desktop Fluid + Responsive Tiers)

---

### 1. Configurable Parameters

Configure these variables at project kickoff. All formulas and tables throughout this document derive automatically from these values:

```
// --- Viewport Reference Frames (px) ---
SOURCE_FRAME     = 1920   // Figma canvas base width (1.0x baseline match)
TARGET_FRAME     = 1440   // Primary compact laptop width (minimum floor)
MAX_FRAME        = 2560   // 2K desktop width (maximum ceiling)

// --- Derived Scaling Ratios ---
SCALE_RATIO_MIN  = TARGET_FRAME / SOURCE_FRAME   // = 0.75  (-25%)
SCALE_RATIO_MAX  = MAX_FRAME / SOURCE_FRAME      // = 1.3333 (+33.3%)

// --- Foundations ---
BASE_REM_PX      = 16     // Standard browser default font-size (100%)
ROUNDING_STEP    = 0.5    // Round px to nearest 0.5px before converting to rem
FONT_FLOOR_PX    = 15     // Absolute minimum body/label font size for readability
```

---

### 2. The 3-Point Fluid Model

Every scalable property is expressed as a single CSS `clamp()` that connects three points on a linear line through the origin:

$$\text{value}(w) = \text{figma\_px} \times \frac{w}{\text{SOURCE\_FRAME}}$$

```css
property: clamp(MIN_rem, FLUID_vw, MAX_rem);
```

#### Formulas:

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
   max_px  = round_to_0.5(figma_px * SCALE_RATIO_MAX)
   MAX_rem = max_px / BASE_REM_PX rem
   // For 1920 -> 2560 (1.3333x): MAX_rem = figma_px / 12 rem
   ```

#### Viewport Behavior:
- **< 1440px (Mobile / Tablet):** `clamp()` locks to `MIN_rem`. (Mobile-specific breakpoint layouts apply below 1024px).
- **1440px – 1920px (Laptop to 1080p):** Interpolates linearly. Exactly matches Figma at 1920px.
- **1920px – 2560px (1080p to 2K):** Interpolates linearly. Expands proportionally to eliminate empty lateral space on 2K displays.
- **> 2560px (Ultrawide / 4K):** `clamp()` locks to `MAX_rem`. Container centers with `margin-inline: auto` (luxury pillarbox) preventing text distortion and exaggerated vertical scrolling on 21:9 monitors.

---

### 3. Precomputed Token Reference (1440px → 1920px → 2560px)

Precalculated values using `SOURCE_FRAME = 1920`, `TARGET_FRAME = 1440`, `MAX_FRAME = 2560`:

| Figma (1920) | 1440 Min (px / rem) | Fluid Term (`vw`) | 2560 Max (px / rem) | Production CSS `clamp()` Snippet |
|---|---|---|---|---|
| **4px** | 3px / `0.1875rem` | `0.2083vw` | 5.33px / `0.3333rem` | `clamp(0.1875rem, 0.2083vw, 0.3333rem)` |
| **8px** | 6px / `0.375rem` | `0.4167vw` | 10.67px / `0.6667rem` | `clamp(0.375rem, 0.4167vw, 0.6667rem)` |
| **10px** | 7.5px / `0.46875rem` | `0.5208vw` | 13.33px / `0.8333rem` | `clamp(0.46875rem, 0.5208vw, 0.8333rem)` |
| **12px** | 9px / `0.5625rem` | `0.625vw` | 16px / `1rem` | `clamp(0.5625rem, 0.625vw, 1rem)` |
| **16px** | 12px / `0.75rem` | `0.8333vw` | 21.33px / `1.3333rem` | `clamp(0.75rem, 0.8333vw, 1.3333rem)` |
| **20px** | 15px / `0.9375rem` | `1.0417vw` | 26.67px / `1.6667rem` | `clamp(0.9375rem, 1.0417vw, 1.6667rem)` |
| **24px** | 18px / `1.125rem` | `1.25vw` | 32px / `2rem` | `clamp(1.125rem, 1.25vw, 2rem)` |
| **28px** | 21px / `1.3125rem` | `1.4583vw` | 37.33px / `2.3333rem` | `clamp(1.3125rem, 1.4583vw, 2.3333rem)` |
| **32px** | 24px / `1.5rem` | `1.6667vw` | 42.67px / `2.6667rem` | `clamp(1.5rem, 1.6667vw, 2.6667rem)` |
| **40px** | 30px / `1.875rem` | `2.0833vw` | 53.33px / `3.3333rem` | `clamp(1.875rem, 2.0833vw, 3.3333rem)` |
| **48px** | 36px / `2.25rem` | `2.5vw` | 64px / `4rem` | `clamp(2.25rem, 2.5vw, 4rem)` |
| **64px** | 48px / `3rem` | `3.3333vw` | 85.33px / `5.3333rem` | `clamp(3rem, 3.3333vw, 5.3333rem)` |
| **80px** | 60px / `3.75rem` | `4.1667vw` | 106.67px / `6.6667rem` | `clamp(3.75rem, 4.1667vw, 6.6667rem)` |
| **120px** | 90px / `5.625rem` | `6.25vw` | 160px / `10rem` | `clamp(5.625rem, 6.25vw, 10rem)` |
| **160px** | 120px / `7.5rem` | `8.3333vw` | 213.33px / `13.3333rem` | `clamp(7.5rem, 8.3333vw, 13.3333rem)` |

---

### 4. Layouts, Columns, and Flex Child Sizing

> [!IMPORTANT]
> **The Flex Child Sizing Rule (Preventing Column Pinching / "Menyempit"):**  
> If an outer container (`--layout-content-max` or `.o-container`) expands up to 2560px (`MAX_FRAME`), any inner column or child element with `flex: 0 1 clamp(...)` or `max-width: clamp(...)` **MUST ALSO expand up to 2560px**.

#### Why columns look "menyempit" if misconfigured:
When an outer container widens to 2133px on 2K, but child columns are capped at 1920px values (e.g. 377px in footer or 512px in landmarks):
1. With `justify-content: space-between`, columns get pulled apart to the extreme opposite edges.
2. The void in the center balloons to >1000px.
3. The columns fail to expand, text wraps prematurely into narrow strips, and the layout looks broken and pinched.

#### Solution:
Always calculate child column `flex-basis` or `max-width` using the full 3-point formula:
```css
/* Example: column is 377px in Figma 1920 */
/* 1440 min = 282.75px (17.6718rem) */
/* mid      = (377 / 19.2)vw = 19.6354vw */
/* 2560 max = (377 * 1.3333) / 16 = 31.4167rem (502.7px) */
.c-column {
  flex: 0 1 clamp(17.6718rem, 19.6354vw, 31.4167rem);
}
```

---

### 5. The Responsive Flex Reset Rule (Column Transitions)

> [!WARNING]
> **Crucial Responsive Bug Prevention:**  
> When switching a flex container from `flex-direction: row` to `flex-direction: column` at responsive breakpoints (`<= 1024px` or `<= 768px`), all fluid flex child sizing **MUST BE RESET**.

#### Why unreset flex causes severe visual defects:
1. **0px Height Collapse (Disappearing Cards):**  
   If a child has `flex: 1 1 0` or `flex-basis: 0` in horizontal layout, switching to vertical column turns the main axis to vertical. With no explicit parent height, `flex-basis: 0` calculates item height as **0px**, causing components (e.g. facility/highlight cards) to completely vanish.
2. **Giant Vertical Ghost Gaps:**  
   If a child has `flex: 0 1 clamp(17.67rem, ...)`, switching to vertical column causes the browser to treat that clamp value as the **minimum vertical height reservation**, generating massive unwanted blank gaps between stacked columns (e.g. footer sections).

#### Standard Fix:
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

### 6. Responsive Breakpoint Architecture (< 1024px & < 768px)

Desktop fluid scaling (`clamp()` with `1440px` floor) applies to screens `>= 1025px`. For tablet and mobile, viewport widths drop far below `TARGET_FRAME = 1440px`. Fixed breakpoint overrides must enforce usability:

#### 1. Tablet Tier (`@media (max-width: 1024px)`):
- **Section Lateral Padding:** Lock to `var(--space-8)` (32px) or `var(--space-12) var(--space-8)` to prevent large fluid desktop padding (e.g. 90px) from crushing content width.
- **Navigation:** Transition desktop link row to collapsed hamburger overlay menu.
- **2-Column Layouts:** Transition complex multi-column side-by-side rows (e.g. Location map + text, 3-card highlights) to vertical stack.

#### 2. Mobile Tier (`@media (max-width: 768px)`):
- **Section Lateral Padding:** Lock to `var(--space-4)` (16px) or `var(--space-8) var(--space-4)`.
- **Form Rows:** Form fields (`.c-field-row`) must stack vertically with `flex-direction: column` and `width: 100%`.
- **Embedded Media & Maps:** Provide explicit `aspect-ratio: 4 / 3` (or `16 / 9`) and a safety floor `min-height: 280px` to prevent layout collapse.

---

### 7. Negative Values in `clamp()`

In CSS, `clamp(MIN, VAL, MAX)` strictly requires that `MIN <= MAX`.

For negative values (such as negative margins, tracking, or negative absolute positioning), smaller mathematical numbers are *more negative*:

```css
/* WRONG (evaluated as invalid or resolves only to min): */
bottom: clamp(-0.1875rem, -0.2083vw, -0.25rem); /* -0.1875 is GREATER than -0.25 */

/* CORRECT: */
/* MIN = -0.3333rem (-5.3px at 2560px) */
/* VAL = -0.2083vw   (-4.0px at 1920px) */
/* MAX = -0.1875rem (-3.0px at 1440px) */
bottom: clamp(-0.3333rem, -0.2083vw, -0.1875rem);
```

---

### 8. Font-Size Floor, Display Typography & Exceptions

#### Font-Size Floor (`FONT_FLOOR_PX = 15px`)
Text below 15px strains readability regardless of scale ratios.
- Spacing and container dimensions can scale down freely to 0.75x.
- Font sizes must never fall below `FONT_FLOOR_PX`:
  ```
  min_font_rem = max((figma_px * SCALE_RATIO_MIN), FONT_FLOOR_PX) / 16 rem
  ```
- Example: Figma 18px text $\times 0.75 = 13.5\text{px}$ (below 15px).  
  Formula sets min to `0.9375rem` (15px):
  ```css
  font-size: clamp(0.9375rem, 0.9375vw, 1.5rem);
  ```

#### Display & Heading Clamp for Mobile Screens
The standard 1440px desktop floor for large display headings (H1, H2, quote titles) often results in sizes between `3rem` (48px) and `3.75rem` (60px). On 375px mobile viewports, this causes single words to overflow or wrap awkwardly.
- Large editorial headings must include mobile-tailored clamp overrides:
  ```css
  /* Mobile / Tablet override */
  @media (max-width: 768px) {
    .p-hero__quote,
    .c-section-title {
      font-size: clamp(1.85rem, 7vw, 2.6rem);
    }
  }
  ```

#### Exceptions (Do NOT Scale):
- **Border-width:** Keep `1px` for hairlines (`--border-hairline: 1px`).
- **Box-shadow:** Blur and spread stay constant unless explicitly specified.
- **Pill/Circle radius:** `9999px` or `50%` are symbolic constants; do not scale.
- **Unitless line-height:** Unitless multipliers (e.g. `1.6`, `1.2`) scale automatically with font size.
- **Relative letter-spacing:** Values expressed in `em` (e.g. `0.025em`) scale automatically.

---

### 9. Root Font-Size & Accessibility

- Always declare `html { font-size: 100%; }` (or omit declaration).
- **NEVER** set `html { font-size: 75%; }` when using rem values calculated from a 16px base — that would compound the scale ratio twice.
- Using `100%` root respects user browser zoom and OS accessibility preferences.

---

### 10. Container Sizing Architecture

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

### 11. Developer / AI Agent Step-by-Step Workflow

When translating any dimension from Figma inspect mode:

1. **Read `figma_px`** from Figma inspect (e.g., width, padding, gap, font-size).
2. **Check if token exists in `tokens.css`:**
   - Always use `var(--space-*)`, `var(--text-*-size)`, or component tokens first.
3. **If writing a custom or component-level dimension:**
   - Calculate `MIN_rem` $= (\text{figma\_px} \times 0.75) / 16$ (apply `FONT_FLOOR_PX` if font).
   - Calculate `fluid_vw` $= (\text{figma\_px} / 19.2)\text{vw}$.
   - Calculate `MAX_rem` $= (\text{figma\_px} \times 1.3333) / 16\text{rem} = (\text{figma\_px} / 12)\text{rem}$.
   - Write: `clamp(MIN_rem, fluid_vw, MAX_rem)`.
4. **If styling columns inside a flex container:**
   - Ensure column's `flex-basis` or `max-width` uses 2K ceiling `MAX_rem` to prevent pinching.
   - For responsive breakpoints (`<= 1024px`), apply **The Responsive Flex Reset Rule** (`flex: 0 0 auto; width: 100%;`).

---

### 12. Verification Checklist

Before finalizing any PR or feature:

- [ ] All scaled properties use `clamp(min, fluid_vw, max)` with the 2K ceiling.
- [ ] Root `html { font-size: 100%; }` remains unchanged.
- [ ] Container `--layout-max` is set to `160rem` (2560px) and centers with `margin-inline: auto`.
- [ ] No flex child column inside `--layout-content-max` has a max-width hardcoded to 1920px.
- [ ] Multi-column flex children transitioning to `column` at responsive breakpoints apply `flex: 0 0 auto; width: 100%`.
- [ ] Negative `clamp()` values satisfy `MIN <= MAX` (e.g. `clamp(-0.33rem, ..., -0.18rem)`).
- [ ] Border-width (`1px`) and unitless line-heights are unscaled.
- [ ] Typography checked against `FONT_FLOOR_PX` (15px minimum floor) and mobile heading clamps applied.
- [ ] Verified at **375px** (Mobile), **768px** (Tablet portrait), **1024px** (Tablet landscape), **1440px** (Compact laptop), **1920px** (Desktop baseline), and **2560px** (2K ceiling) viewports without horizontal scrollbar or element collapse.

---

### 13. Changelog

- **3.3** (2026-09-04) — **Responsive Breakpoint Architecture & Flex Reset Standard:**
  - Added **Section 5 (The Responsive Flex Reset Rule)** preventing 0px height collapse (`flex-basis: 0`) and giant ghost gaps (`flex-basis: clamp(...)`) when stacking flex rows into columns.
  - Added **Section 6 (Responsive Breakpoint Architecture)** defining `< 1024px` (Tablet tier: 32px lateral padding, hamburger nav, vertical stack) and `< 768px` (Mobile tier: 16px lateral padding, vertical form controls, map aspect ratio).
  - Added mobile display typography clamp standard to prevent heading overflow on narrow viewports.
  - Expanded Section 12 Verification Checklist to cover 375px, 768px, and 1024px viewports.
- **3.2** (2026-09-04) — **Extended 3-Point Fluid Standard (1440px → 1920px → 2560px):**
  - Added `MAX_FRAME = 2560` (1.3333x ceiling) to eliminate dead lateral space on 2K monitors.
  - Added **Flex Child Sizing Rule** to prevent column pinching and excessive whitespace in multi-column flex containers.
  - Added strict guidance and mathematical validation for negative clamp offsets.
  - Added comprehensive 15-tier precomputed token table with ready-to-copy clamp snippets.
- **3.1** (2026-08-28) — Added Fluid mode: `clamp()` + `vw` formula between 1440px and 1920px.
- **3.0** (2026-08-28) — Added font-size floor (`FONT_FLOOR_PX = 15px`).
- **2.0** (2026-08-11) — Added token mapping table, rounding rules, unitless line-height handling, and ultrawide cap.
- **1.0** — Initial version (1920 → 1440, ratio 0.75).
