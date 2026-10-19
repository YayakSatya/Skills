# figma-taste: revision notes (run 2)

Source: the second full run of the skill on 2026-10-19. The brief was the Arunika homepage from `arunika-company-profile_prd.md`, with two design options at Desktop. It ran in Figma file "New Project (Copy)" (file key not published). The references were exoape.com and studiod.nu, and the run used DesignAgent for screenshots.

Every item below happened in that run. The notes from run 1 (`figma-taste-improvement-notes.md`) are already in the skill; this file covers only what is new.

Paths are relative to `.claude/skills/figma-taste/`. Patch one file at a time. Keep public helper names; build calls in other projects paste them.

Priority: **P1** breaks the build or the result, **P2** costs time or quality, **P3** polish.

## Rule for this revision: no downgrade

The skill is in beta. This revision fixes what broke in run 2 and raises what the skill can do. It must not lower quality or remove a capability.

- Every check, rule and output that run 2 passed must still pass after the patch: audit PASS, on-grid edges, dummy marking, ≥4 photographs, the critique.
- A default, token or helper may be replaced only when the same result is still produced in a better place, and the item's **Verify** step proves it. Sections 1 and 15 say exactly what replaces what.
- New behaviour is added next to the old. Public helper names stay. `grid()` and `cell()` stay for 2D layouts; `row()` is added.
- If a patch cannot meet this rule, leave the old behaviour and write down why.

## Summary: what run 2 found

**Fix: bugs that break the build or the result**
- `grid()` row tracks overlap (2.1)
- `scrim()` lightens photos in a dark theme (2.3)
- `deal.mjs` deals `hero` as a second section (3.1)
- `unsplash.mjs` misreads ids that contain `-` (8.1)
- the audit fails Statement text as a headline (4.1) and warns on hug-width rows (4.3)

**Improve: capabilities the beta does not have yet**
- Layout that follows the layout guide with flex and `span/N`, plus a `row()` helper; GRID kept for 2D layouts (1)
- Design options that share one set of text styles and components through font variables (5.1)
- A design system for the whole site from the first page:
  - the full type scale (13)
  - state, focus, form, interaction and overlay tokens (12)
  - core components with states (14)
- A design-system manifest, so the next page reuses the system instead of rebuilding it (14)
- Token hygiene rules and a token check in the audit (15)
- One target variable architecture with five collections, a token list, a lifecycle and a beta-vs-next table (16)
- Step 1 that reads the whole PRD and sitemap, handles template files and flags PRD vs house-default conflicts (6, 7)
- Options that differ in composition, not only in hero and colour (3.2)
- A keyless photo preview, one photo to several slots, and a shared photo grade (8.2–8.4)
- A smaller audit for pasting, and fonts loaded per mode (2.7, 2.8)

**Keep: what already works (see the end of this file)**

---

## 1. Layout: flex by default, GRID only for 2D layouts (P1, user feedback)

The user's feedback after reviewing the file: *"membuat auto layout dengan grid bukannya berlebihan? cukup flex aja… aku cuma minta mirip layout guide"*. In English: building auto layout with grid is overkill; flex is enough; they only wanted the content to follow the layout guide.

**Symptom:** the skill told every split row to use `layoutMode = 'GRID'`. In the run, 13 of 14 split rows became GRID frames. Only one of them needed it: `Projects/Wall`, where one card spans two rows.

**Cause:**
- `SKILL.md` step 6 says "Split rows use `layoutMode = 'GRID'`".
- `references/autolayout.md` heads that recipe "Preferred: GRID rows".
- Every recipe in `references/compositions.md` is written as "GRID 12".

**Not a downgrade:** the result stays the same: every block still lands on the 12-column guide. GRID stays available, and is used where it adds something (row spans, 2D). The gain is a simpler layer tree, flex behaviour developers expect, and an easy switch to Mobile with `toColumn()`.

**What replaced it in the file, tested and on grid:**

| Case | Container |
| --- | --- |
| Blocks next to each other, last block ends on column 12 | HORIZONTAL, `primaryAxisAlignItems = 'SPACE_BETWEEN'`, each child FIXED width bound to `span/N` |
| Contiguous blocks (7+5, 4+8, 3+3+3+3) | same; `itemSpacing` bound to `layout/gutter` |
| A block that only stops short of full width | the node itself, width bound to `span/N` (no wrapper) |
| Items spanning rows, gallery walls, magazine spreads | GRID |

The check after converting: 28 blocks in 12 rows were measured, and every left and right edge sat on a column line (±1px). Page heights did not change.

**Change:**
- `SKILL.md` step 6: replace the "Content snaps to the layout grid" bullet. The new bullet says: split rows are flex with `span/N` widths, using `SPACE_BETWEEN` when the last block ends on column 12; GRID only when something spans rows or the layout is 2D. Never split with grow weights (keep this part).
- `SKILL.md` house-rules table, row "Columns land on the layout grid": change the "Instead" text to "flex rows with `span/<n>` widths; GRID only for 2D layouts; never 7:5 grow weights."
- `references/autolayout.md`:
  - Decision table row "Columns of a section" becomes HORIZONTAL + `span/N`.
  - Swap the order of the two recipes: "Preferred: span tokens", then "When you need GRID".
  - Update Mobile step 3: a flex row becomes a column with `toColumn()`.
