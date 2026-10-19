---
name: figma-taste
description: Art-directed, anti-slop design built directly on the Figma canvas through the Figma MCP (use_figma). A site-wide design system built at the first page (five variable collections, 31 colour roles, the full H1–H6 type scale, states, core components) and recorded in a manifest so later pages extend it; flex auto layout that follows a 1920 / 12-column layout guide with span tokens (GRID only for 2D layouts); non-repeating compositions dealt by a script, also across design options; real Unsplash photographs; live reference sites adopted as a system; realistic dummy copy marked as dummy; and an in-canvas audit, token check and screenshot critique. Use whenever the user asks to design, mock up, redesign or polish a landing page, website, company profile, portfolio, product page or app screen in Figma, or says a Figma design looks generic, templated, messy, "AI-made" or uses too many frames. To review or lightly fix an existing design, use figma-design-review.
---

# figma-taste

A design generated into Figma by a model usually has two kinds of slop at once.

**Visual slop:** the average landing page. Centred headline, pill badge above it, three icon cards,
soft gradient, a testimonial, a pricing table with the middle tier highlighted.

**Structural slop:** the file is a mess underneath. Frames inside frames with absolute x/y, hex
colours typed into every fill, text with no styles, `Frame 482` and `Rectangle 17`, nothing
responsive, nothing reusable, nothing on the grid, a token set that covers one page, images left as
grey boxes.

This skill fixes both. A designer opening the file should find something they would have been proud
to build by hand: every container is auto layout, every colour, space and radius is a variable that
earns its place, every text uses a style from a complete scale, repeated things are components with
their states, columns land on the layout guide, the mobile frame is the same tree with a different
variable mode, and the next page can be built from the same system. And the page itself looks decided
rather than averaged.

`<skill>` below means this skill's folder. Scripts write working files to `.figma-taste/` in the
current directory. Node 18+ is needed for the Node scripts; they install nothing. `ref-extract.mjs`
and `unsplash.mjs` need outbound HTTPS. Behind a corporate or sandbox proxy, run them with
`NODE_USE_ENV_PROXY=1` (Node 22.21+) so Node's `fetch` honours `HTTPS_PROXY`. If a host is refused,
say so plainly and use the fallbacks each step describes; never fake the result.

## House defaults

These are the user's standard. Use them unless the brief or PRD says otherwise; a conflict goes into the
step 1 question.

| | Desktop | Mobile | Tablet (only when the PRD asks) |
| --- | --- | --- | --- |
| Page frame width | **1920** | 390 | 768 |
| Layout grid | **12 columns, stretch** | 4 columns, stretch | 8 columns, stretch |
| Margin / gutter | **60 / 30** | 20 / 16 | 40 / 24 |
| Grid colour | `#FF0000` at 10% | same | same |

- **Desktop and Mobile by default.** Tablet only when the PRD or the user asks for it.
- The Desktop row is the user's own. The Mobile row is a proposal until the user confirms it; a PRD
  that asks for 360px is a conflict to raise. The Tablet row is a proposal too.
- One column at 1920 is (1800 − 11·30) / 12 = **122.5**. A 7-column span is 1037.5, a 5-column span
  732.5, 8 columns 1190.
- **Content is dummy-filled by default** (step 4) and every dummy layer is marked.
- **One design option by default**; more when the user or PRD asks (step 1).

## Required companions

Before the first `use_figma` call, load the Figma MCP's own skills with `get_figma_skill`:
`skill://figma/figma-use/SKILL.md` (Plugin API rules) and
`skill://figma/figma-generate-design/SKILL.md` (screen assembly), plus
`skill://figma/figma-generate-library/SKILL.md` when building the foundations and components.
Pass `skillNames` as `resource:figma-use,resource:figma-generate-design,figma-taste` on every
mutating call. Their API rules win over anything here; this skill adds art direction, structure
discipline and the quality gate on top.

