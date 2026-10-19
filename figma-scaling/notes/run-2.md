# figma-scaling 5.1: field notes for the next version

Source: the same client home page as run 1 (name not published; Next.js 16, Tailwind v4, 1920
Figma frame), migrated from 5.0 to 5.1 on 2026-10-19. Used: `--grid` for columns, page margin,
gutters, section heights and composed boxes; `--size` for the logo and the cursor plate;
`--font body` for body copy; `--min-ratio 1.15` for headings; `min-h-11` for nav links. Checked in
headless Chrome at 360, 390, 768, 1024, 1280, 1440, 1920 and 2560 with computed styles and
measured line counts.

These problems remain after 5.1. They are ordered by impact, and each has what happened, why, and a
proposed change.

---

## 1. Text blocks sized by grid columns break their line count between 1024 and 1440

Between 1024 and 1440, `--grid` shrinks faster than type. At 1024 a grid value is 0.533 of its
Figma size, while type is between 0.63 and 0.8 of it:

| Token | Figma | At 1024 | Share of Figma |
|---|---|---|---|
| h2 | 88 | 55.5 | 0.63 |
| h3 | 72 | 46.1 | 0.64 |
| body-lg | 24 | 18 | 0.75 |
| body-md | 20 | 16 | 0.80 |

Every text block whose width is a column token wrapped more than in Figma:

- **Hero title** (`max-w-col-9`, 210 px type): 4 lines instead of 3.
- **Collection menu** (`w-col-6`, h2 links): "Special Editions" broke onto two lines.
- **Craftsmanship title** (`w-col-5`, h3): 3 lines instead of 2.
- **Hero intro and Instagram paragraph** (`col-4`, 304 px at 1024): 6 lines and more.

The fix that worked: size text blocks in `em` from Figma, as `figma_width / figma_font_px`. The hero
title is 1320 / 210 = 6.2857em, the intro 570 / 24 = 23.75em and the Craftsmanship title 10em. The
menu kept `w-col-6` with `min-w-max`. At 1920 every one of these equals the Figma width, and the
line counts now hold at every width.

**Proposed:**
- Rule in Section 11 step 1 and the composed-box section: text-block widths (heading max-widths,
  paragraph measures) are not grid sizes. Use `em` from Figma (`width / font px`), even when the
  Figma width is a column.
- Script option `--measure W FONT` that prints the em value.
- Checklist: every multi-line heading keeps its Figma line count at 1024 and 1280, not only at
  360.

## 2. Free space inside fixed-height boxes shrinks between 1024 and 1440

Same cause as item 1. The box height is `--grid` and shrinks to 0.533, while its text shrinks less,
so the free space inside it shrinks faster than the box. Measured as the space below the lowest
content, as a share of the section height:

| Section | 1920 / 1440 | 1280 | 1024 |
|---|---|---|---|
| Products | 18 % | 16.5 % | 13 % |
| Events | 12.8 % | 11.4 % | 8.6 % |
| Collections | 18 % | 16 % | 11 % |

Everything still fits, but the vertical balance differs from Figma, and longer copy (a third line
of heading, a longer product name) could overflow at 1024. The `overflow: hidden` on these sections
would hide it.

**Proposed:**
- In "Composed boxes", prefer `min-height` over a fixed height when the box holds text, since text
  does not scale like the grid.
- Checklist: at 1024, measure the content height inside every fixed-height box against the box
  height, not only overlap.

## 3. Text next to a grid photo gets close at 1024

The Craftsmanship title and paragraph sit beside a collage whose x positions are `--grid`.

| Width | Gap between text and first photo frame |
|---|---|
| 1920 | 180 px (9.4 %) |
| 1024 | about 41 px (4 %) |

The paragraph would have reached the photo with a pure em measure (28.5em = 456 px at 16 px). It
needed `w-[min(28.5em, var(--container-col-5))]`.