- `references/compositions.md`:
  - Rewrite "How to read a recipe". "GRID 12: A cols 1–7 · B cols 8–12" now means a flex row, A `span/7`, B `span/5`.
  - Mark explicitly which recipes need a real GRID: `s-gallery-wall`, `hero-strip` (only if it uses row spans), and the catalogue when it has row spans.
- `scripts/helpers.figma.js`: add `row(parent, name, spans, o)`. It creates a HORIZONTAL frame, FILL, gap `layout/gutter`, `SPACE_BETWEEN` when `sum(spans) + gaps < 12`, and returns a function that appends a child and binds its width to `span/N`. Keep `grid()`/`cell()` for 2D.
- **Verify:** build Stats (7+5) and Services/Head (6+5, gap column 7) with `row()`. Check edges with the column-line check from section 4.3.

## 2. `scripts/helpers.figma.js`

### 2.1 `grid()` leaves row tracks at `FLEX 1`, so rows overlap (P1, bug)

- **Symptom:** in the hero, the H1, the lede and the buttons were drawn on top of each other. The grid frame was 128px tall while its first child was 204px.
- **Cause:** a new GRID frame gets `gridRowSizes = [{type:'FLEX', value:1}, …]`. When the frame hugs its content, the rows still share space equally instead of growing with it.
- **Change:** after appending the frame in `grid()`:
  ```js
  f.layoutSizingVertical = 'HUG';
  f.gridRowSizes = f.gridRowSizes.map(() => ({ type: 'HUG' }));
  ```
  CSS becomes `repeat(n, fit-content(100%))`, which was tested in the run.
- **Verify:** a 3-row grid with a 104px H1, a paragraph and a button. Frame height should equal the content plus the gaps.

### 2.2 `cell()` cannot align a child vertically (P2)

- The run needed `align end` (s-big-figure, hero-poster-type). The property exists: `child.gridChildVerticalAlign = 'MIN' | 'CENTER' | 'MAX' | 'AUTO'`.
- **Change:** `cell(g, child, row, col, colSpan, rowSpan, valign)` sets `gridChildVerticalAlign` when `valign` is given.

### 2.3 `scrim()` defaults to `bg/inverse`, which is light in a dark direction (P1, design)

- **Symptom:** in Option A (dark ground), `bg/inverse` is bone white. The default scrim would lighten the photo instead of darkening it.
- **Change:**
  - Default `colorVar` to `'scrim/base'`.
  - Add `scrim/base` (FRAME_FILL, SHAPE_FILL, always a near-black primitive in every mode) to the colour table in `references/design-system.md`.
  - Also add `fg/on-image` (TEXT_FILL, always light), for text over photographs.

### 2.4 `component()` cannot make a fixed-width horizontal bar (P2)

- **Symptom:** `Nav/Bar` (HORIZONTAL, 1920 wide, height hug) needs a FIXED main axis and an AUTO counter axis. `component()` always sets main = AUTO, and counter = FIXED only when `width` is set.
- **Change:** add `o.fixedMain` (main axis FIXED). Rename or alias `o.hugWidth` to `o.hugCounter`; the current name is wrong for HORIZONTAL components.

### 2.5 After `combineAsVariants`, the TEXT property default comes from the first variant (P3)

- **Symptom:** `Button` `Kind=Quiet` showed "Konsultasi Proyek" (the Primary label) on the components sheet.
- **Change:** after combining, set the main components' text back, or note in `references/design-system.md` that the property default is shared across variants. Instances set the label anyway.

### 2.6 `inst()` logs a note for every VARIANT prop (P3, noise)

- **Cause:** `inst()` looks up `Kind`, `Layout` and `Size` in `i.componentProperties` under text-property keys, does not find them, and pushes "no property".
- **Change:** skip keys that are VARIANT in the set's `componentPropertyDefinitions`.

### 2.7 Fonts bound by variable: load every mode's font up front (P2)

- When text styles bind `fontFamily`/`fontStyle` to variables (see 5.1), every call that creates text, or sets an explicit mode on a wrapper, must load the fonts of every mode first.
- **Change:** add `const FONTS = [[family, style], …]` at the top of the prelude and load them all. Document it next to `COLLECTION_PREFIX`.

### 2.8 Prelude size per call (P2, efficiency)

- Full helpers (17k) + audit (18k) cannot share one call. The audit had to be pasted twice (≈18k characters each).
- **Change:** generate `audit.min.figma.js` the way `build-min.mjs` makes the helpers min, with comments stripped and messages shortened. Target under 9k.

## 3. `scripts/deal.mjs`

### 3.1 `hero` inside `--sections` gets dealt as a section (P1, bug)

- **Symptom:** `--sections hero,stats,…` printed `1. hero → s-columns-text [pinned by brief]`. The hero is already dealt separately, so the page got two heroes, and the `[pinned]` tag was wrong.
- **Change:** drop `hero` and `footer` from `--sections` with a one-line note ("hero and footer are dealt automatically"). Also fix the "pinned" flag so it is only set when a `--require` actually matched that role.
- **Verify:** `--sections hero,stats --require hero:hero-full-bleed` lists `stats` as section 1.

