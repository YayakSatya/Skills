# figma-scaling 5.0: field notes for the next version

Source: migrating a client home page (name not published) (Next.js 16, Tailwind v4, 1920 Figma frame with a
Typography "Mobile" variable mode) to 5.0 on 2026-10-19, checked in headless Chrome at 360, 390,
768 and 1024. Ordered by impact. Each item has what happened, why, and a proposed change.

---

## 1. Bug: `--v4 --size` prints a namespace that `w-*`, `h-*`, `top-*` and `max-w-*` ignore

`fluid_tokens.py 46 --size --v4` prints `--size-fluid-46: clamp(...)`. Compiled with Tailwind 4
(`compile()` from the installed `tailwindcss`), `--size-*` feeds only the `size-*` utility.
`w-fluid-46`, `h-fluid-46`, `top-fluid-46` and `max-w-fluid-46` generate nothing. If a spacing token
with the same key exists, they silently use the spacing value, which is the phone curve that `--size`
exists to avoid.

`references/tailwind.md` (Section 1, "Widths and heights are sizes") tells readers to "register them
under their own keys from `--size` output", and that output does not work for widths, heights or
positions.

**Proposed:** in `--v4` mode, `--size` should print `--spacing-size-N` (usable as `w-size-N`,
`h-size-N`, `top-size-N`, `size-size-N`) or `--container-N` for max widths. Add a test that
compiles the printed lines with Tailwind 4 and checks `w-`, `h-`, `top-` and `max-w-`.

## 2. Element sizes lock at 1440 while the desktop layout is kept down to 1024

Below 1440, `--size` values hold their 1440 value (0.75×). The skill keeps the desktop composition
until the 1024 tablet tier, so between 1024 and 1440 a row built for 1920 is still about 1440 px
wide on a narrower screen.

Seen at 1024: in the collections section, the two side photos (`left-page` / `right-page`,
`w-col-3` = 315 px each) overlap the centred menu (`w-col-6`). Measured: the photos end at 372 px and start at 653 px, while the menu text runs
from 279 to 744 px, so about 93 px of photo covers the text on each side (still 8 px at 1280). Nothing in
the checklist catches this, because there is no horizontal scrollbar: the section has
`overflow: hidden`.

The 5.0 changelog says tablet now scales proportionally, but that is true for spacing and type
only. Sizes and grid columns don't follow, so the space between elements shrinks while the elements
themselves don't.

**Proposed (pick one, document it):**
- a) Grid-bound sizes (columns, page margin, gutters) scale with the viewport below 1440
  (`value = px × w / 1920`, flooring at the 1024 tier), so the 12-column grid always fits the
  screen. Keep the 1440 lock only for "physical" sizes: icons, buttons, tap targets.
- b) Keep the lock, but make the checklist require a check of every composed row at 1024 and
  1280 for overlap, not only for scrollbars. Add a rule: if the sum of fixed sizes in a row is
  greater than `w`, that row stacks or switches to `vw` widths below 1440.

Option (a) matches the intent of "proportional below 1440" much better. The project fix
was a mix: photo width `min(var(--container-col-3), 21.875vw)` (proportional below 1440, the
same from 1440 up), hidden below xl (1280), where even proportional photos leave no gap.

## 3. Mixing size heights with spacing paddings in the same box

Sections with a fixed desktop height (an element size, 3-point) and an inner top padding (spacing,
phone line) drift apart between 1024 and 1440. The height stays at its 1440 value while the padding
shrinks. Products at 1024: height 979.5 px, `pt-fluid-160` drops from 120 to 97.6 px, so the
content moves up and about 22 px more empty space appears at the bottom.

**Proposed:** a rule in Section 8 Exceptions / Section 11 workflow: padding and positions inside a
box whose height is a `--size` value use `--size` too, or the box uses `min-height` plus padding
instead of a fixed height. Also classify the cases the workflow does not mention:
- **Section heights**: size
- **Absolute offsets** (`top`/`left` of an image inside a fixed-height section): size
- **Page margin and gutters**: grid, see item 2

## 4. A Figma "Mobile" mode is ignored

The skill assumes "the Figma file has only the 1920 desktop frame", but many files have a
Typography variable collection with a Mobile mode even when there is no mobile frame. This one has
h2 46, h3 64, body-lg 24, body-md 18. The derived values ignore it: h2 37.5, h3 34, body-md 15.

**Proposed:**
- Section 11 step 1: check for a mobile variable mode or mobile frame. If one exists, its value is
  `mobile_px`.
- Script: `--mobile PX` overrides the derived phone value and keeps the same line and clamp form.

This also gives a clean escape hatch when a client asks for specific phone sizes. Here the user had
asked for smaller headings than the Figma Mobile mode, and the only way to honour that was a media
query that bypassed the model.

