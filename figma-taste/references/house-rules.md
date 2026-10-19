# House rules: the why

Each rule exists because breaking it is either a tell (the design reads as generated) or a debt (the
file is unpleasant to hand over). The audit (`scripts/audit.figma.js`) measures every rule marked ⚙.

## Structure

**⚙ Auto layout for every container with related children.** A frame with absolute children breaks
the moment a word changes; nothing reflows, nothing aligns, and the developer reading it in Dev Mode
gets `position: absolute` everywhere. Auto layout is how Figma says flex and grid. Loose frames are
kept for one job: deliberate overlap (type over a photograph, a collage, a cropped object breaking a
section edge). Name those `free/…` so the audit and the next designer know it was intended.

**⚙ No useless wrappers.** Models wrap everything "to be safe". A frame with one child, no fill, no
padding, no clip and no layout role adds a level of nesting and nothing else. The audit flags
one-child, no-padding, no-fill frames. Delete them and append the child to the real parent.

**⚙ Everything bound to a token.** A raw hex in a fill is a colour nobody can change in one place.
A raw `24` in a gap is a spacing nobody can re-scale for mobile. Bind fills/strokes with
`setBoundVariableForPaint`, gaps/padding/radius with `setBoundVariable`. Text goes through styles,
and the styles' sizes are bound to `layout` variables, so a Mobile mode re-sets the whole type scale.

**⚙ Semantic names.** `Frame 482` is unreadable in the layers panel and useless in handoff.

**Components for repetition.** Three similar rows built by hand are three things to fix later. Build
the row once as a component with text properties, place instances.

## Visual

**⚙ Two-line headlines.** A headline that wraps to four lines is a paragraph set too large. The
gallery-site median hero is 5 words, about 32 characters.

**⚙ Title and section headings.** The commonest complaint about a page is "I can't tell what this
is". The first screen carries the name and what it is; every section is named.

**⚙ Non-repeating compositions.** When every section is a centred title over a grid of cards, the
page is one block repeated. Each section's composition is dealt; neighbours never match.

**⚙ No eyebrows.** The small uppercase label above a heading ("FEATURES", "OUR STORY") repeats what
the heading says and lands in the same spot on every generated page.

**⚙ No index numbers.** 01 / 02 / 03 next to items whose order means nothing is costume.

**⚙ No monospace outside code.** Monospace as "technical" styling is one of the strongest current
tells.

**⚙ No gradients, glows, glass, shadows at rest.** The default AI palette of effects. Elevation is for
things that truly float (a menu, a dialog). A neutral scrim under text on a photograph is allowed and
must be named `scrim`.

**⚙ No hairlines.** Thin dividers and outlined boxes are a way of structuring without deciding. Use
space, a tone step, or a change of scale. Form fields keep their outlines (name them `field/…`).

**⚙ No identical card rows.** Three equal cards with an icon on top is the single most generated
section on the web.

**No styled accent word.** The one word in italic serif or accent colour inside a headline is a
template move. The words carry the emphasis.

**No assistant palette.** Cream ground with terracotta, or violet/indigo accents, unless the brand
genuinely owns them.

**⚙ Real photographs.** Grey rectangles and stock illustrations say "not finished". At least four real
photographs on a marketing page, chosen for this subject.

**No invented proof presented as real.** The default content mode is dummy-filled, so a preview reads
as a finished page. Dummy proof (logos, testimonials, stats) is allowed only when every dummy layer is
marked (annotation "Dummy" and a ` · dummy` name suffix, via `txt(..., { dummy: true })` or `dummy()`),
listed in the report's Dummy content list, and never uses **real** company names, logos or people: a
real name reads as a false claim of a relationship. Real facts from the brief stay unmarked.

**Columns on the grid.** ⚙ The house grid (1920 · 12 columns · margin 60 · gutter 30) is only useful
if content lands on it. Flex rows with `span/<n>` widths do (`row()`); GRID is for 2D layouts only
(row spans, gallery walls); `layoutGrow` 7:5 lands 5px off. The audit warns `off-grid` for left/right
edges more than 1px from a column line (hug-width children are checked on the left edge only).

## Allowed exceptions (and how to mark them)

| Exception | Mark it |
| --- | --- |
| Deliberate overlap or collage | frame name starts with `free/` |
| Scrim gradient under text on a photo | layer named `scrim` |
| Shadow on a floating menu, dialog, popover | name contains `menu`, `dialog`, `popover` or `overlay` |
| Outline on an input, select, checkbox | name starts with `field/` |
| A real interface fragment inside a page (product UI) | frame name starts with `ui/`; inside it table rules and borders are allowed |
| Brand-mandated banned device (e.g. the logo is a gradient) | keep the asset, say so in the report |
| Statement and Quote text over two lines | not headlines: the two-line rule applies to Display and Heading styles (and unstyled text ≥ 48px) |
| A client logo wall (uniform by design, often required by a PRD) | container named `Clients/…` or `Logos/…`, children instances of `Logo/…`; exempt from the identical-cards rule |
| Dummy content | annotation "Dummy" + ` · dummy` name suffix; counted by the audit, not failed |
| © ® ™ in legal lines | allowed; the emoji rule ignores them |
