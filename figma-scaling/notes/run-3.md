# figma-scaling 5.1: field notes from a below-1440 review

Source: the same client home page as runs 1 and 2 (name not published; Next.js 16, Tailwind v4,
1920 Figma frame), on 5.1 tokens, reviewed on 2026-10-19 after later redesigns (Craftsmanship became
one photo, the collections CTA moved). The skill was not re-applied; this was a visual and measured
check of tablet and phone only. Checked at 375 (Chrome window), 390 and 768 portrait with touch,
1024×768 landscape with touch, 1280×800, plus 1440×900 and 1920×1080 for comparison, in headless
Chrome over CDP with computed styles and measured line counts.

Overall the phone and tablet tiers hold up: no horizontal overflow at any width, phone type reads
well (h1 56, h2 33.7, body 16/24), section padding is even (63 px phone, 84 px tablet), paragraph
measures sit at 41–52 characters, tap targets are 44 px. The problems below are ordered by impact,
each with what happened, why, and a proposed change.

---

## 1. Grid-width text blocks came back after a redesign

Run 2 item 1 was fixed with em widths, but sections redesigned later went back to column widths,
and nothing in the skill caught it:

| Heading | 1920 | 1440 | 1280 | 1024 |
|---|---|---|---|---|
| Craftsmanship title (`lg:col-span-5`) | 2 lines | 2 | 3, last line "FAR" alone | 3 |
| Brand story title (in a grid column) | 2 lines | 2 | 3 | 3 |

The footer contact column (`lg:col-span-4`) also wraps the store address at 1024, leaving
"Selatan" alone on a line.

**Why:** the em rule lives only in the notes and in the code that was fixed. A redesign rewrites
the markup, and the line-count check is a manual step done once at migration.

**Proposed:**
- Put the run 2 rule (text-block width = `figma_width / figma_font_px` em, capped by the grid
  space with `min()`) in SKILL.md itself, so it applies to new and redesigned sections too.
- Ship a re-runnable check: a browser snippet or script that lists every heading and paragraph
  whose line count at 1024 and 1280 differs from 1920. Run it after any layout change, not only
  after migrating.
- Checklist: no heading ends in a one-word line at 1024 and 1280 (an orphan reads as a mistake in
  display type, even when the line count is right).

## 2. Proportional heights ignore the viewport height

The hero is `lg:h-[clamp(46rem, 71.875vw, 115rem)]`, a `--grid` height. On an iPad in landscape
(1024×768) it is 736 px, so 32 px of the next section shows under the first screen, and
"Scroll to Explore" sits on the seam. At 1280×800 and above the hero is taller than the screen,
as in Figma.

**Why:** `--grid` scales with width only. A box that is meant to be the first screen needs a
floor tied to the viewport height, and the skill has no category for that.

**Proposed:**
- In the classification, add "first-screen boxes" (hero, full-screen intros): `--grid` height
  with a `100svh` floor, as `max(var(--grid-token), 100svh)`.
- Checklist: check at realistic screen sizes, not only widths. At least 1024×768, 1280×800 and
  1366×768.

## 3. Tiers by width assume a mouse at lg

The Instagram band is `lg:h-svh` because from lg it shows a cursor trail of photos. On a 1024×768
touch screen there is no trail, so it is a full screen of cream with three short lines (content
starts 287 px from the top and ends 364 px from the bottom). The code comment already says "below
lg there is no pointer", but lg does not mean a pointer.

**Why:** Section 6 sets tiers by width only. Tablets in landscape reach lg with touch.

**Proposed:**
- Note in Section 6: layout that exists because of a pointer (cursor trails, hover reveals,
  pinned or held sections) is keyed on `(hover: hover) and (pointer: fine)`, Tailwind v4
  `pointer-fine:`, not on `lg:`. Without a pointer, the section falls back to the stacked tier's
  padding.
- Checklist: one pass at 1024×768 with touch emulation, where width says desktop and input says
  tablet.

## 4. The tablet tier is the phone stack, stretched

At 768 the footer's four contact groups stack in one column of about 360 px, and the right half of
the panel is empty, while the link columns below already use two columns. Other sections are fine
at 768 because they center or keep a measure.

**Why:** Section 6 gives tablet its own padding and measure, but no guidance on columns, so short
groups keep the phone stack.

**Proposed:** Section 6 tablet tier: groups of short items (contact blocks, link lists, specs) go
to two columns at md instead of keeping the phone stack. This is low impact, with one case on this
page.

## 5. The checks need touch and height, and a way to run them without Playwright

Items 2 and 3 only show at a real height with touch emulation, and the project had no Playwright.
The Chrome extension window also could not be widened past a 375 px viewport (resizing changed only
the height), so tablet widths had to be checked headless. A short, dependency-free Node script
(Node 24 `WebSocket` + Chrome `--headless=new --remote-debugging-port`,
`Emulation.setDeviceMetricsOverride` and `Emulation.setTouchEmulationEnabled`, then
`Page.captureScreenshot` per section) did the job.

**Proposed:** ship that script in `scripts/` (sizes as `WxH[:touch]`, a screenshot per section,
a JSON of line counts, measures and section paddings), and point the checklist at it.

---

## Applied in the project (same day), as evidence for the proposals

- Item 1: Craftsmanship title `lg:col-span-7 lg:max-w-[10em]` (720 / 72); brand story title
  `lg:w-[8.4em]` (598 / 72, longest line measured at 8.304em); footer address
  `lg:whitespace-nowrap` (20.4em). Both titles now keep 2 lines at 1024, 1280, 1440 and 1920.
  A catch for the skill text: an em width wider than its flex column grew the column and caused
  18 px of horizontal scroll at 1280. The column needed `min-w-0` so the title runs into the
  padding instead. Worth one line next to the em rule.
- `text-pretty` on the brand story paragraph removed a one-word last line at 1280. For paragraphs
  this is cheaper than an em width, so it could be the skill's default suggestion.
- Item 2: the hero keeps `min-h-svh` from lg too (it was reset with `lg:min-h-0`): 768 px at
  1024×768, unchanged at 1280 and above.
- Item 3: Instagram `pointer-fine:lg:h-svh pointer-fine:lg:py-0`: full screen with a mouse
  (800 / 900 / 768 px at 1280 / 1440 / 1024), a 389 px band at 1024×768 with touch.
- Item 4: footer contact groups `md:grid md:grid-cols-2 md:gap-x-fluid-30 lg:flex`, lined up with
  the link columns below.
- Checked afterwards: no horizontal scroll at 390, 768, 1024, 1280 and 1440.

## Outside the skill (for the record, not for the skill)

- The hero intro paragraph sits on the white bag in the photo at every width, 1920 included, so
  its contrast is weak. This is a photo or overlay choice, not scaling.
- The inner pages (About, Collections, Event, Contact) are still scaffolds and were not reviewed.

## What worked well

- No horizontal overflow from 375 to 1920.
- "Special Editions" and the other collection links keep one line at 375 (run 2 item 6 fix holds).
- Phone body 16/24 and the 28.5em measure below lg read clearly; tablet paragraphs stay at
  41–52 characters per line.
- `--grid` sections at 1024 and 1280 (products fan, events strip, brand story split) keep the
  desktop composition without overlap.
