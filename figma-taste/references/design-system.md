# Design system in Figma

The system is built **for the whole site at the first page**, not for the page being drawn, and it is
left behind in a manifest so the next page extends it instead of rebuilding it.

`scripts/foundations.figma.js` builds everything in this file in one `use_figma` call (edit its
CONFIG), `scripts/tokens.figma.js` checks token hygiene, `scripts/manifest.figma.js` records the
system, and `scripts/collapse-options.figma.js` turns option modes into `Light` after the pick.

## What earns a variable

A value becomes a variable only when at least one of these is true:

1. **It changes by mode:** theme (Light/Dark, a temporary design option), breakpoint
   (Desktop/Tablet/Mobile) or brand.
2. **It is a shared decision:** used by two or more components or pages, and should change in one
   place.
3. **Developers need it as a named token in code.** It gets a WEB code syntax.

If none is true, keep the value in the text style, the effect style or the component, or write it in
the docs. These were made variables in a test run and should not have been:

| Do not make | Why not | Do instead |
| --- | --- | --- |
| `type/lh-*`, `type/ls-*` | Percentages in the style already scale with the mode's `fontSize`; binding turns them into pixels that need a hand-set value per mode | Percent `lineHeight` / `letterSpacing` in each text style; bind only `fontSize` |
| `font/*-style`, `font/*-strong` | Same value in every mode | The style name lives in the text style. Only family (`font/display`, `font/text`) varies, and only while options exist |
| `size/hero-h`, `size/image-hero`, `size/image-feature`, `size/gallery-row` | Numbers of one page composition, 1–3 uses each | Ratio variants on `Media` / `Card` (3:2, 4:5, 16:9, 1:1); a hero height lives on the hero |
| `size/logo`, `size/logo-w` | Used only by `Logo/Slot` | Fixed size inside the component (a variant per breakpoint if needed) |
| `layout/section-gap`, `radius/none`, `layout/measure-wide` | 0 bindings; a 0 radius needs no token; `measure-wide` equals `span/8` | Delete; keep `layout/measure-text` for article width |
| `span/*` with WEB code syntax | Figma-only helpers; in CSS this is `grid-column`, so `var(--span-7)` misleads | `<Brand> · figma helpers`, hidden, no code syntax, only the spans used |
| `shadow/overlay` in the theme | Same alias in every mode | Bind the effect directly to an alpha primitive |
| One-off primitives (`paper/25`, `sand/400`…) | Ramps with gaps | Full ramps with the same steps, generated once |

The token check (`tokens.figma.js`) reports all of these, plus variables on `ALL_SCOPES`, semantic
tokens without code syntax and variables with zero bindings (minus a `RESERVED` allow-list, each with a
reason). Run it at the end of step 5 and again at step 8.

## Target architecture: five collections

| Collection | Modes | Holds | Code syntax |
| --- | --- | --- | --- |
| `<Brand> · primitives` | `Value` | Full ramps (steps 50, 100, 200, 300, 400, 600, 800, 900, 950): ink, paper (ground), the accent hue, the subject hue, red / green / amber / blue for states; alpha colours for overlay and shadow | none; hidden from publishing; scopes `[]` |
| `<Brand> · theme` | `Light` (default); `Dark` only if asked. While comparing options: temporary `Option A` / `Option B`, collapsed after the pick | The 31 colour roles; `font/display`, `font/text` only while families differ by mode; `shape/image-radius` only while it differs by option | WEB |
| `<Brand> · layout` | `Desktop`, `Tablet` (when the PRD asks), `Mobile` | Values that change by breakpoint: grid, rhythm, measure, type sizes, input height | WEB |
| `<Brand> · system` | `Value` | Constants developers need: radius, border widths, opacity, icon sizes, tap target, font weights, breakpoints, container, motion | WEB |
| `<Brand> · figma helpers` | same as layout | `span/N` actually used by the layouts | none; hidden from publishing |

