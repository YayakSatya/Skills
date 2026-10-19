# Auto layout recipes

Figma's auto layout is CSS flexbox (HORIZONTAL / VERTICAL, with WRAP) and CSS grid (`layoutMode =
'GRID'`). Build with them by default. Read figma-use's gotchas once; the rules that bite most:

- Append the child to its auto-layout parent **before** setting `layoutSizingHorizontal/Vertical`
  to `FILL` or `HUG`.
- `resize()` resets sizing modes to `FIXED`: call it **before** setting sizing. This is why every
  component goes through `component()` (resize, then hug).
- Wrapping text: append, `resize(width, h)`, then `textAutoResize = 'HEIGHT'`, then
  `layoutSizingHorizontal = 'FILL'` if it should stretch. A text with a token width: FIXED +
  `bind(t, 'width', token)` + `textAutoResize = 'HEIGHT'` (text cannot take `maxWidth`).
- `counterAxisAlignItems` has no `STRETCH`; use `MIN` and give children `FILL`.
- Children's sizing enums (`FIXED|HUG|FILL`) are not the frame's axis enums (`FIXED|AUTO`).

## Decision table

Flex is the default. It is what the content needs to follow the layout guide, and what developers read
as flexbox. GRID is kept for layouts that are really two-dimensional.

| What the content is | Container |
| --- | --- |
| Things stacked top to bottom | `createAutoLayout('VERTICAL')` |
| Columns of a section (7+5, 4+8, 3+3+3+3, 6+5 with an empty column) | **flex row**: `row(parent, name, [7, 5])`, children FIXED width bound to `span/N` |
| A block that only stops short of full width | the node itself, width bound to `span/N` (`spanTo()`); no wrapper |
| Side by side with no column meaning (button + link, icon + label) | HORIZONTAL, gap from a `stack-*` token, children HUG |
| A flowing set of tags, links, logos, thumbnails | HORIZONTAL + `layoutWrap = 'WRAP'`, `counterAxisSpacing` for row gap |
| Items that span rows, a gallery wall, a magazine spread; 3+ blocks with empty columns between them | **GRID** (`grid()` + `cell()`) |
| Text over a photograph | the section's own IMAGE fill + `scrim()` + normal auto-layout children |
| Collage, cropped object crossing an edge | `free/…` frame, or one auto-layout child with `layoutPositioning = 'ABSOLUTE'` |
| A list of rows | VERTICAL of row **instances** (component built once) |

## The page skeleton

```
Page/Desktop                VERTICAL, width 1920 FIXED, height HUG, gap 0, fill bg/canvas,
│                           layout mode Desktop, columnGrid() (12 · margin 60 · gutter 30)
├─ Nav                      HORIZONTAL, FILL, SPACE_BETWEEN, padX layout/margin
├─ Section/Hero             per composition, FILL
├─ Section/Intro            each section: padX = layout/margin, padY = layout/section-pad
├─ ...
└─ Footer
```

Section spacing lives in each section's own vertical padding, bound to `layout/section-pad`, not in
the wrapper's `itemSpacing`. That lets a section with a full-bleed field colour run edge to edge while
keeping the rhythm. Sections keep `padX = layout/margin`; **every horizontal gap between columns is
`layout/gutter`**. There are no other horizontal spacing values at section level.

## Following the layout guide

A visible grid only helps if content lines up with it. At 1920 the content width is 1800 and one
column is (1800 − 11·30) / 12 = **122.5**.

- A 7-column span is 7·122.5 + 6·30 = **1037.5**; a 5-column span is **732.5**; 8 columns 1190.
- `layoutGrow` 7:5 shares the space left after the gap: 1770 × 7/12 = **1032.5** and 737.5. That is
  5px off the grid. **Never split with grow weights.**

### Preferred: flex rows with span tokens

```js
const r = row(section, 'Stats/Row', [7, 5]);              // HORIZONTAL, FILL, gap layout/gutter
const fig = await txt(r.node, '350+', 'Display'); r(fig);  // width bound to span/7
const note = await txt(r.node, copy, 'Body/Default'); r(note); // width bound to span/5
```

- Spans that add up to 12 sit side by side; the gap is the gutter, so the edges land on column lines.
- Spans that add up to less than 12 (e.g. `[6, 5]`, column 7 left empty) use `SPACE_BETWEEN`: the first
  block starts on column 1 and the last ends on column 12.
- With three or more blocks and empty columns between them, space-between would spread them off the
  column lines: use GRID instead (`row()` notes this).
- A lone block that should stop at 8 columns is the node itself with `spanTo(node, 8)`, never a frame
  around it (the audit flags one-child wrappers and suggests exactly this).
- The `span/N` tokens live in `<Brand> · figma helpers` (no code syntax). Add a missing N there with
  its per-mode value (`spanWidth(n, 1920, 12, 60, 30)`; Mobile = full content width) before using it.

Tested in a run: 28 blocks in 12 flex rows, every left and right edge on a column line (±1px), page
heights unchanged from the GRID version.

### When you need GRID

Items that span rows (`Projects/Wall` with one card over two rows), gallery walls, magazine spreads.

```js
const g = await grid(section, 'Projects/Wall', 12, 2, { gap: 'layout/gutter' }); // appended, FILL, rows hug
await cell(g, bigCard, 0, 0, 7, 2);          // row 0, column 0, spans 7 columns and 2 rows
await cell(g, cardB, 0, 7, 5, 1, 'MIN');     // valign: MIN | CENTER | MAX | AUTO
await cell(g, cardC, 1, 7, 5, 1, 'MAX');
```

`grid()` binds the column gap to `layout/gutter` and sets every row track to hug its content (new GRID
frames start with FLEX row tracks, which made a hugging grid overlap its rows in testing). If grid auto
layout is unavailable in this API version, `grid()` falls back to wrap and notes it.

### Measures

`layout/measure-text` limits line length **inside** a span (an article paragraph kept to 640 for 45–75
characters). It never positions a block on the page.

## Images inside auto layout

Repeated media (cards, galleries, project tiles) are instances of the `Media` component, whose
`Ratio=3:2|4:5|16:9|1:1` variants fix the proportions; pages do not invent per-section heights and
the system has no page-specific `size/*` tokens. A one-off slot is a rectangle named `image/<slot>`:

```js
const img = imageSlot(parent, 'hero', { ratio: 16 / 9 });   // FILL width, height from the ratio
spanTo(img, 7);                                              // or a column span inside a flex row
```

`ratio` is computed once at build time from the current width: set the width (span or FILL inside a
sized parent) first. In a GRID cell, use `vfill: true`. A hero's own height (e.g. a full-bleed banner)
is set on the hero section, not as a token.

## Overlap without chaos

Type over a photograph: the section is an auto-layout VERTICAL frame with the photo as its own fill
(an IMAGE fill uploaded to the section's node id) and the text as normal auto-layout children. Add a
scrim with the tested helper:

```js
scrim(heroSection);        // rectangle "scrim", ABSOLUTE, stretch constraints, scrim/base (near-black
                           // in every theme), LAYER opacity bound to opacity/scrim
                           // (a paint opacity spread onto a bound paint was dropped in testing)
```

A gradient scrim built with `gradientTransform` produced no visible darkening in testing; use the flat
version. Even at 0.55, a busy photograph can leave body text hard to read: check the **lede's**
contrast in the screenshot, not only the headline's, and move the text to a calmer area, raise the
scrim, or choose another photo.

When something really must break the flow (a cutout object crossing two sections, a caption pinned
to a photo corner), append it to the auto-layout parent and set `layoutPositioning = 'ABSOLUTE'`
with constraints. One per section, named `free/<what>`.

## Mobile

1. Build Desktop (1920) fully, with every value bound to `layout` tokens. With several design options,
   wait until the user has picked one. Build Tablet (768) the same way only when the PRD asks for it.
2. Duplicate the wrapper (`clone()`), rename `Page/Mobile` (or `Option A/Mobile`), `resize(390, …)`,
   and set `setExplicitVariableModeForCollection(layoutCollection, mobileModeId)`. The grid, margins,
   type and spans follow the mode.
3. Screenshot. Fix only true structural differences:
   - A flex row (from `row()`) becomes a column with `toColumn(r.node, 'layout/stack-m')`; its span
     widths are 350 on Mobile anyway.
   - A GRID becomes one track: set `gridColumnCount` to 4 and let each child span 4, or rebuild it as a
     column.
   - Any other HORIZONTAL row **frame** becomes a column with `toColumn(frame, 'layout/stack-m')`. It sets
     VERTICAL, aligns MIN, resets grow, fills the children and makes the frame hug; without the hug,
     content gets clipped. It changes **that frame only**: never loop "every FIXED frame becomes HUG",
     which in testing broke `Logo/Slot`, whose height is a fixed token.
   - An **instance** cannot be turned into a column (the override does not persist): swap it to its
     `Layout=Stack` variant.
   - Hide a decorative secondary image (`visible = false`, not deleted); shorten the nav to wordmark +
     menu.
4. Never hand-edit numbers on the Mobile copy. If a value is wrong on Mobile, the token's Mobile mode
   value is wrong; fix the token.
5. **Check the outcome:** each wrapper's total height should be close to the sum of its sections (the
   audit reports both). A Mobile wrapper of 16,000px meant one service row had collapsed to a 1px text
   column.
