# Compositions

Each id below is dealt by `scripts/deal.mjs`. The recipe is the auto-layout tree to build; token names
refer to `references/design-system.md`.

**How to read a recipe**

- Widths are **column spans on the 12-column guide**, never pixels.
- `GRID 12: A cols 1–7 · B cols 8–12` means a **flex row**: `row(parent, name, [7, 5])`, A bound to
  `span/7`, B to `span/5`. Spans that add up to less than 12 (`A cols 1–6 · B cols 8–12`) use
  `SPACE_BETWEEN` (two blocks), so the first starts on column 1 and the last ends on column 12.
- A recipe that lists rows inside one block (`H1 cols 1–9 (row 1) · Body cols 1–5 (row 2)`) is a
  VERTICAL stack whose children each get their span width with `spanTo()`.
- **Real GRID only where a recipe says `real GRID`:** items that span rows or a 2D layout
  (`s-gallery-wall`; `s-catalogue` and `hero-strip` only when they use row spans; three or more blocks
  with empty columns between them).
- `measure-text` only limits line length inside a span.
- "Fill" means `layoutSizingHorizontal = 'FILL'`.
- All sections carry `padX = layout/margin` and `padY = layout/section-pad` (`section()` does this)
  unless the recipe says full-bleed.
- Mobile: spans collapse to the full 4-column width; flex rows become columns (`toColumn()` for frames,
  `Layout=Stack` for instances).

Neighbouring sections must not share an id, and no id appears twice on a page (the deal guarantees
it). Mirroring a composition does **not** make it a different one.

Every recipe lists **needs**: the content it assumes. If the content does not match, redraw that
section (`--redraw section:<role>`) rather than bending the content, or tell the deal the truth with
`--have` / `--items`.

---

## Heroes

### `hero-poster-type`
The name or headline set enormous across the full width; a photograph band underneath.
```
Section/Hero  VERTICAL, gap stack-l, padX margin, padTop stack-l
├─ Hero/Title          TEXT Display, Fill (spans 12), max 2 lines
├─ Hero/Lede           GRID 12: TEXT Statement cols 1–7 · Button cols 10–12 (aligned end, bottom)
└─ image/hero          RECT Fill, ratio 21:9 (or Media Ratio=16:9), radius per direction
```
Needs: a short name or headline (≤ 20 characters reads best), one strong landscape photo.

### `hero-full-bleed`
The photograph is the section's own fill; text sits bottom-left on a scrim.
```
Section/Hero  VERTICAL, Fill, height ≈ 1000 FIXED, primaryAxisAlign MAX,
              padding margin all round, fills = [IMAGE (uploaded to this node)], scrim() child (scrim/base)
└─ Hero/Copy  VERTICAL: TEXT H1 in fg/on-image (span 9) · TEXT Body in fg/on-image (span 5) · Button (HUG)
```
Needs: one photo whose lower-left area is calm. Check the lede's contrast, not only the H1.

### `hero-split-7-5`
```
Section/Hero  GRID 12, gap gutter, align end
├─ Hero/Text   VERTICAL, cols 1–7, gap stack-m: TEXT H1 · TEXT Body (measure-text) · Button
└─ image/hero  RECT cols 8–12, tall portrait 4:5 (vfill)
```
Mobile: one column, image first. Needs: one portrait photo.

### `hero-offset-stack`
Headline top-left, photograph bottom-right on a different column line; the lede answers on the left.
```
Section/Hero  VERTICAL, gap stack-l
├─ GRID 12: TEXT H1 cols 1–8
└─ Hero/Row   GRID 12, gap gutter, align end
   ├─ Hero/Side  VERTICAL cols 1–4: TEXT Body + Button
   └─ image/hero RECT cols 6–12, landscape 3:2
```
Needs: a landscape photo.

### `hero-index`
No photograph needed: the headline plus the offerings as large rows that are themselves the menu.
```
Section/Hero  VERTICAL, gap stack-l
├─ GRID 12: TEXT H1 cols 1–9
└─ Hero/Index  VERTICAL, Fill, gap 0
   └─ Row/List instances ×3–6 (Title in H2 size, Meta from col 9)
```
Separate rows with a tone step (alternate `bg/surface`) or space, never lines. Needs: 3–6 named
offerings (services, rooms, programmes).