Constants live in `system`, not in a multi-mode collection with the same value in every mode; the token
check can then flag real mistakes instead of intended constants.

In a shared agency file, the prefix keeps this client's system apart from other brands' systems; set
`COLLECTION_PREFIX` / `STYLE_PREFIX` in the helpers. In a file of your own the prefix is still used,
so the next brand never collides.

### theme: the 31 colour roles

Every value aliases a primitive. G = ground hue, K = ink hue, A = accent, L / D = the theme's light /
dark hue. The generator maps them per mode; the steps below are its defaults (they pass contrast with
the default ramps and with a dark option).

| Role | Scopes | Light | Dark |
| --- | --- | --- | --- |
| `bg/canvas` | FRAME_FILL, SHAPE_FILL | G50 | G950 |
| `bg/surface` | FRAME_FILL, SHAPE_FILL | G100 | G900 |
| `bg/surface-raised` | FRAME_FILL, SHAPE_FILL | G200 | G800 |
| `bg/inverse` | FRAME_FILL, SHAPE_FILL | K950 | K50 |
| `bg/field` (a section-wide field colour) | FRAME_FILL | A100 | A900 |
| `bg/input` (kept apart from bg/field) | FRAME_FILL, SHAPE_FILL | L50 | G900 |
| `bg/disabled` | FRAME_FILL, SHAPE_FILL | K100 | G800 |
| `bg/overlay` | FRAME_FILL | alpha D 64% | alpha D 64% |
| `fg/default` | TEXT_FILL, SHAPE_FILL, STROKE_COLOR | K950 | K50 |
| `fg/muted` | TEXT_FILL | K600 | K300 |
| `fg/inverse` | TEXT_FILL | G50 | G950 |
| `fg/inverse-muted` (muted text on inverse blocks, footer) | TEXT_FILL | G300 | G600 |
| `fg/on-image` (text over photographs, always light) | TEXT_FILL | L50 | L50 |
| `fg/disabled` | TEXT_FILL | K400 | K600 |
| `fg/link-hover` | TEXT_FILL | A800 | A300 |
| `accent/default` | FRAME_FILL, SHAPE_FILL, TEXT_FILL | A600 | A400 |
| `accent/hover` | FRAME_FILL, SHAPE_FILL | A800 | A300 |
| `accent/pressed` | FRAME_FILL, SHAPE_FILL | A900 | A200 |
| `accent/on` | TEXT_FILL | L50 | D950 |
| `line/field` (form outlines only; no divider token) | STROKE_COLOR | K600 | G400 |
| `line/field-focus` | STROKE_COLOR | A600 | A400 |
| `line/field-error` | STROKE_COLOR | red600 | red400 |
| `state/error`, `state/success`, `state/warning` | TEXT_FILL, SHAPE_FILL, STROKE_COLOR | red600, green600, amber800 | red300, green300, amber300 |
| `state/*-surface` (3) | FRAME_FILL, SHAPE_FILL | red50, green50, amber50 | red950, green950, amber950 |
| `focus/ring` | STROKE_COLOR, EFFECT_COLOR | A600 | A400 |
| `image/placeholder` | FRAME_FILL, SHAPE_FILL | G200 | G800 |
| `scrim/base` (always near-black: scrims darken in every theme) | FRAME_FILL, SHAPE_FILL | D950 | D950 |

**Contrast, computed by the generator** for every theme mode: text ≥ 4.5:1 (`fg/default` ≥ 7:1),
`focus/ring`, field outlines and `accent/default` ≥ 3:1, state colours ≥ 4.5:1 on the canvas and on their
`-surface`. Any failure is returned in `contrastFails`; change the step in the role table or the base
hex, never ship with a failure.

### layout: per breakpoint

Desktop is the house standard (1920 · 12 columns · margin 60 · gutter 30, column 122.5). Mobile (390 ·
4 · 20 / 16) is the house proposal until the user confirms it; a PRD that asks for 360 or for Tablet is
a conflict to put into the step 1 question.