Hard API facts that shape this skill (from figma-use and from test runs):
- `use_figma` runs Plugin API JavaScript; no state survives between calls. Pass IDs as literals.
- `figma.createImageAsync` is **not available**. Photographs go in through the `upload_assets`
  tool (step 7). Plan image slots as named nodes first, fill them afterwards.
- `upload_assets` only accepts plain node ids (`12:34`), not instance sublayers (`I45:6;7:8`):
  use intake mode for slots inside components (step 7).
- `resize()` resets sizing modes to FIXED: resize first, then hug (`component()` does this).
- Overriding `layoutMode` on an instance does not persist, and binding a height variable on an
  instance sublayer does not resize it: plan `Layout=Row|Stack` and `Ratio`/`Size` variants instead.
- Text nodes cannot take `maxWidth`; bind `width` instead (`txt(..., { maxW })`, `spanTo()`).
- New GRID frames get FLEX row tracks; a hugging grid then overlaps its rows. `grid()` sets the row
  tracks to hug.
- Layout grids and effects bind to variables like paints: `setBoundVariableForLayoutGrid` /
  `setBoundVariableForEffect` return a new object that must be reassigned.
- An OPACITY variable holds 0–100 (`50` reads back as `node.opacity === 0.5`).
- Text styles can bind `fontSize` and `fontFamily` to variables; binding `lineHeight`/`letterSpacing`
  turns them into pixels, so keep those as percent values.
- Code per call is capped at 50,000 characters. Paste `<skill>/scripts/helpers.min.figma.js` (≈8k:
  tokens, stacks, `row()`, text, instances) at the top of ordinary build calls, and the full
  `helpers.figma.js` (≈21k) only when the call needs components, GRID, scrims, `toColumn()` or the
  layout grid. The audit has a min version too (`audit.min.figma.js`, ≈14k, same checks), so full
  helpers and the audit fit one call. `foundations.figma.js` (≈24k) runs on its own.

## Fallback: DesignAgent only, or no `use_figma`

When the user asks for DesignAgent only, or `use_figma` is unavailable, take the reduced route and
say up front what is lost: **no variables or modes, no bound text styles, no components, no audit
gate.** Keep steps 1–4 (brief, references, deal, idea and copy) and the step 9 critique. Generate the
page as self-contained HTML that follows the house rules and compositions, render it into Figma with
`html_to_design`, and verify with DesignAgent `take_screenshot`. Use its `set_grid` tool to apply
the house layout grid.

## The run

Do these in order. Steps 1–5 happen before the page is drawn and decide whether the result is good.

### 1. Brief, PRD, file, system, and what is real

**Read everything first.** The brief, the **whole PRD** (look for its design module, often "UI
Design", "Desain Responsif", a design-system or UI-states requirement) and the **sitemap** (its page
inventory and its states column). Not only the page being designed.

**Check for an existing system.** If `.figma-taste/design-system.json` exists, or the file already holds
`<Brand> ·` collections: run `manifest.figma.js` read-only to verify the ids, load the manifest, skip
foundation building in step 5 (add only what is missing, inside the same collections and naming), and
never create a second set.

**Then ask once, in one message,** everything that is missing or in conflict:
- the Figma file URL, if none was given (bridges such as DesignAgent can be attached to a file without
  exposing its `fileKey`, and `use_figma` needs it);
- how many design options (default 1; a PRD may ask for two concepts);
- the Mobile grid (390 · 4 · 20 / 16) for confirmation;
- **every conflict between the PRD and the house defaults**: Tablet asked for, a Mobile width of 360,
  a number of concepts, a framework or grid the PRD fixes;
- where the tokens go when the file holds a system that is not this client's (below).

Do not ask again later; if the user is not there, take the defaults, say so at the top of the work,
and flag every conflict in the report.