### `hero-strip`
Headline over a strip of three or four photographs of unequal widths.
```
Section/Hero  VERTICAL, gap stack-l
├─ Hero/Head  GRID 12, align end: TEXT H1 cols 1–8 · VERTICAL (Body + Button) cols 10–12
└─ Hero/Strip flex row [5, 3, 4], fixed height on the hero (Media ratio or a FIXED height)
   └─ image/strip-1 span 5 · image/strip-2 span 3 · image/strip-3 span 4   (real GRID only with row spans)
```
Mobile: the strip becomes a HORIZONTAL swipe row (`clipsContent`, slots FIXED width). Needs: 3–4 photos
of one family.

### `hero-field`
A whole field of colour, one giant word, one small photograph inset.
```
Section/Hero  GRID 12, Fill, fill bg/field, padding margin, align end
├─ Hero/Text  VERTICAL cols 1–8, gap stack-m: TEXT Display (one or two words) · TEXT Body · Button
└─ image/inset RECT cols 10–12, portrait
```
Needs: a name or word that can stand alone.

### `hero-ui`
The product's own interface, large and cropped, built as a real fragment (`ui/…`).
```
Section/Hero  VERTICAL, gap stack-l
├─ GRID 12: TEXT H1 cols 1–7 · VERTICAL (Body + Button) cols 9–12
└─ ui/screen   FRAME Fill (spans 12), height ≈ 760, clipsContent, real data inside
```
Needs: `--have product-ui` (a real product). Never a grey-bar dashboard.

---

## Sections

### `s-statement`
One paragraph set at statement size; the section heading sits at the left on the same top line.
```
Section/X  GRID 12, gap gutter, align start
├─ TEXT H2 cols 1–4          the section name
└─ TEXT Statement cols 5–12  ≤ 25 words, about 3 lines
```
Needs: one claim sentence.

### `s-split-media`
```
Section/X  GRID 12, gap gutter, align center
├─ image/x   RECT cols 1–6, 4:5
└─ X/Text    VERTICAL cols 8–12, gap stack-m: TEXT H2 · TEXT Body ×1–2 · optional Button
```
Needs: one photo, 60–120 words.

### `s-index-list`
Full-width rows: title large on the left, meta and detail on the right columns.
```
Section/X  VERTICAL, gap stack-l
├─ TEXT H2
└─ X/List  VERTICAL, Fill, gap 0
   └─ Row/List instances (Title cols 1–6 | Meta cols 7–9 | Detail cols 10–12), padY stack-s,
      alternating bg/surface
```
Needs: 4–12 items with a title and one or two facts (`--items role:4` or more).

### `s-gallery-wall`
A grid of photographs with spans; captions in Small under some.
```
Section/X  VERTICAL, gap stack-l
├─ TEXT H2
└─ X/Grid  real GRID, 12 cols × 2–3 rows, gaps gutter, rows hug
   ├─ image/g1  cols 1–7, rows 1–2
   ├─ image/g2  cols 8–12, row 1
   ├─ image/g3  cols 8–12, row 2
   └─ Media/Captioned cells as needed
```
Needs: 4–6 photos.

### `s-filmstrip`
A row of photographs that runs past the right margin (clipped), each with a caption.
```
Section/X  VERTICAL, gap stack-l, padRight 0
├─ X/Head  GRID 12: TEXT H2 cols 1–6 · TEXT Body cols 8–11
└─ X/Strip HORIZONTAL, Fill, gap gutter, clipsContent
   └─ Media/Captioned ×5–7, width span/4, image 3:4
```
Needs: 5+ photos of one family.

### `s-big-figure`
One real number or word set huge, with the sentence that explains it.
```
Section/X  GRID 12, gap gutter, align end
├─ TEXT Display cols 1–7   e.g. "1972" or "14 rooms"
└─ VERTICAL cols 8–12: TEXT H2 + TEXT Body
```
Needs: one true figure from the brief (or a marked dummy figure, consistent with the rest of the page).
When the page has this section, the hero does not repeat the figure.

### `s-columns-text`
Heading across, then two or three columns of real prose. No fills, no icons, no cards.
```
Section/X  VERTICAL, gap stack-l
├─ GRID 12: TEXT H2 cols 1–8
└─ X/Cols  GRID 12, gap gutter
   └─ VERTICAL ×3 at cols 1–4 / 5–8 / 9–12 (or ×2 at 1–6 / 7–12): TEXT Body/Strong + TEXT Body
```
Needs: 2–3 genuinely distinct points with 40–80 words each.

### `s-field-band`
A full-bleed band of field colour with one statement and the action.
```
Section/X  GRID 12, Fill, fill bg/field (or bg/inverse), padX margin, padY stack-xl, align end
├─ TEXT H1 cols 1–8
└─ Button cols 10–12 (justify end)
```
Needs: one sentence and one action. Use once per page.