| Variable | Scopes | Desktop | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| `layout/margin` | GAP | **60** | 40 | 20 |
| `layout/gutter` | GAP | **30** | 24 | 16 |
| `grid/columns` | — | 12 | 8 | 4 |
| `layout/section-pad` | GAP | 120 | 88 | 48 |
| `layout/stack-xs` / `-s` / `-m` / `-l` / `-xl` | GAP | 8 / 16 / 32 / 64 / 140 | 8 / 14 / 28 / 52 / 104 | 6 / 12 / 24 / 40 / 64 |
| `layout/measure-text` (article body width) | WIDTH_HEIGHT | 640 | 560 | 350 |
| `type/display` | FONT_SIZE | 184 | 120 | 56 |
| `type/h1` | FONT_SIZE | 112 | 80 | 40 |
| `type/h2` | FONT_SIZE | 56 | 44 | 30 |
| `type/h3` | FONT_SIZE | 36 | 30 | 24 |
| `type/h4` | FONT_SIZE | 28 | 24 | 20 |
| `type/statement` (≤ 36 at Desktop: a paragraph set large) | FONT_SIZE | 36 | 30 | 22 |
| `type/body-l` | FONT_SIZE | 24 | 21 | 18 |
| `type/body` | FONT_SIZE | 20 | 18 | 16 |
| `type/label` | FONT_SIZE | 16 | 15 | 14 |
| `type/small` | FONT_SIZE | 15 | 14 | 13 |
| `type/caption` | FONT_SIZE | 13 | 12 | 12 |
| `size/input-h` | WIDTH_HEIGHT | 56 | 54 | 52 |

Type sizes are a starting point: replace them from the reference sheet (ref-extract prints sizes in px
at 1440; scale Desktop by 1920/1440) and keep the ratios.

### system: constants (one mode)

| Group | Tokens | Scopes |
| --- | --- | --- |
| Radius | `radius/s` 4, `radius/m` 8, `radius/full` 999, `radius/image` (decided once per direction) | CORNER_RADIUS |
| Borders | `border/width-s` 1, `border/width-m` 2 | STROKE_FLOAT |
| Opacity | `opacity/scrim` 50, `opacity/disabled` 40 (OPACITY variables hold 0–100; 50 reads back as 0.5) | OPACITY |
| Sizes | `size/icon-s|m|l` 16 / 20 / 24, `size/tap-min` 44 | WIDTH_HEIGHT |
| Weights | `font/weight-light|regular|medium` 300 / 400 / 500 (for code; the style name stays the weight in Figma) | FONT_WEIGHT |
| Breakpoints | `breakpoint/sm|md|lg|xl` 360 / 768 / 1280 / 1920, `layout/container-max` (alias of `breakpoint/xl`) | — (docs and code) |
| Motion (optional) | `motion/duration-fast|base` 150 / 250 | — (Figma cannot bind them) |

### figma helpers

`span/N` = N·column + (N−1)·gutter for the N the layouts use (Desktop span 7 = 1037.5, span 5 = 732.5,
span 8 = 1190). Tablet maps N/12 onto its 8 columns; Mobile is the full content width (350). No code
syntax, hidden from publishing.

## Text styles: the full scale

The system holds the whole scale so CMS output, forms and later pages all map to a style; a single
page still uses five or six sizes at most (the audit counts per page). Names are prefixed
`<Brand>/…`. `fontSize` is bound to the `layout` type tokens; line height and letter spacing are
**percent values in the style, never bound**.