### 3.2 Two options get the same section compositions (P2)

- **Symptom:** Option A (quiet-luxury, seed 12) and Option B (editorial-grid, seed 22) were both dealt `s-big-figure` for stats, `s-index-list` for services, `s-logo-wall` and `s-close-name`. That is 4 of 6 sections the same, so the options differ mostly in hero, type and colour.
- **Change:** add `--avoid <deal.json>` (or `--options-deal N`). It deals N options in one run and prefers a different composition per role across options, where `needs` allow it. Pinned roles (`--require`) are exempt.

### 3.3 Keep the deal on disk (P3)

- Write each dealt option to `.figma-taste/deal-<option>.json`, so the report and a later Mobile session can read it back.

## 4. `scripts/audit.figma.js`

### 4.1 `headline-lines` fails body-like Statement text (P2)

- **Symptom:** `Consultation/Statement` (Statement style, 40px, 3 lines) and `Hero/Lede` (B) failed as "headline runs 3 lines". Both are paragraphs set large, not headlines.
- **Change:** pick one of these:
  - (a) check only text whose style name starts with `Display` or `Heading`;
  - (b) raise the threshold to `>= 48`;
  - (c) keep `>= 40` and write in `references/design-system.md` that `type/statement` must stay ≤ 36 at Desktop.

  The run used (c) to pass. Recommended: (a).

### 4.2 `useless-wrapper` on a one-child GRID used to limit width (P3)

- **Symptom:** `Clients/Head` was a GRID with one H2 spanning 8 columns. The fix was to bind the text's width to `span/8`.
- **Change:** in the warning message, suggest "bind the child's width to `span/N` instead".

### 4.3 `off-grid` warns about a hug-width button row (P3)

- **Symptom:** `Hero/Actions` (two buttons, HUG) has its right edge at 483, which is not a column end.
- **Change:** do not check the right edge of children whose `layoutSizingHorizontal === 'HUG'`. Check only their left edge.

## 5. Design system and options (`SKILL.md` step 3, `references/design-system.md`)

### 5.1 One text-style set for all options, bound to font variables (P1, better pattern)

- **Current text:** each option gets its own text styles (`A/Heading/H1`, `B/Heading/H1`).
- **Problem:** components must stay shared between options. A component's text holds one style, so per-option styles force per-option components.
- **What worked:**
  - One set of styles, `Arunika/Heading/H1` and so on.
  - `fontSize` bound to `layout` type variables.
  - `fontFamily` and `fontStyle` bound to STRING variables (`font/display`, `font/display-style`, `font/text`, `font/text-style`, `font/text-strong`) in the theme collection, with modes `Option A` / `Option B`.
  - Setting the wrapper's theme mode changes the colours **and** the typefaces. Shared components switch with it.
  - It was tested: Switzer for A, Newsreader + Host Grotesk for B.