**Read the file.** Pages, existing variable collections, text styles, components, libraries
(`get_libraries`, `search_design_system`). Three cases:
- **This client's system:** use it; extend only what is missing.
- **Another brand's system** (a shared agency file): build this client's own collections and styles
  with a brand prefix (`<Brand> · theme`, `<Brand>/Heading/H1`), set `COLLECTION_PREFIX` /
  `STYLE_PREFIX` in the helpers, never edit the other brand's tokens. In a shared file, use sections
  on one page (`<Brand> · Foundations`, `<Brand> · Components`, then the page frames).
- **A generic starter template** (`Essential`, `Color Essential`, Tailwind ramps, `Brand Color` =
  white, Inter/Poppins): do not fill it in silently; it is part of the one question whether to build
  `<Brand> ·` collections next to it (default) or fill the template. Put Foundations and Components as
  sections on its existing style-guide page and the page frames on its existing UI page; reuse an
  empty frame the user linked as the first wrapper.

**Write two inventories in your notes.**
- **Subject inventory:** 8–12 things that belong to this client and no competitor (its name and what
  it means, its place, its material, its numbers, its constraint, its rituals, the printed things of
  its world). The idea in step 4 and the Unsplash queries in step 7 come from it.
- **System inventory**, from the sitemap: every page type; every UI state (loading, empty, filtered,
  error, success, validation error, upload error, 404…); every repeated unit (cards for project,
  article, vacancy, service; filter; pagination; breadcrumb; field; file upload; alert; empty state;
  skeleton; gallery; mobile menu; dropdown). Step 5 builds the system for all of it.

**Write the argument:** one line per section of this page, a claim and its proof. Sections without a
claim are deleted. When a PRD or sitemap mandates sections or a treatment (a full-bleed banner, a
client logo wall), note it: those become `--require` pins in step 3. If the brief is vague, decide and
state your reading in one line instead of asking.

### 2. Study the references

When the user gives live reference websites, follow `references/references-adoption.md`:

```bash
node <skill>/scripts/ref-extract.mjs https://site-one.com https://site-two.com
```

extracts each site's palette, type families and scale (with `vw`/`clamp()` sizes converted to px at
1440 and 390), radius, spacing and section outline into `.figma-taste/refs/`. A site that returns 0
stylesheets is an SPA: the script reads its inline `<style>` and `style=""` instead and tells you how
much it found; load the `built-in-browser` or `chrome-browser` skill and take screenshots. Write a
**reference sheet** per site: what to adopt (type scale ratio, density, rhythm, image treatment, how
sections change) and what not to take (logo, copy, photographs, exact brand colours unless the user
says so). Scale the reference's proportions to the 1920 canvas. You adopt systems, never content.

### 3. Deal the composition

A model asked to choose a layout chooses the category default. The script chooses instead:

```bash
node <skill>/scripts/deal.mjs --brief "<one line>" --sections stats,services,projects,clients,about,contact --options 3
node <skill>/scripts/deal.mjs --brief "<one line>" --sections <same> --direction <id> \
  --have photography,items,logos,address,real-figure --items projects:3 --require hero:hero-full-bleed [--seed <n>]
```

- `--options N` prints N art directions; pick the one that carries something only this client has
  (write one line on why).
- `--sections` lists the page's sections; **hero and footer are dealt automatically** (listing them is
  ignored, with a note).
- `--have` lists what really exists and **enforces each composition's needs**: `photo`, `photos`
  (alias `photography`, `unsplash`: include it whenever Unsplash is reachable), `items`, `logos`
  (marked dummy wordmarks count), `address`, `real-figure`, `real-process`, `product-ui`.
- `--items role:count` enforces minimums (catalogue 6, index list 4, spec table 5, questions 4,
  gallery wall 4 photos, filmstrip 5). Three featured projects never get a catalogue.
- `--require hero:<id>` / `--require <role>:<id>` pin what the brief or PRD mandates; pinned slots are
  printed as "Pinned (brief)", never as redraws.
- The deal looks ahead: a composition that is the only fit for a later section is kept for it.
- Each deal is saved in `.figma-taste/` (`deal.json`, and `deal-<option>.json` with `--option`), so the
  report and a later Mobile session can read it back (`--show A`).