| Style | Size token (Desktop / Mobile) | Family · weight | Line height · tracking |
| --- | --- | --- | --- |
| Display | `type/display` 184 / 56 | display | 92% · −4% |
| Heading/H1 | `type/h1` 112 / 40 | display | 95% · −3% |
| Heading/H2 | `type/h2` 56 / 30 | display | 100% · −2% |
| Heading/H3 | `type/h3` 36 / 24 | display | 110% · −1.5% |
| Heading/H4 | `type/h4` 28 / 20 | display · strong | 115% · −1% |
| Heading/H5 | `type/body` 20 / 16 (no new size) | text · strong | 140% |
| Heading/H6 | `type/small` 15 / 13 (no new size) | text · strong | 140% |
| Statement | `type/statement` 36 / 22 | display | 125% · −1% |
| Quote | `type/statement` | display | 125% · −1% |
| Body/Large | `type/body-l` 24 / 18 (article lead) | text | 145% |
| Body/Default | `type/body` | text | 155% |
| Body/Strong | `type/body` | text · strong | 155% |
| Body/Link | `type/body` (underline) | text | 155% |
| Label/Default, Label/Strong | `type/label` 16 / 14 (fields, buttons, menu links) | text | 120% |
| Small/Default, Small/Strong | `type/small` (meta, breadcrumbs, dates) | text | 145% |
| Caption | `type/caption` 13 / 12 (captions, credits) | text | 140% |

- H5 and H6 reuse body sizes: they exist so CMS H5/H6 map to a style, not to add steps.
- No eyebrow or tiny-caps style, even in a complete set; both are banned by the house rules.
- **Design options share one set of styles.** While options exist, `fontFamily` on the styles is bound
  to the theme's STRING variables `font/display` / `font/text` (modes `Option A` / `Option B`); the style
  name (weight) stays constant, so every family used must have those weights (the generator checks).
  Setting a wrapper's theme mode then switches colours **and** typefaces, and shared components follow.
  List every mode's fonts in the helpers' `FONTS` so text can be created in any mode.
- Verify every family and style string with `listAvailableFontsAsync()` (`Semi Bold`, not `SemiBold`).
- Bind `font/weight-*` on a style only if a test in this file shows the style name stays intact.

## Effect and grid styles

- `<Brand>/Elevation/Overlay`: one drop shadow, colour bound to an alpha primitive
  (`setBoundVariableForEffect`). Only menus, dialogs and popovers use it.
- `<Brand>/Grid/Desktop|Tablet|Mobile`: raw values, for frames designers make by hand.
- Page wrappers use `columnGrid()` from the helpers: the grid is bound to `layout/margin`,
  `layout/gutter` and `grid/columns`, so it follows the wrapper's mode.

## Components: the core set

Built in step 5 for **every later page**, even when the first page does not show them, on the
Components board, with every state shown as an instance. Page-specific units are built with their page.