- **Change:**
  - Rewrite the text-style part of `SKILL.md` step 3 "More than one design option" and the "Text styles" section of `references/design-system.md` to this pattern.
  - Rename the collection to `theme` (it holds colours, fonts and the image radius), or keep `color` and add a `font/*` group.
  - Note 2.7 (load every mode's font).

### 5.2 Per-option shape token (P3)

- Option B used rounded image corners (24) and A square ones. That was done with a FLOAT `shape/image-radius` (CORNER_RADIUS) in the theme collection.
- **Change:** add this token to the design-system table and say that radius differences between options belong in the theme collection, not in `layout`.

### 5.3 Foundations board for options (P3)

- One board per option, each with an explicit theme mode, worked well.
- **Bug seen:** the grid strip collapsed after `layoutMode = 'VERTICAL'` was set on a frame that already had `resize(1920, 240)`. Set `primaryAxisSizingMode = 'FIXED'` and resize again.

## 6. Step 1: a third kind of existing system (P2)

- **Symptom:** the file held a generic agency starter: `Essential`, `Color Essential`, `Typography`, Tailwind ramps, `Brand Color` = white, Inter/Poppins. It is neither "this client's" nor "another brand's".
- **Change:** add a third case to step 1. *A generic template:* do not fill it in silently. Ask once whether to build `<Brand> ·` collections next to it (default) or to fill the template. In this run the user chose separate collections.
- Also: put Foundations and Components on the file's existing style-guide page (here "↳ Guide Style") as sections, and the page frames on its existing UI page. Reuse an existing empty frame the user linked (here "Home", 2402:3) as the first wrapper.

## 7. Step 1: PRD requirements that conflict with house defaults (P2)

- The PRD asked for two concepts (FR13), desktop + **tablet** + mobile from **360px**. The house defaults are 1 option, no tablet, Mobile 390.
- **Change:** in step 1, read the PRD's design module (often "Desain Responsif" / "UI Design") and put each conflict into the one question. This run asked about options (2) and the Mobile grid (390 · 4 · 20/16). It did not ask about Tablet, and the report had to flag it afterwards.

## 8. `scripts/unsplash.mjs`

### 8.1 Photo ids that contain a hyphen are parsed wrong (P1, bug)

- **Symptom:** `…/photos/empty-hospital-corridor-with-benches-and-doors-Pk-KuizxQv8` resolved to id `KuizxQv8` and returned 404.
- **Cause:** line 60, `slug.slice(slug.lastIndexOf('-') + 1)`. Unsplash ids are 11 characters from `[A-Za-z0-9_-]` and can contain `-`.
- **Change:** `const id = /^[A-Za-z0-9_-]{11}$/.test(slug) ? slug : slug.slice(-11);`
- **Verify:** `unsplash.mjs info https://unsplash.com/photos/empty-hospital-corridor-with-benches-and-doors-Pk-KuizxQv8` resolves to `Pk-KuizxQv8`.

### 8.2 There is no keyless preview command (P2)

- **Symptom:** to look at candidates, the run used `curl …/photos/<id>/download`. That follows to the full-size file, and 11 of 14 previews timed out.
- **What worked:** `curl -sI` the download URL, take the `Location` (`images.unsplash.com/photo-…`), and fetch it with `?w=480&q=60&fm=jpg`.
- **Change:** add `unsplash.mjs preview <url|id>…`. It saves small JPEGs to a given directory, one by one, with a timeout per photo, so the agent can `Read` them.

### 8.3 Intake with one photo going to several targets (P2)

- Two options share the image pool, so one upload had to fill 2 targets (A's card and B's card). The intake snippet assumes one target per upload.
- **Change:** let a plan item's `target` be an array. The transfer snippet copies the hash to each target. This cut the uploads from 9 to 6 in this run.

### 8.4 One grade for the photos (P3)

- Option A's photos came from different shoots (bright clinic corridor, black-and-white facade, dark office).
- **What worked:** image paint filters on each slot, `{ saturation: -0.6, exposure: -0.25, contrast: 0.1 }`.
- **Change:** add a "Grade" paragraph to `references/imagery-unsplash.md` that shows `fills.map(p => ({ ...p, filters: {...} }))` on instance sublayers.

## 9. `scripts/ref-extract.mjs` (P3)

- exoape.com returned 0 stylesheets (SPA), and no browser tool was attached. Type and palette came from the CSS colour counts plus prior knowledge of the site.
- **Change:**
  - When a site returns 0 stylesheets, also parse inline `<style>` blocks and `style=""` attributes.
  - Print the advice to load the built-in browser or Chrome skill for screenshots.

## 10. Copy guidance (P3)

- The first hero H1 in Option A was "Membangun gedung komersial sejak 2009", and the next section's big figure was "2009". The page said the same thing twice.
- **Change:** in step 4 (copy deck), add: "When the page has a big-figure section, the hero does not repeat that figure."

## 11. Logo slot (P3)

- A dummy wordmark in the Statement style (40px) overflowed the 275px `Logo/Slot`. It was fixed with `Body/Strong`.
- **Change:** in `references/design-system.md`, say that the `Logo/Slot` wordmark uses `Body/Strong`, or `Small` for long names.

## 12. The token set is too thin for a real design system (P1, user feedback)

The user's feedback after reviewing the variables: *"variable yang dibuat di figma juga sepertinya kurang lengkap"*. In English: the variables made in Figma seem incomplete.

**Symptom:** the table in `references/design-system.md` covers only what a static marketing page draws. The PRD's design module (FR13) also asks for form, card, navigation and gallery components, and for loading, empty, success, error, disabled, focus and media-fallback states. None of those had tokens.

**Added in the run** (tested; all bound and visible on the Foundations boards):

| Group | Tokens (theme collection unless noted) |
| --- | --- |
| State | `state/error`, `state/success`, `state/warning` (TEXT_FILL, SHAPE_FILL, STROKE_COLOR) and `state/*-surface` (FRAME_FILL, SHAPE_FILL). New primitive ramps: `red`, `green`, `amber`, `blue` at 50/300/600/950 |
| Focus and fields | `focus/ring`, `line/field-focus`, `line/field-error`, `bg/input` (kept apart from `bg/field`, which is a section colour) |
| Disabled | `fg/disabled`, `bg/disabled`, `opacity/disabled` (layout) |
| Interaction | `accent/hover`, `accent/pressed`, `fg/link-hover` |
| Overlay | `bg/overlay`, `shadow/overlay` (EFFECT_COLOR, alias of a primitive with alpha 0.24), effect style `<Brand>/Elevation/Overlay` with its colour bound to that variable |
| Type metrics (layout) | `type/lh-*` and `type/ls-*` bound on every text style. **Superseded by section 15: do not copy this.** Percent values in the style already scale with the mode's font size. `font/display-strong` (FONT_STYLE) is also constant across modes and is not needed (see 15). |
| Component sizes (layout) | `size/tap-min` 44, `size/icon-s/m/l` 16/20/24, `size/input-h` 56/52, `border/width-s/m` 1/2 (STROKE_FLOAT), `radius/m` 8 |
| Opacity (layout) | `opacity/scrim` 50 (OPACITY); the hero scrim's layer opacity is now bound to it |

**API facts confirmed:**
- An OPACITY variable holds 0–100. A value of `50` read back as `node.opacity === 0.5`.
- Binding `lineHeight` or `letterSpacing` on a text style to a FLOAT variable works, but the style then uses pixels, so every mode needs its own hand-set value. That is the reason section 15 says not to do it.
- `figma.variables.setBoundVariableForEffect(effect, 'color', v)` works for a drop shadow inside an effect style.

**Contrast, checked in the creation script:**
- All state colours are ≥ 4.5:1 on the canvas in both options. The lowest is B `state/success` at 4.58.
- `focus/ring` is ≥ 3:1 (5.06 on B, 9.38 on A).

**Change:**
- `references/design-system.md`: add the groups above to the colour table and the layout table, with these scopes.
- `SKILL.md` step 5: say that the foundations must cover the states the PRD lists, not only what the page draws.
- `SKILL.md` step 1: scan the PRD for a design-system or UI-states module and list its states in the inventory.
- `references/design-system.md` → Text styles: keep `lineHeight` and `letterSpacing` as percentages in the style. Bind only `fontSize` (and `fontFamily` while options exist). See section 15.
- Foundations board: add a "States" swatch block. Show stroke tokens as outlined field samples (`field/…` names keep the hairline rule quiet).
- **Verify:** `getLocalVariablesAsync()` lists every token above with a value in each mode. Then re-run the audit; it must still PASS.

## 13. A full type scale, not only the sizes one page uses (P1, user feedback)

The user asked: *"tipografi butuh lengkap juga ga sih? H1–H6 dan yang lain-lainnya"*. In English: doesn't the typography need to be complete too, H1–H6 and the rest?

**Symptom:** the skill makes 7 text styles: Display, H1, H2, Statement, Body, Body/Strong, Small. That covers a homepage. It does not cover the other pages the PRD lists:
- article detail, where CMS rich text outputs H2–H6, quotes, lists, captions and links;
- forms: labels, helper text, error text;
- breadcrumbs, dates and categories, buttons, menus.

**Added in the run** (18 `Arunika/…` styles in total). In the run every property was bound to a variable. Per section 15, only `fontSize` should be bound, plus `fontFamily` while option modes exist. Line height, letter spacing and style stay as values in the style.

| Style | Desktop / Mobile | Note |
| --- | --- | --- |
| Heading/H3 | 36 / 24 | new token `type/h3` |
| Heading/H4 | 28 / 20 | new token `type/h4`, display family at `font/display-strong` |
| Heading/H5 | 20 / 16 | **no new size**: Body size, strong weight; exists so CMS H5 has a match |
| Heading/H6 | 15 / 13 | **no new size**: Small size, strong weight |
| Body/Large | 24 / 18 | new token `type/body-l`, article lead |
| Body/Link | 20 / 16 | underline, for links inside running text |
| Quote | 36 / 22 | Statement size, display family, for blockquotes |
| Label/Default, Label/Strong | 16 / 14 | new token `type/label`: field labels, buttons, menu links |
| Small/Strong | 15 / 13 | meta, breadcrumbs, dates |
| Caption | 13 / 12 | new token `type/caption`: photo captions, credits |

**Rules to write into the skill:**
- The system holds the full scale. A single page still uses five or six sizes at most (house rule unchanged). The audit counts sizes per page, not per system.
- H5 and H6 reuse body sizes. They exist so that CMS output maps to a style, not to add steps to the scale.
- No eyebrow or tiny-caps style, even in a "complete" set; both are banned by the house rules.

**Change:**
- `references/design-system.md` → Text styles: replace the 7-name list with the table above and its size tokens.
- `SKILL.md` step 5.4: say "the full scale from design-system.md".

## 14. Build the site-wide system at the first page, and leave it for the next run (P1, user feedback)

The user's request: *"agar agent jika start dari homepage itu udah punya design system/variable di awal untuk generate design-design selanjutnya"*. In English: when the agent starts from the homepage, it should already set up the design system and variables, so later page designs can be generated from them.

**Symptom:** the skill plans foundations around the page it is drawing. Starting from the homepage gave a system with no form, state, menu, breadcrumb, card or type tokens beyond what the homepage uses. Sections 12 and 13 had to be added afterwards. The next page (for example Portofolio with filters, or Karier with the application form) would have had to extend the system again, and might have done it in a different way.

**Change, `SKILL.md` step 1 (inventory):**
- Read the sitemap's page inventory and its states column, not only the page being designed. Example from this project: `arunika-company-profile_sitemap.md` §2 lists every page with its states (loading, empty, filtered, error, success, validation error, upload error, 404).
- Write a **system inventory** in the notes:
  - every page type;
  - every UI state;
  - every repeated unit: cards for project, article, vacancy and service; filter; pagination; breadcrumb; field; file upload; alert; empty state; skeleton; gallery; mobile menu; dropdown.

**Change, `SKILL.md` step 5 (foundations): build the whole system first, then the page.**
- **Tokens: complete for the site** (sections 12 and 13):
  - colour roles including state, focus, disabled, input, interaction and overlay;
  - the full type scale;
  - spacing, layout, `span/*` and grid for every breakpoint the PRD asks for (add `Tablet` when the PRD lists tablet);
  - radius, borders, opacity, component sizes;
  - an elevation effect style.
- **Components: a core set that every later page needs,** even when the first page does not show it:
  - `Button` with `Kind × State` (Default, Hover, Pressed, Focus, Disabled, Loading)
  - `Link`
  - `Nav/Bar` and `Nav/Menu` (the mobile overlay)
  - `Dropdown`
  - `Breadcrumb`
  - `Field` with `Type` (Input, Select, Textarea, File) × `State` (Default, Focus, Error, Disabled)
  - `Alert` (Success, Error)
  - `Empty state`
  - `Skeleton`
  - `Pagination`
  - `Card` with `Kind` (Project, Article, Vacancy, Service) and `Layout=Row|Stack`
  - `Media` with a fallback state
  - `Logo/Slot`
  - `Stat`
  - `Footer`
- Page-specific units stay page-specific; build them when that page is built.
- Put all of it on the Foundations and Components boards, with each state shown as an instance.

**Change: write a design-system manifest the next run reads first.**
- After step 5, write `.figma-taste/design-system.json` with:
  - `fileKey` and the page and section ids;
  - each collection: id, mode ids and names, variable names;
  - text style, effect style and grid style names and ids;
  - each component or component set: id, variant axes and **text property keys read back after `combineAsVariants`**;
  - decisions: fonts, palette per mode, radius, chosen option, Mobile grid confirmed or not.
- `SKILL.md` step 1: if `.figma-taste/design-system.json` exists, or the file already holds `<Brand> ·` collections:
  1. Verify the ids with one read-only `use_figma`.
  2. Load the manifest.
  3. Skip foundation building. Add only missing tokens or components, inside the same collections and naming.
  4. Never create a second set.
- Update the manifest at the end of every run.

**Change: collapse option modes once the user picks.**
- While options exist, the theme modes are `Option A / Option B`.
- After the user chooses:
  - rename the chosen mode to `Light` (add `Dark` only if asked);
  - keep the other mode only on its archived frames, or delete it after asking;
  - make `Light` the default mode, so later pages need no explicit theme mode.
- Record this in the manifest.

**State of this project (2026-10-19), for the run that continues it:**
- Done: tokens (sections 12 and 13) and 18 text styles.
- Still to build: the core component set above. Only Button (Primary/Quiet, no states), Nav/Link, Nav/Bar, Row/List, Project/Card, Logo/Slot and Stat/Item exist.
- The manifest was not written yet; `.figma-taste/state.json` holds the ids so far.
- Still to do: Tablet mode (PRD asks for it; waiting for the user) and the option pick.

## 15. Token hygiene: what earns a variable, and what the system must have (P1, user feedback)

The user asked: *"apa yang gak perlu di variable tapi dibuat di variable, dan yang perlu banget dari design system/variable malah gak ada?"* In English: what was made a variable that didn't need to be, and what does the design system really need that is missing?

**How this was measured:** a read-only `use_figma` counted, for every `Arunika ·` variable, the bindings on the page wrappers, the Foundations and Components boards, text styles, effect styles and aliases. The findings below come from that count.

**Not a downgrade:** 15.2 moves values to the layer where they belong. Every removed variable is replaced by something that gives the same result:
- percent line height scales with the mode just as the bound pixels did;
- ratio variants replace page heights;
- the helper collection keeps the spans.

15.3 adds what the system lacked. The net result is fewer meaningless tokens and more tokens that a developer and the next page actually use.

### 15.1 The rule (add it to `references/design-system.md`, top of the file)

A value becomes a variable only when at least one of these is true:

1. **It changes by mode:** theme (Light/Dark, a temporary design option), breakpoint (Desktop/Tablet/Mobile) or brand.
2. **It is a shared decision:** used by two or more components or pages, and should change in one place.
3. **Developers need it as a named token in code.** It gets a WEB code syntax.

If none is true, keep the value in the text style, the effect style or the component, or write it in the docs.

### 15.2 What the run made a variable but should not have

| Made as variables | Why not | Do instead |
| --- | --- | --- |
| `type/lh-*`, `type/ls-*` (16) | Percentages in the style already scale with the mode's `fontSize`. Binding turns them into pixels, so each mode needs a hand-set value | Percent `lineHeight` / `letterSpacing` in each text style; bind only `fontSize` |
| `font/display-style`, `font/text-style`, `font/text-strong`, `font/display-strong` | Same value in every mode | Style name set in the text style. Only `font/display` and `font/text` (family) vary while options exist, and they are dropped after the pick (15.4) |
| `size/hero-h`, `size/image-hero`, `size/image-feature`, `size/gallery-row` | Numbers of one page composition, 1–3 uses each | Ratio rules on the `Media` / `Card` component variants (3:2, 4:5, 16:9, 1:1); a hero height lives on the hero section or component |
| `size/logo`, `size/logo-w` | Used only by `Logo/Slot` | Fixed size inside the component (one variant per breakpoint if needed) |
| `layout/section-gap`, `radius/none`, `radius/s`, `layout/measure-wide` | 0 bindings; `measure-wide` equals `span/8`; a 0 radius needs no token | Delete. Keep `layout/measure-text` for article body width |
| `span/1`…`span/12` with WEB code syntax | Figma-only helpers to land blocks on column lines. In CSS that is `grid-column`, so `var(--span-7)` in Dev Mode misleads. 5 of 12 unused; Mobile values 3–12 are all 350 | A separate collection `<Brand> · figma helpers`: `hiddenFromPublishing`, **no code syntax**, only the spans the layouts use |
| `shadow/overlay` in the theme collection | Same alias in every mode | Bind the effect directly to the primitive |
| One-off primitives (`ink/600`, `paper/25`, `paper/400`, `sand/200`, `sand/400`, `stone/800`) | Each was added for one role, so the ramps have gaps | Full ramps with consistent steps (e.g. 50, 100, 200, 300, 400, 600, 800, 900, 950) generated once in step 5 |

### 15.3 What a site design system must have, and the run lacked

| Missing | Why it matters | Token or artefact |
| --- | --- | --- |
| A real theme mode | Modes were `Option A / Option B`. After the pick, every new page must set the option mode by hand | Collapse to `Light` (default) after the pick, see 15.4 |
| Tablet and breakpoint values | PRD asks for tablet and 360px. Developers need breakpoint and container numbers | `layout` mode `Tablet` (768 · 8 columns); single-mode FLOAT `breakpoint/sm|md|lg|xl` (360/768/1280/1920) and `layout/container-max`, no scopes, WEB syntax (docs only) |
| Muted text on dark surfaces | Footer and inverse blocks had one text colour | `fg/inverse-muted` |
| A third surface step | House rule separates surfaces by tone; only `canvas` and `surface` existed | `bg/surface-raised` |
| Numeric font weight | Developers need `font-weight: 500`, not "Medium" | FLOAT `font/weight-regular|medium|light` (FONT_WEIGHT scope) bound on text styles |
| Components that consume the state tokens | State, focus, disabled, input, hover tokens had **0 page bindings**; only the Foundations board used them, so they are untested | Core components with states (section 14). The run is not done until each state token is bound in at least one component |
| Media ratios | Pages invented per-section heights | `Media` component variants per ratio + a ratio table in the docs |
| Motion (optional) | Hover and menu timing were undefined | FLOAT `motion/duration-fast|base` (docs and code syntax only; Figma cannot bind them) |

### 15.4 After the option pick (`SKILL.md` step 3, step 10)

1. Rename the chosen theme mode to `Light`, make it the default, and remove explicit theme modes from the wrappers.
2. Ask before deleting the other mode. It can stay only for archived option frames.
3. Font family is now constant: set it in the text styles and delete `font/display` and `font/text`.
4. Option-only shape tokens (`shape/image-radius`) become a constant `radius/image`, or are written into the component.
5. Write all of this to the manifest (section 14).

### 15.5 A token check in the audit (`scripts/audit.figma.js` or a new `tokens.figma.js`)

Run it at the end of step 5 and again at step 8. Report:
- variables with **0 bindings**, except an allow-list of tokens reserved for core components that are not built yet, each with a reason;
- variables whose value is **identical in every mode** of a multi-mode collection;
- pairs of variables with the **same values** in every mode (duplicates such as `measure-wide` and `span/8`);
- helper tokens that carry a WEB code syntax;
- text styles whose `lineHeight` or `letterSpacing` are bound to variables;
- primitive ramps with gaps.

**Verify:** on this Arunika file, the check must list every row of 15.2.

## 16. Target variable architecture (consolidates 12, 13, 15; P1)

This is the one spec the next version of `references/design-system.md` should hold. Where sections 12, 13 or 15 differ from it, this section wins.

### 16.1 Collections

| Collection | Modes | Holds | Code syntax |
| --- | --- | --- | --- |
| `<Brand> · primitives` | Value | Full ramps with consistent steps: neutral ink, ground (paper), the accent hue, the subject hue, and red / green / amber / blue for states. Alpha colours for shadows | none; `hiddenFromPublishing`, scopes `[]` |
| `<Brand> · theme` | `Light` (default), `Dark` only if asked. **During option comparison:** temporary `Option A / Option B`, collapsed after the pick (15.4) | Semantic colour roles (16.2); `font/display`, `font/text` only while families differ by mode | WEB `var(--…)` |
| `<Brand> · layout` | `Desktop`, `Tablet` (when the PRD asks), `Mobile` | Values that change by breakpoint: margin, gutter, columns, section padding, stack scale, measure, type sizes, `size/input-h` | WEB |
| `<Brand> · system` **(new)** | Value | Shared constants developers need as tokens: radius, border widths, opacity, icon sizes, tap target, numeric font weights, breakpoints, container max, motion durations | WEB |
| `<Brand> · figma helpers` **(new)** | same modes as layout | `span/N` actually used by the layouts | none; `hiddenFromPublishing` |

Why a `system` collection: constants no longer sit in a multi-mode collection with the same value in every mode. The token check (15.5) can then flag real mistakes, not intended constants.

### 16.2 Tokens

**theme (colour roles)**
- `bg/`: `canvas`, `surface`, `surface-raised`, `inverse`, `field` (section field colour), `input`, `disabled`, `overlay`
- `fg/`: `default`, `muted`, `inverse`, `inverse-muted`, `on-image`, `disabled`, `link-hover`
- `accent/`: `default`, `hover`, `pressed`, `on`
- `line/`: `field`, `field-focus`, `field-error` (form outlines only; no divider token, house rule)
- `state/`: `error`, `success`, `warning`, each with `-surface`
- `focus/ring`, `image/placeholder`, `scrim/base`

**layout (per breakpoint)**
- grid: `layout/margin`, `layout/gutter`, `grid/columns`
- rhythm: `layout/section-pad`, `layout/stack-xs|s|m|l|xl`
- `layout/measure-text`
- type sizes: `type/display`, `h1`, `h2`, `h3`, `h4`, `statement`, `body-l`, `body`, `label`, `small`, `caption`
- `size/input-h`

**system (constants)**
- radius: `radius/s|m|full|image` (decided once per direction)
- borders: `border/width-s|m`
- opacity: `opacity/scrim|disabled`
- sizes: `size/icon-s|m|l`, `size/tap-min`
- weights: `font/weight-light|regular|medium`
- layout: `breakpoint/sm|md|lg|xl`, `layout/container-max`
- motion (optional): `motion/duration-fast|base`

**figma helpers**
- `span/N` only for the N the layouts use. Mobile values are the full content width.

### 16.3 Styles and bindings

- **Text styles:** the full scale from section 13.
  - `fontSize` is bound to `layout` `type/*`.
  - `fontFamily` is bound to the theme font variables only while option modes exist.
  - `lineHeight` and `letterSpacing` stay **percent** values in the style.
  - Weight stays the style name; `font/weight-*` is for code. Bind it to the style only if a test shows the binding keeps the style name intact.
- **Effect style** `<Brand>/Elevation/Overlay`, colour bound to an alpha primitive.
- **Grid styles** `<Brand>/Grid/Desktop|Tablet|Mobile` with raw values. Page wrappers use `columnGrid()`, bound to `layout`.
- **Scopes:** every variable has explicit scopes, never `ALL_SCOPES`. The scope list goes in the table in `design-system.md`.

### 16.4 Lifecycle in the run

1. **Step 1:** read the manifest, or existing `<Brand> ·` collections. Extend them; never create a second set. Build the system inventory from the sitemap (section 14).
2. **Step 5:** create all five collections and every token in 16.2 in one or two calls.
   - The creation script returns contrast ratios:
     - text ≥ 4.5:1 (`fg/default` ≥ 7:1);
     - `focus/ring` and field outlines ≥ 3:1;
     - state colours ≥ 4.5:1 on canvas and on their `-surface`.
   - Write the manifest.
3. **Step 5, components:** every state token is bound in at least one core component before step 6.
4. **Step 6 (Mobile and Tablet):** never hand-edit numbers on a copy. A wrong value means the token's mode value is wrong.
5. **Step 8:** run the token check (15.5) together with the audit.
6. **After the option pick:** 15.4, then update the manifest.

### 16.5 What changes from the beta

| Beta | Next version |
| --- | --- |
| 3 collections (`primitives`, `color`, `layout`) | 5: adds `system` for constants and `figma helpers` for spans |
| 11 colour roles | 31 roles, covering states, forms, interaction, overlay, inverse text and a third surface |
| 6 type sizes, 7 styles | 11 sizes, 18 styles (H1–H6 with H5/H6 mapped to body sizes) |
| Desktop / Mobile | Desktop / Tablet (when the PRD asks) / Mobile, plus breakpoint and container tokens for developers |
| Page-specific `size/*` tokens | Ratio variants on `Media` / `Card`; no page numbers in the system |
| Option modes stay forever | Collapsed to `Light` after the pick |
| No check that tokens are used | Token check plus "every state token bound in a component" |
| Tokens rebuilt per run | Manifest read first, system extended |

**Verify:** run the next version on a new brief. Then:
- the token check reports 0 issues;
- every role in 16.2 has a value in every mode;
- the audit still PASSes on the page;
- a second page built in a new session reuses the system and creates no duplicate collection.

---

## What worked (keep)

- The step 1 question in one message: options + Mobile grid + where the tokens go.
- `COLLECTION_PREFIX` / `STYLE_PREFIX` in a file that holds a template system.
- Dummy marking (annotation + ` · dummy` suffix) and the Dummy content board.
- The audit as a gate: it caught 2 real FAILs (3-line statement, one-child wrapper), and both were fixed before the report.
- `get_screenshot` at 2400 for the full page, and DesignAgent `take_screenshot` for fast section checks.

## Order of work

1. P1: 1 (flex default), 2.1, 2.3, 3.1, 5.1, 8.1, 12, 13, 14, 15, 16 (16 is the final variable spec; where 12, 13 or 15 differ, 16 wins)
2. P2: 2.2, 2.4, 2.7, 2.8, 3.2, 4.1, 6, 7, 8.2, 8.3
3. P3: the rest