**Proposed:** document the pattern for text beside grid-positioned media: em measure capped by
the grid space available, `min(Nem, var(--grid-token))`. Add "text beside a grid image keeps a
visible gap at 1024" to the overlap check.

## 4. Grid tokens leak into the tablet and phone tiers

`--grid` holds its 1024 value below 1024. That is fine for columns that stack to 100 %, but column
tokens used without an `lg:` prefix, or with `md:`, changed tablet and phone layouts:

- **Hero intro** `max-w-col-4`: 427 px became 304 px on phones (screen content width 358), so it
  needed `max-w-[26.75rem]` below lg.
- **Menu panel** `md:max-w-col-6`: 652 px became 464 px at 768, too narrow for its h2 links. It
  now uses a per-tier variable (`--menu-panel`: 652 px below lg, `col-6` from lg).
- **Brand story photo** `md:w-col-3`: 315 px became 224 px on tablet. It now uses a fixed tablet
  width.

**Proposed:**
- Note in Section 6: a grid token used below lg (without an `lg:` prefix, or with `md:`) holds its
  1024 value, about 53 % of Figma. Give tablet and phone their own widths.
- Checklist: search for grid tokens without an `lg:`/`xl:` prefix after migrating.

## 5. No reading measure for stacked text on tablet

Below lg, paragraphs had no max-width, so at 768 they ran about 100 characters per line (brand
story, craftsmanship, Instagram). The skill's tiers only set lateral padding. The fix was the Figma
measure in em (`max-w-[28.5em]`, from 570 / 20) below lg.

**Proposed:** Section 6 tablet tier: running text keeps its Figma measure in em (about 60–75
characters), as `max-w-[Nem]`, when the stacked column is wider.

## 6. `--min-ratio` can break a designed line count

`--min-ratio 1.15` raised the phone h2 from 37.5 to 39.5 px (38.7 at 360). At 360,
"Special Editions" (8.49em in the display font) then needed 329 px in a 328 px box and wrapped. The
line-count pattern fixes it, but the em width of the longest line depends on the content and the
font, so it had to be measured in the browser.

**Proposed:**
- After `--min-ratio` (or any font token change), rerun the 360 line-count check.
- Ship a small browser snippet in the references that prints the em width of each line of a
  selector (Range `getBoundingClientRect().width / font size`), so the `calc((100vw - gutters) / EM)`
  cap uses a measured value.

## 7. A font role changes the 1440 value, not only the phone value

`--font body` on a 20 px Figma size gives `clamp(1rem, …)`, so the size is 16 px from 360 up to 1440,
where the role-less `--font` gave 15 px at 1440. The 5.1 changelog says existing values are
byte-identical. That is true for `--font` without a role, but adopting a role moves the laptop value
as well.

**Proposed:** one line in Section 8: a role raises the floor at every width below the point where
the Figma line crosses it, including 1440, so the laptop size can change when a project adopts
roles.

## 8. Some boxes are hard to classify

The footer has a spacer that opens a window onto a fixed photo (320 px in Figma). By the 5.1 list,
it is a "section height", so `--grid`. But it is not part of a desktop row, and `--grid` would make
the phone window 170 px instead of 240 px. It stayed `--size`.

**Proposed:** in the classification, "section heights" means heights of boxes inside the desktop
composition. Reveal windows, sticky offsets and other heights that matter on phones use `--size`.

---

## What worked well

- `--grid` fixed both run 1 problems: the collection photos no longer overlap the menu (47 px gap
  at 1280), and paddings inside fixed-height boxes now shrink with them.
- `--v4` output for `--grid` / `--size` (`--spacing-grid-N`, `--spacing-size-N`) worked with
  `w-`, `h-`, `top-` and `max-w-` as documented.
- `min-h-11` on nav links gave 44 px at every width with no line-height override.
- Body 16 px on phones and line height 1.5 under lg read clearly better than run 1.