| Component | Variants | Notes |
| --- | --- | --- |
| `Button` | `Kind=Primary|Quiet` × `State=Default|Hover|Pressed|Focus|Disabled|Loading` | uses accent/hover, accent/pressed, focus/ring, fg/disabled, bg/disabled |
| `Link` | `State=Default|Hover|Focus` | Body/Link, fg/link-hover |
| `Nav/Bar` | `Layout=Row|Stack` | fixed-width bar: `component(…, 'H', { width: 1920, fixedMain: true })` |
| `Nav/Menu` | — | the mobile overlay: bg/overlay, Elevation/Overlay |
| `Dropdown` | `State=Closed|Open` | Elevation/Overlay |
| `Breadcrumb` | — | Small/Strong |
| `Field` | `Type=Input|Select|Textarea|File` × `State=Default|Focus|Error|Disabled` | bg/input, line/field*, state/error, Label/*, size/input-h; outlines named `field/…` |
| `Alert` | `Kind=Success|Error|Warning` | state/* and state/*-surface |
| `Empty state` | — | says why it is empty and the one action that fills it |
| `Skeleton` | — | image/placeholder |
| `Pagination` | — | |
| `Card` | `Kind=Project|Article|Vacancy|Service` × `Layout=Row|Stack` | ratio from `Media` |
| `Media` | `Ratio=3:2|4:5|16:9|1:1` × `State=Image|Fallback` | image slot `image/media`; fallback for missing media |
| `Logo/Slot` | — | fixed size inside the component; the wordmark uses `Body/Strong` (`Small/Strong` for long names), never Statement |
| `Stat` | — | |
| `Footer` | `Layout=Row|Stack` | fg/inverse, fg/inverse-muted |

Rules:
- Build every component with `component()` (resize first, then hug; `fixedMain` for fixed-width
  bars, `hugCounter` to hug the cross axis). Link text with `textProp()`.
- **Plan variants up front** for anything that differs between breakpoints (`Layout=Row|Stack`) or
  sizes (`Size=…`, `Ratio=…`): overriding `layoutMode` on an instance does not persist, and binding a
  height variable on an instance sublayer does not resize it.
- After `combineAsVariants`, TEXT properties are re-keyed (`Title#4592:0`) and the property default
  comes from the first variant: read the keys back from the set, and set each variant's own label text
  again on the main components so the Components board reads right (instances set labels anyway).
- **The run is not done until every state token is bound in at least one core component** (the token
  check's `unused` list shows which are not).

## The manifest

After step 5, run `manifest.figma.js` (fill its `BOARD_IDS` and `DECISIONS`) and write the returned
`manifest` to `.figma-taste/design-system.json`. It holds the `fileKey`, board ids, each collection
(id, modes, variable names), text/effect/grid style names and ids, each component (id, variant axes,
**text property keys read back after `combineAsVariants`**), and the decisions (fonts, palette per
mode, radius, chosen option, Mobile grid confirmed, Tablet, content mode). Update it at the end of every
run.

In step 1 of a later run: if the manifest exists or the file already holds `<Brand> ·` collections,
verify the ids with one read-only `manifest.figma.js`, load it, skip foundations, add only what is
missing inside the same collections and naming, and never create a second set.

## After the option pick

`collapse-options.figma.js` (dry run first):
1. The chosen option's values move into the default mode, renamed `Light` (Figma's default mode is the
   first one, so the values are swapped when the chosen option is not first). Later pages then need no
   explicit theme mode.
2. The other option keeps its values in `<name> (archived)`; its frames are re-pointed to that mode.
   Delete the archived mode only after asking.
3. Explicit theme modes are cleared on the chosen frames.
4. Font family is constant now: written into the text styles; `font/display` and `font/text` deleted.
5. `shape/image-radius` becomes the system constant `radius/image` (re-bind its nodes, then delete it).
6. Record it in the manifest.

## Foundations board

One board per option while options exist, each with an explicit theme mode. Blocks: colour roles
(swatches bound to each role, labelled with the token name), a **States** block (state colours on their
surfaces; stroke tokens as outlined field samples named `field/…`, so the hairline rule stays quiet),
type specimen (every style with its size per mode), spacing scale, and the grid strip: a 1920-wide frame
with the grid visible, labelled "12 columns · margin 60 · gutter 30 · column 122.5". When a frame gets
`layoutMode = 'VERTICAL'` after a `resize()`, set `primaryAxisSizingMode = 'FIXED'` and resize again, or
the strip collapses. Next to it, a small `Dummy content` board lists what the client must supply.

## File layout

- **Own file:** pages `Foundations`, `Components`, `Pages` (`Page/Desktop`, `Page/Mobile` side by side).
- **Shared agency file:** no new pages; sections `<Brand> · Foundations`, `<Brand> · Components`, then
  the page frames, on one page.
- **Generic starter template** (e.g. `Essential`, `Color Essential`, Tailwind ramps, `Brand Color` =
  white): ask once whether to build `<Brand> ·` collections next to it (default) or to fill the
  template. Put Foundations and Components as sections on the file's existing style-guide page and the
  page frames on its existing UI page; reuse an empty frame the user linked as the first wrapper.
- **Several design options:** `Option A/Desktop`, `Option B/Desktop`, … side by side; the chosen option
  later gets its Mobile frame next to its Desktop frame.