Each composition id maps to a recipe in `references/compositions.md`. **Adopt the deal.** Redraw one
slot (`--redraw section:<role>`) only for a reason you can state, and record it. When references exist,
the reference sheet overrides the direction's type and palette, and the deal supplies composition only
(`--keep type,palette`).

**More than one design option:**
- Deal them together: `--options-deal 2 --directions <a>,<b>` (or pick from `--options`). Each option
  gets a **different direction and a different hero**, and for every role a **different composition**
  wherever the content allows; the script prints a table of what differs and says when the content
  allows only one composition (pins are exempt). `--avoid deal-A.json` does the same for an option
  dealt later.
- Write one line per option on what makes it different (idea, type, palette, hero, compositions), so
  the user compares ideas, not pixels.
- Options share the copy deck, the content, the image pool, the `layout` tokens, **one set of text
  styles and one set of components**. They differ through the `theme` collection's modes
  (`Option A` / `Option B`): colour roles, `font/display` / `font/text` (STRING variables bound to the
  styles' `fontFamily`) and `shape/image-radius`. Setting a wrapper's theme mode switches colours and
  typefaces; shared components follow. List every mode's fonts in the helpers' `FONTS`.
- Frames are named `Option A/Desktop`, `Option B/Desktop`, … side by side.
- **Build every option at Desktop only, then ask the user to pick.** Build Mobile (and Tablet if asked)
  only for the chosen option, then collapse the modes (step 10).
- An option asked for later is a new option with its own direction and theme mode, never a duplicate
  of existing frames.

### 4. The idea and the words

Write in your notes: *On this page, **[something from the inventory]** becomes **[the device the
direction calls for]**.* Put the nearest competitor in the sentence; if it still works, the idea
belongs to the category and is not good enough.

Write the full copy deck in plain text before building: headlines two lines or fewer at every width
(about 32 characters is safe), one supporting sentence, one primary action, every section with its full
content. **No section repeats another:** when the page has a big-figure section, the hero does not use
that figure (a hero "since 2009" above a big "2009" says the same thing twice).

**Content mode: dummy-filled (default).** Every slot gets realistic dummy content so the design reads as
a finished page; empty brackets like `[Alamat kantor]` or `[n] m²` make the preview unreadable.
- Write it in the page language, at the length and tone the final copy will have. Real sentences,
  never lorem ipsum.
- Keep it consistent: the same numbers everywhere; cities, years and categories that fit the brief.
- Proof may be dummy, within limits: client logos are **invented generic wordmarks**, **never real
  company names or logos**; testimonials use invented names with role and company type only, never
  real people; stats, addresses, phones and emails use plausible formats (the client's own domain when
  known).
- Real facts from the brief stay real and unmarked.
- **Mark every dummy layer** with `txt(..., { dummy: true })` or `dummy(node, 'what')`: a Figma annotation
  "Dummy" plus a ` · dummy` name suffix. Keep a `Dummy content` list grouped by section for the report
  and for a small board next to the pages.

**Content mode: real-only** (opt-in, when the user supplies final copy or asks for honest placeholders).

### 5. The site design system (built once, for every page)

Follow `references/design-system.md`. Build the **whole system first, then the page**: tokens for every
state the PRD and sitemap list, the full type scale, and the core components every later page needs,
even when this page does not show them.

1. **Tokens and styles in one call:** edit `CONFIG` in `<skill>/scripts/foundations.figma.js`
   (brand, ramp base colours, theme modes with ground/ink/accent/fonts/image radius, style weights,
   layout modes, spans) and run it. It creates or extends five collections:
   - `<Brand> · primitives`: full ramps (steps 50–950, OKLCH, the base colour kept exactly), state
     hues, alpha colours; hidden, no scopes.
   - `<Brand> · theme`: the 31 colour roles (surfaces, text, accent with hover/pressed, field
     outlines, states with surfaces, focus ring, overlay, scrim, on-image), font family variables only
     while options differ, `shape/image-radius` only while it differs.
   - `<Brand> · layout`: margin, gutter, columns, section padding, stack scale, measure, the 11 type
     sizes and input height per breakpoint.
   - `<Brand> · system`: radius, borders, opacity, icon and tap sizes, font weights, breakpoints,
     container, motion.
   - `<Brand> · figma helpers`: the `span/N` the layouts use, no code syntax.

   Plus the 18 text styles (Display, H1–H6, Statement, Quote, Body Large/Default/Strong/Link,
   Label, Small, Caption; `fontSize` bound, line height and tracking as percent), the overlay effect
   style and the grid styles. It is safe to re-run, and it **returns contrast checks**: fix every entry
   in `contrastFails` (change a role's step or a base hex) before going on.
2. **Token check:** run `<skill>/scripts/tokens.figma.js`. It reports unused tokens (allow-list the ones
   reserved for components not built yet, with a reason), tokens identical in every mode, raw
   duplicates, helpers with code syntax, semantic tokens without it, `ALL_SCOPES`, bound line
   height/tracking, and ramp gaps.
3. **Core components** with `component()` and `textProp()`, on the Components board, every state shown
   as an instance: `Button` (Kind × State), `Link`, `Nav/Bar`, `Nav/Menu`, `Dropdown`, `Breadcrumb`,
   `Field` (Type × State), `Alert`, `Empty state`, `Skeleton`, `Pagination`, `Card` (Kind × Layout),
   `Media` (Ratio × State), `Logo/Slot`, `Stat`, `Footer`. Plan `Layout=Row|Stack` and `Ratio` variants
   up front. After `combineAsVariants`, read the text property keys back from the set and reset each
   variant's label text. **Every state token must be bound in at least one component** before step 6
   (re-run the token check: its `unused` list shows which are not).
4. **Foundations board** (one per option, each with an explicit theme mode): colour roles, a States
   block, the type specimen, the spacing scale and the 1920 grid strip. Small `Dummy content` board
   next to it.
5. **Manifest:** run `<skill>/scripts/manifest.figma.js` (fill `BOARD_IDS` and `DECISIONS`) and write the
   returned `manifest` to `.figma-taste/design-system.json`.

### 6. Build the page: flex auto layout on the layout guide

Follow `references/autolayout.md`. The non-negotiables:

- The page frame is an auto-layout VERTICAL wrapper **1920** wide (Desktop mode) with `columnGrid()`.
  Every section is an auto-layout child with `layoutSizingHorizontal = FILL`, `padX = layout/margin`.
- **Columns are flex rows with span widths.** `row(parent, name, [7, 5])` makes a HORIZONTAL row, gap
  `layout/gutter`, children FIXED width bound to `span/N`; spans that add up to less than 12 use
  `SPACE_BETWEEN`, so the last block ends on column 12. A block that only stops short of full width is
  the node itself with `spanTo(node, 8)`, no wrapper. **GRID only for 2D layouts:** items spanning rows,
  gallery walls, magazine spreads, three or more blocks with empty columns between them. Never split
  with `layoutGrow` 7:5 (5px off the guide).
- `figma.createFrame()` with absolute children only for a deliberate overlap, named `free/…`.
- Nothing is wrapped in a frame that does nothing.
- Every fill, stroke, gap, padding and radius is bound to a variable; every text node uses a text style.
  No raw hex, no raw numbers, except 0.
- Repeated units are instances of the core components; media proportions come from `Media` ratio
  variants, not from page-specific height tokens.
- Names are semantic and slash-structured: `Section/Work`, `Work/List`, `Work/Row`, `image/hero`.
- Image slots are rectangles or frames named `image/<slot>` with the `image/placeholder` fill.
- Text over a photograph uses `fg/on-image` and a `scrim()` (defaults to `scrim/base`, near-black in
  every theme, at `opacity/scrim`); check the lede's contrast in the screenshot, not only the headline's.
- Build one or two sections per call, starting from the helpers prelude, returning every created ID.
  Set `placeholder = true` on unbuilt sections; clear it when done.
- After the Desktop page passes (and, with options, after the pick), duplicate it for **Mobile (390)**
  (and Tablet when asked), set the explicit `layout` mode on the wrapper, and fix only what needs a
  different structure: a flex row becomes a column with `toColumn(r.node, gap)` (frames only); an
  instance swaps to its `Layout=Stack` variant. Never hand-edit numbers on a copy: a wrong value means
  the token's mode value is wrong. Check each wrapper's height against the sum of its sections.

### 7. Imagery from Unsplash

Follow `references/imagery-unsplash.md`. Search from the inventory, not the category:

```bash
node <skill>/scripts/unsplash.mjs search "<query from the inventory>" --orientation landscape
node <skill>/scripts/unsplash.mjs preview <page url|id> … --out .figma-taste/previews
```

Without `UNSPLASH_ACCESS_KEY`, `search` prints the fallback that works (WebFetch
`https://unsplash.com/s/photos/<query>`); `preview` works without a key and saves small JPEGs to look
at. Choose with intent: one dominant picture beats six small ones; one family and one **grade** (shared
image filters) across the page. Then call the Figma `upload_assets` tool with the slot IDs, write the
returned URLs and chosen photos into a plan file, and place them:

```bash
node <skill>/scripts/unsplash.mjs place --plan .figma-taste/plan.json
```

It downloads each photo at the slot's size, POSTs it to its upload URL, and records credits with an
honest tracking status. **Slots inside component instances:** upload to plain rectangles in an
`_intake` frame and run `place --intake --intake-frame <id>`; it writes a `use_figma` snippet that copies
each `imageHash` to its target(s). A plan item's `target` may be an array, so one upload fills the same
slot in several options, and `filters` applies the grade. **Floor: at least four real photographs on a
marketing page, usually six to ten.** If the shell has no network, say so, keep the named slots, and
give the user the plan to run locally.

### 8. Gate

- **Audit:** paste `<skill>/scripts/audit.min.figma.js` (or the full `audit.figma.js`) into a
  `use_figma` call with the wrappers' IDs in `ROOT_IDS` (Desktop and Mobile in one call;
  `SUMMARY = true` while iterating). It measures structure (loose frames, absolute children, useless
  wrappers, unbound fills/spacing/radius, text without styles, default names), the layout guide (left
  and right edges off the column lines; hug-width children on the left edge only), the house rules
  (eyebrows, index numbers, monospace, gradients, glass, shadows at rest, hairlines, emoji, headlines
  over two lines for Display/Heading styles, type families and sizes per page) and composition
  (neighbouring sections with the same layout, identical card rows, empty image slots, the picture
  floor). It counts dummy layers and reports wrapper height against the sum of its sections.
- **Token check:** run `tokens.figma.js` again with the wrappers and boards in `SCAN_IDS`.

Fix every audit `FAIL` and every token issue; each audit `WARN` is wrong unless you can defend it in one
sentence. Re-run until clean.

### 9. Look

Passing the audit means nothing banned was measured, not that the page is good. Take one screenshot of
each wrapper with `get_screenshot` (`maxDimension` 2400 for the 1920 Desktop page, 1600 for Mobile);
DesignAgent `take_screenshot` is fine for quick section checks. **Required short critique**, answered
in writing every round:

1. Is the first screen readable in five seconds (what it is, what to do)?
2. Is the lede legible on the photograph, not only the headline?
3. Does any headline run past two lines at any width?
4. Do neighbouring sections share a composition?
5. Is any image slot empty or any dummy layer unmarked?
6. Does the Mobile wrapper's height make sense against its sections?

The full fourteen-pass scored critique in `references/critique.md` is optional; use it for the final
round of an important page. Fix the top three problems with targeted calls, screenshot again. Three
rounds at most.

### 10. Report, and after the pick

Tell the user briefly: the direction and seed per option and any redraws with reasons; pinned slots;
what differs between options; the idea sentence; what was adopted from each reference; the
design-system summary (collections and modes, roles, styles, components with states); the audit and
token-check results and the critique, and what still falls short; every photograph with photographer,
link and tracking status (`unsplash.mjs credits`); the **Dummy content** list; PRD conflicts and how
they were settled (Tablet, Mobile width, options); whether the Mobile grid was confirmed. With several
options, end by asking which one to take further.

**After the user picks an option:** run `<skill>/scripts/collapse-options.figma.js` (dry run first). The
chosen values become the default `Light` mode (later pages need no explicit theme mode), the other
option is archived in its own mode (deleted only after asking), the font variables become constants
in the text styles, `shape/image-radius` becomes `radius/image`. Then build Mobile for the chosen option
and update the manifest. **Update the manifest at the end of every run.** Do not claim a check you did
not run.

## House rules

Measured by the audit and the token check. Full reasoning in `references/house-rules.md`.

| Rule | Instead |
| --- | --- |
| Auto layout for every container with related children. | Loose frames only for deliberate overlap, named `free/…`. |
| Columns land on the layout guide (1920 · 12 · 60 · 30). | Flex rows with `span/<n>` widths; GRID only for 2D layouts; never 7:5 grow weights. |
| No useless wrappers: one-child frames with no fill, padding, clip or role. | Put the child in its parent; a width limit is `span/N` on the child. |
| Every colour, spacing and radius bound to a variable; every text uses a style. | Add the token to the system first, then use it. |
| A variable only when it changes by mode, is a shared decision, or is needed in code. | Values that are none of these live in the style or the component. |
| Semantic layer names, no `Frame 12`. | `Section/Work`, `Work/Row`, `image/hero`. |
| Headlines (Display, Heading styles) two lines or fewer at every width. | Cut words, then widen, size last. Statement and Quote are paragraphs. |
| A clear title on the first screen; a heading on every section. | Name, what it is, what to do. |
| Neighbouring sections never share a composition; no composition twice. | The dealt composition. |
| No eyebrow labels or pill badges above headings. | Put the fact in the heading or sentence. |
| No 01/02/03 index numbering, no "Step 1". | Order by position, size, words. |
| No monospace outside real code. | The text face, tabular figures. |
| No gradients (a neutral scrim under text on a photo is the exception). | Flat fields, real photographs. |
| No shadows on things at rest, no glows, no background blur glass. | A tone step between surfaces; Elevation/Overlay only on menus and dialogs. |
| No hairline dividers or 1px outlined boxes (form fields excepted). | Space, a tone step, scale. |
| No icon-topped feature cards, no rows of identical cards (a logo wall is exempt). | The dealt composition. |
| No tiny uppercase letter-spaced labels. | Sentence case at readable size. |
| No styled accent word in a headline. | One face, one colour. |
| Two typefaces at most; five or six type sizes per page (the system holds the full scale). | The type scale variables. |
| At least four real photographs on a marketing page; no grey boxes left. | Unsplash, placed through upload_assets. |
| No invented proof **presented as real**. | Dummy proof only when marked, and never with real company or person names. |

Removing ornament leaves space. Fill it with scale (the main thing larger), with the full content,
with a photograph chosen for this subject, or with a field of flat colour, never with another
ornament. One deliberate empty rest per page at most.

## Laws of the craft (short form)

- **Type:** two or three sizes do the visible work, one very large, one small. Display tracking
  −2% to −5%, leading 90–105%. Body 18–20px on the 1920 canvas, leading 145–160%, 45–75 characters
  per line. Left-aligned by default; centre one moment at most.
- **Space:** the outer margins are the grid's margins (`layout/margin`), every column gap is the
  gutter. Gap between sections clearly larger than any gap inside one. Asymmetry inside the grid,
  never in the frame: an off-centre block is answered by something on the far side.
- **Colour:** one ground, one ink, one accent. Running text in full ink. Surfaces separated by a tone
  step (canvas, surface, surface-raised). A section may change the whole field colour.
- **Imagery:** one dominant image beats six small ones; same crop family, ratio variants and grade;
  square corners unless the direction says otherwise; nothing lies on top of a headline.
- **Components:** buttons flat, one fill, square or fully round, decided once, with every state.
  Navigation: wordmark, three to five links, one action, unless the sitemap mandates more; then the
  action button covers Contact and the rest stay plain links. The footer is a designed close; the name
  may return large.

## Special cases

- **Existing design system or library:** if it is this client's, reuse it (`search_design_system`,
  import by key), map its tokens onto the roles, add only missing tokens inside its own collections
  and naming. If it is another brand's or a generic template, see step 1.