### `s-sticky-pair`
A narrow heading column on the left, a long stack of content on the right.
```
Section/X  GRID 12, gap gutter, align start
├─ X/Side  VERTICAL cols 1–4: TEXT H2 · TEXT Small (short context)
└─ X/Main  VERTICAL cols 5–12, gap stack-l: content blocks (text, Media/Captioned)
```
Needs: a story, a process or 3–5 featured items (it holds three featured projects well).

### `s-catalogue`
A wrap of real items with photo, name and price/fact. Only for genuine catalogues.
```
Section/X  VERTICAL, gap stack-l
├─ X/Head  GRID 12: TEXT H2 cols 1–6 · TEXT Body cols 8–12
└─ X/Items HORIZONTAL WRAP, gap gutter, counterAxisSpacing stack-l (real GRID only with row spans)
   └─ Card instances, width span/3 (4 per row) or span/4 (3 per row), Media 4:5 + name + price
```
Needs: 6+ real items (`--items role:6`). Not for "features".

### `s-flow`
A process shown as a horizontal sequence of named stages (names, not numbers), with real durations.
```
Section/X  VERTICAL, gap stack-l
├─ TEXT H2
└─ X/Flow  flex row, gap gutter: 3 stages [4, 4, 4], 4 stages [3, 3, 3, 3], 6 stages [2 ×6];
   5 stages do not divide 12: use a VERTICAL list of rows instead
   └─ VERTICAL per stage, top padding stack-s, fill steps through bg/surface → bg/surface-raised:
      TEXT Body/Strong (stage name) + TEXT Small (duration/detail)
```
Needs: a real process of 3–6 stages; if it is not truly sequential, use `s-columns-text`.

### `s-place`
Location as a large photograph of the place (or real map image) beside the address and hours.
```
Section/X  GRID 12, gap gutter
├─ image/place  RECT cols 1–7, 3:2
└─ X/Info  VERTICAL cols 9–12, gap stack-m: TEXT H2 · TEXT Body (address) · Row/List ×n (hours)
```
Needs: an address (dummy allowed when marked).

### `s-spec-table`
A definition list: term on the left, value on the right, rows separated by tone steps.
```
Section/X  GRID 12, gap gutter
├─ TEXT H2 cols 1–4
└─ X/Table VERTICAL cols 5–12, gap 0: Row/List instances (Title = term, Detail = value)
```
Needs: 5+ facts (materials, dimensions, inclusions, terms, contact details).

### `s-full-image`
One photograph across the whole width, with a single caption.
```
Section/X  VERTICAL, Fill, padding 0, gap stack-s
├─ image/full RECT Fill (full-bleed), height ≈ 960 (token)
└─ TEXT Small, padX margin
```
Needs: one remarkable photograph. Counts as the page's one "rest".

### `s-questions`
Real questions as rows, each with its answer visible (no fake accordions in a static file).
```
Section/X  GRID 12, gap gutter
├─ TEXT H2 cols 1–4
└─ X/List VERTICAL cols 5–12, gap stack-m: per item VERTICAL: TEXT Body/Strong + TEXT Body
```
Needs: 4+ questions a visitor really asks.

### `s-logo-wall`
Client logos as proof. Only real logos with permission; until they arrive, marked dummy wordmarks
(invented names, never real companies).
```
Section/Clients  VERTICAL, gap stack-l
├─ TEXT H2 (span 8)
└─ Clients/Wall  HORIZONTAL WRAP, Fill, gap gutter, counterAxisSpacing gutter
   └─ Logo/Slot instances (fixed size inside the component; 6 per row Desktop, 3 Mobile; wordmark Body/Strong)
```
Needs: logos. Hide the section when the CMS has none. The audit exempts `Clients/…` and `Logo/…`
from the identical-cards rule.

### `s-close-name`
Footer: the name returns at full width, with the few links that matter.
```
Footer  VERTICAL, Fill, fill bg/inverse, padding margin, gap stack-l
├─ Footer/Links flex row [3, 3, 3, 3]: TEXT Small groups (address, email, social, credits) in fg/inverse-muted
└─ TEXT Display in fg/inverse, Fill (the name)
```
Credits for photographs go in Footer/Links as one Small line.

### `s-closing-simple`
Footer variant when the name is long: name and sentence on the left, links on the right.
```
Footer  GRID 12, Fill, fill bg/surface, padding margin
├─ VERTICAL cols 1–6: TEXT H2 (name) + TEXT Body (one sentence)
└─ VERTICAL cols 9–12: TEXT Small links ×n
```