## 5. Heading hierarchy flattens on phones

`FONT_EXPONENT 0.5` halves every ratio on a log scale. At 390:

| Pair | Desktop | Phone | Ratio desktop to phone |
|---|---|---|---|
| hero / h3 | 210 / 72 | 58 / 34 | 2.92 to 1.71 |
| h2 / h3 | 88 / 72 | 37.5 / 34 | 1.22 to 1.10 |

h2 and h3 are nearly the same size on a phone (a 10% difference). h2 also became larger than the
size the client had approved (32), while h3 stayed equal to it.

**Proposed:** keep the exponent but add an option (script flag or documented rule) to preserve a
minimum ratio between adjacent type roles, for example 1.15. Or document that projects with
close heading sizes should set `--mobile` (item 4) per role.

## 6. One 15 px floor: small for body copy, inflates small text

Body copy (20 px in Figma) lands on the 15 px floor at 390. Lora at 15 px reads small on a phone.
The project had 16 px, and the Figma Mobile mode had 18 px. The floor is one constant for every font
role.

The single floor also inflates small Figma text above the design, at every width. `MIN_rem =
max(min_px, FONT_FLOOR_PX)` lifts a 14 px caption from 10.5 to 15 px at 1440, and at the 1920
baseline `clamp(15px, 14px, …)` still renders 15 px. Text under 11.25 px has MAX locked to MIN, so
a 12 px legal line is 15 px everywhere. This project's smallest text is 20 px, so it does not show
here, but any file with captions, badges or footnotes will not match Figma even at 1920.

**Proposed:** a floor per role, never above the Figma value:

```
FONT_FLOOR_BODY    = 16   // running text
FONT_FLOOR_UI      = 14   // eyebrow, label (nav and buttons are safer at 15)
FONT_FLOOR_CAPTION = 12   // legal, meta, badge, footnote

floor = min(FONT_FLOOR_role, figma_px)   // the floor never raises text above the design
```

- Script: `--font body|ui|caption` picks the floor, and `--font` alone keeps today's 15 px.
- Section 8: mention iOS/Android body guidance (16–17 px), and that form inputs need 16 px or
  more, or iOS Safari zooms the page on focus.
- 12 px is the hard minimum. Below it, serif faces like Lora break up on low-DPR screens.

## 7. Desktop line height carried to phone sizes

The skill converts the Figma line height to a unitless ratio and keeps it at every size. That is
right for headings. For body copy that shrinks (24 to 18 px, line height 1.4167, so 25.5 px), the
ratio is tight for a phone paragraph. The previous hand-tuned mobile scale used 1.5.

**Proposed:** a note in Section 8: body text under about 18 px usually needs a line height of
1.5 or more. Allow a per-tier line-height override (Tailwind `--text-X--line-height` inside a
`max-lg` block) as an accepted exception, not a model violation.

## 8. Shrinking text can break tap targets that were fine

The nav links (`p-fluid-10` + `text-nav` 20 px, line height 1.7) were 44 px tall. With the font at
15 px below 1440 they dropped to 40.5 px. The checklist has "tap targets ≥ 44px", but nothing points
out that a font token change changes the height of padded links.

**Proposed:** in the Tailwind reference, recommend `min-h-11` (plus flex centring) on interactive
text elements as the default, instead of relying on line height × padding. Add "re-measure tap
targets after changing font tokens" to the checklist.

## 9. Line-count headings need more than the "longest word" check

The hero title keeps three lines through `max-w-[6.08em]`. At 360 the derived hero size (55.2 px)
made 6.08 em (336 px) wider than the content box (328 px), so the title broke into four lines. No
single word overflowed, so the Section 8 check ("longest word fits at 360") passes while the
composition breaks.

**Proposed:** document the pattern for headings with a designed line count:
`font-size: min(var(--token), calc((100vw - gutters) / EM_WIDTH))`. Extend the check to "every
display heading keeps its designed line count at 360".

## 10. Mobile padding for sections that have no padding in Figma

Sections that are fixed height (or `h-svh`) with centred content in Figma have no vertical padding
to derive from. Once stacked below lg they need some. The skill has no rule, so the choice is ad hoc.
Here I used `py-fluid-160` to match the sections that do have a 160 top padding.

**Proposed:** a line in Section 6: "stacked sections without a Figma padding use the most common
section padding token of the design (usually the section top padding), so the vertical rhythm on
phones stays consistent".

---

## What worked well

- One `clamp()` per token, no media queries. The migration was a token swap plus removing
  `lg:`-prefixed pairs.
- Values from 1440 up were unchanged, so desktop needed no re-check.
- The script output matched Chromium's computed values exactly (hero 58.0 px, section padding
  63.5 px at 390).
- Spacing on phones reads balanced. 120/160 section padding landing on 53.5/63.5 is a good default.