- **A second page in a later session:** step 1 finds the manifest; step 5 only adds the page-specific
  units this page needs; no duplicate collection is created.
- **Redesign of an existing Figma page:** audit it first and screenshot it; report findings. Build the
  new version beside it, never destructively; compare before/after audits in the report.
- **App screens (dashboard, settings, inbox):** compositions are replaced by the screen's job: name the
  one decision the user makes there and build the hierarchy around it. Quiet borders on tables and
  fields are allowed; invented metrics presented as real, rainbow charts and filler activity feeds are
  not. Dummy rows follow step 4.
- **Tablet:** when the PRD or user asks: `LAYOUT_MODES` includes `Tablet` in the foundations CONFIG
  (768 · 8 columns), plus a `Page/Tablet` wrapper.
- **No network for Unsplash:** see step 7.
- **Fonts:** verify every family and style with `figma.listAvailableFontsAsync()` (the foundations
  script does, and reports missing ones). Never silently fall back to Inter; if a reference font is
  unavailable, choose the closest available family and say so.

## Files

| File | Read it when |
| --- | --- |
| `references/house-rules.md` | Before building; the why behind each rule and the allowed exceptions. |
| `references/autolayout.md` | Step 6. Flex rows on the layout guide, GRID for 2D, overlap, Mobile/Tablet. |
| `references/design-system.md` | Step 5. What earns a variable; five collections; 31 roles; full type scale; core components; manifest; after the pick. |
| `references/compositions.md` | Steps 3 and 6. Every hero and section composition in column spans. |
| `references/references-adoption.md` | Step 2. How to study live sites and what may be adopted. |
| `references/imagery-unsplash.md` | Step 7. Search, preview, choose, grade, upload, intake, credits. |
| `references/critique.md` | Step 9. The short form and the full scored critique. |
| `scripts/foundations.figma.js` | Step 5. Builds or extends the whole token system and styles in one call; returns contrast checks. |
| `scripts/tokens.figma.js` | Steps 5 and 8. Token-hygiene check. |
| `scripts/manifest.figma.js` | Steps 1, 5, 10. Reads the system into `.figma-taste/design-system.json`. |
| `scripts/collapse-options.figma.js` | After the option pick. Chosen option → `Light`; dry run by default. |
| `scripts/deal.mjs` | Step 3. Directions and compositions; needs, item counts, pins, lookahead, several options. |
| `scripts/ref-extract.mjs` | Step 2. Tokens and outline from live reference sites. |
| `scripts/unsplash.mjs` | Step 7. Search, preview, place (direct or intake, multi-target, grade), credits. |
| `scripts/helpers.figma.js` | Full prelude: tokens, stacks, `row()`, text, images, scrim, components, `toColumn()`, GRID, spans, layout grid, dummy marking, fonts. |
| `scripts/helpers.min.figma.js` · `scripts/audit.min.figma.js` | Trimmed preludes, generated by `build-min.mjs`; never edit by hand. |
| `scripts/audit.figma.js` | Step 8. The gate, run inside Figma, for one or several wrappers. |
| `scripts/selftest.figma.js` | One-call check of the helpers and audit in a scratch frame of any file. |
| `scripts/test/*.test.mjs` | Node regression tests (mock Figma): audit vs audit.min, token check, foundations + manifest + collapse. Run after changing a script. |
