# figma-taste: improvement notes

Source: one full run of the skill on 2026-10-19 (Arunika company-profile homepage, Figma file "Sankara Hill", page "Arunika"). Every item below happened in that run. Items marked **verify** were seen once and need a quick repro before you patch them.

Skill location: `.claude/skills/figma-taste/` (paths below are relative to it).

## How to use these notes

- Patch one file at a time, in the order given. Each item has the symptom, the cause, and the change.
- Keep existing behaviour that is not mentioned here. Do not rename public helper functions; build calls in other projects paste them.
- After each script change, run the check listed under **Verify**. Do not mark an item done without it.
- Code that runs inside Figma uses the Plugin API through `use_figma`, so the `figma-use` rules apply: return node IDs, and load fonts before any text edit.

---

## 1. `scripts/helpers.figma.js`

### 1.1 `txt()` crashes when `maxW` is set (bug)

- **Symptom:** `Error: in setBoundVariable: invalid field for text node: 'maxWidth'`.
- **Cause:** line 117 binds `maxWidth` on a TEXT node. Text nodes do not accept that field. Binding `width` does work (tested).
- **Change:**
  ```js
  // before
  if (o.maxW) bind(t, 'maxWidth', o.maxW);
  // after: a fixed, token-bound measure; height still grows with the copy
  if (o.maxW) { t.layoutSizingHorizontal = 'FIXED'; bind(t, 'width', o.maxW); t.textAutoResize = 'HEIGHT'; }
  ```
- Update the usage comment on line 102 to say that `maxW` sets a fixed width bound to the token.
- **Verify:** build a VERTICAL auto-layout frame, call `txt(frame, 'x', <style>, 'fg/default', { maxW: 'layout/measure-wide' })`, and check that `t.width` equals the token's value.

### 1.2 `paint(varName, opacity)` may drop opacity (bug, **verify**)

- **Symptom:** a scrim built as `{ ...setBoundVariableForPaint(...), opacity: 0.38 }` read back with `opacity: 1`. The run fixed it with `node.opacity`.
- **Change, if it reproduces:** build the paint with the opacity first, then bind:
  ```js
  function paint(varName, opacity) {
    const base = { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: opacity ?? 1 };
    return figma.variables.setBoundVariableForPaint(base, 'color', need(V, varName, 'variable'));
  }
  ```
- **Verify:** `fill(rect, 'bg/inverse', 0.4)`, then read back `rect.fills[0].opacity === 0.4`.

### 1.3 Variable lookup ignores the collection (risk)

- **Cause:** lines 10–11 keep the first variable that has a given name across all collections. In a file that hosts several brands, a matching name in another brand's collection binds silently to the wrong token.
- **Change:** add an optional collection-prefix filter at the top of the prelude:
  ```js
  const COLLECTION_PREFIX = null; // e.g. 'Arunika ·' when the file holds other brands' systems
  const __cols = await figma.variables.getLocalVariableCollectionsAsync();
  const __allowed = new Set(__cols.filter(c => !COLLECTION_PREFIX || c.name.startsWith(COLLECTION_PREFIX)).map(c => c.id));
  for (const v of __vars) { if (__allowed.has(v.variableCollectionId) && !V[v.name]) V[v.name] = v; }
  ```
  Apply the same filter to text styles with an optional `STYLE_PREFIX` (for example `Arunika/`). `S` should map the name without the prefix, so `txt(..., 'Heading/H1')` keeps working.

### 1.4 New helpers that the run had to hand-write

Add these below the existing helpers:

- `component(name, dir, o)`: creates a component with auto layout, **calls `resize()` first and only then** sets `primaryAxisSizingMode = 'AUTO'` (hug). Without this order, every component in the run came out with a FIXED height and its content overflowed.
- `toColumn(frame, gapToken)`: for Tablet/Mobile copies. It sets `layoutMode = 'VERTICAL'`, `counterAxisAlignItems = 'MIN'`, `layoutGrow = 0` and `FILL` on the visible non-absolute children, sets `primaryAxisSizingMode = 'AUTO'`, and binds the gap.
  - It must change only that one frame. Do not loop "every FIXED frame becomes HUG": in the run that also broke `Logo/Slot`, whose height is a fixed token.
- `textProp(component, name, textNode, default)`: adds a TEXT component property and links it to the node through `componentPropertyReferences`.

### 1.5 Prelude size (efficiency)

The prelude is about 9.7k characters and gets pasted into every build call. Ship a trimmed variant `helpers.min.figma.js` (no comments; only `V`, `S`, `paint`, `fill`, `bind`, `pad`, `stack`, `add`, `section`, `txt`, `inst`, `done`). Keep the full file as the documented source.

---

## 2. `scripts/audit.figma.js`

### 2.1 Eyebrow and pill-badge false positives inside instances (bug)

- **Symptom:** seven FAILs such as `label "Lihat layanan" above a heading`, although the label sits **below** its heading.
- **Cause:** lines 134 and 142 use `par.children.indexOf(n)`. For nodes inside instances, the objects from `findAll` are not identical to those in `parent.children`. The result is `-1`, so `children[0]`, the heading, is taken as "next".
- **Change:**
  ```js
  const idx = par.children.findIndex(c => c.id === n.id);
  const next = idx >= 0 ? par.children[idx + 1] : null;
  ```
  Make the same change at line 142, using `n.parent`.
- **Verify:** put a heading-size TEXT above a small TEXT inside a component instance. The audit must not report `eyebrow`. Then swap their order: it must report it.

### 2.2 The emoji rule flags © ® ™ (bug)

- **Cause:** line 126 uses `\p{Extended_Pictographic}`, which includes ©, ® and ™.
- **Change:** `/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u`, or keep the current regex and remove `©®™` from `chars` before testing.
- **Verify:** `"© 2026"` passes and `"🚀"` fails.

### 2.3 A logo wall triggers `card-row` (expected section)

- **Cause:** line 195 warns about 3 or more identical filled children. A client-logo wall that a PRD requires is uniform by design.
- **Change:** skip it when the children are instances of a component whose name starts with `Logo/`, or when the container name starts with `Clients/` or `Logos/`. Document the exception in `references/house-rules.md` (allowed-exceptions table).

### 2.4 Several roots and a summary mode (efficiency)

- Accept `const ROOT_IDS = ['…', '…', '…']` and return one result per root, so Desktop, Tablet and Mobile take one call.
- Add `const SUMMARY = true` to return only `verdict`, `fails` (rule, name, short message) and key stats. The full output stays the default.

---

## 3. `scripts/deal.mjs`

### 3.1 `needs` is not enforced (bug)

- **Symptom:** the `work` role was dealt `s-catalogue` (which needs 6+ items) for a page that had 3 featured projects. The hero `hero-split-7-5` was dealt although the PRD required a full-bleed banner.
- **Cause:** `available()` (lines 173–177) checks only `product-ui`. Every other need is ignored. SKILL.md also shows `--have photography`, while the compositions use `photo` and `photos`, so that value never matches anything.
- **Change:**
  1. Fix the vocabulary. Accept `photography` as an alias for `photo,photos`, and list the valid `--have` values in `--help` and in SKILL.md step 3.
  2. Enforce `needs` in `available()` when `--have` is given. Without `--have`, keep the current lenient behaviour so old runs reproduce.
  3. Add `--items role:count` (for example `--items work:3`). `s-catalogue` requires 6 or more, `s-index-list` 4 or more, `s-gallery-wall` 4 or more photos.
  4. Add `--require hero:<id>` and `--require <role>:<id>` to pin compositions that a PRD or brief mandates. Pinned slots count as `fixed`, so neighbours still avoid repeats. Print them under "Pinned (brief)" so the report shows they were not redraws.

### 3.2 No role for client logos (gap)

- **Symptom:** `Note: unknown roles (clients) will be dealt from any section composition.` B2B company profiles almost always need this section.
- **Change:** add a `s-logo-wall` composition (`needs: ['logos']`) and roles `clients` / `logos` with the order `['s-logo-wall', 's-columns-text']`. Add its recipe to `references/compositions.md` (see 5.3).

---

## 4. `scripts/ref-extract.mjs` and `scripts/unsplash.mjs`

### 4.1 `ref-extract.mjs`: SPA references come back thin, and sizes are in vw

- exoape.com returned `0 stylesheets`, and the type sizes were all in `vw`.
- **Change:**
  - Print each `vw` and `clamp()` size converted to px at 1440 and 390 next to the raw value (`3.73vw ≈ 54px @1440 / 15px @390`).
  - When the stylesheet count is 0, print a clear line: "SPA or inline CSS: rely on screenshots."

### 4.2 `unsplash.mjs`: no API key and no target IDs inside instances

- **Search without a key:** the public `napi` endpoint answered 307. The run found photo IDs by using WebFetch on `https://unsplash.com/s/photos/<query>`.
  - Make `search` print this fallback when `UNSPLASH_ACCESS_KEY` is missing, instead of only erroring.
- **Download tracking:** `https://unsplash.com/photos/<cdn-id>/download` returned 404, because the CDN id (`1508450859948-4e04fabaa4ea`) is not the photo's page/API id.
  - Record tracking as "not sent" in the credits when no API id is known. Never report it as sent.
- **Slots inside instances:** `upload_assets` rejects IDs like `I4591:50;4588:22` (pattern `^\d+[:-]\d+$`), so `place` cannot target image slots that live in components. Add an intake mode:
  1. `place --intake`: the plan lists target IDs (instance sublayers allowed) plus one plain intake rectangle per photo.
  2. Upload goes to the intake rectangles. The script prints a ready-to-paste `use_figma` snippet that copies each `imageHash` to its target, then removes the intake frame.

---

## 5. References and SKILL.md

### 5.1 `SKILL.md` step 1: file access and brand

- Ask for the Figma URL (`fileKey`) as the first action when none was given. DesignAgent and other bridges can be connected to a file without exposing its key.
- Replace "If the file or a library already has a design system, use it" (lines 53–54) with:
  > If the existing system belongs to this client, use it and skip to step 4. If it belongs to a different brand (a shared agency file), build this client's own collections and styles with a brand prefix (`<Brand> · color`, `<Brand>/Heading/H1`), set `COLLECTION_PREFIX` / `STYLE_PREFIX` in the helpers, and never edit the other brand's tokens.
- In shared files, allow sections on one page (`<Brand> · Foundations`, `<Brand> · Components`, and the page frames) instead of creating new pages. Mention this in `references/design-system.md` → File layout (line 126).

### 5.2 `SKILL.md`: DesignAgent-only fallback

When the user asks for DesignAgent only, or `use_figma` is unavailable, describe a reduced route:

- Generate the HTML, render it with `html_to_design`, and verify with DesignAgent `take_screenshot`.
- State up front what is lost: no variables or modes, no bound text styles, no components, no audit gate.
- Keep the art-direction steps 1–4 and the critique.

### 5.3 `references/compositions.md`: add `s-logo-wall`

```
### `s-logo-wall`
Client logos as proof. Only real logos with permission; until they arrive, honest named slots.
Section/Clients  VERTICAL, gap stack-l
├─ TEXT H2 (measure-wide)
└─ Clients/Wall  HORIZONTAL WRAP, Fill, gap gutter, counterAxisSpacing gutter
   └─ Logo/Slot instances, width size/logo-w, height size/logo (6 per row desktop, 3 mobile)
Needs: logos. Hide the section when the CMS has none.
```

Add `size/logo` and `size/logo-w` to the token table in `references/design-system.md`.

### 5.4 `references/design-system.md` → Components (line 102)

Add:

- Build components with `component()` (resize first, then hug). Say why: `resize()` resets sizing to FIXED.
- **Plan variants for responsive and size differences up front.**
  - Overriding `layoutMode` on an instance did not persist in the run.
  - Binding a height variable on an instance sublayer did not change its size.
  - So any component that is a row on desktop gets `Layout=Row|Stack`, and a component used at two sizes gets `Size=Small|Large`.
- After `combineAsVariants`, text properties are re-keyed (`Title#4592:0`). Read the keys back from the set; do not reuse earlier keys.

### 5.5 `references/autolayout.md` → Responsive (line 115)

- Step 3 says "set the row's `layoutMode` to VERTICAL". Add that this works on frames, not on instances (use the Stack variant instead), and that after the change the frame must hug (`toColumn()`), or its content gets clipped.
- Name the outcome to check: each wrapper's total height should be close to the sum of its sections. A Mobile wrapper of 16,000 px meant one service row had collapsed to a 1 px text column.

### 5.6 `references/autolayout.md` → Overlap: a tested scrim

The run's `gradientTransform` produced no visible darkening. Either add a tested top-to-bottom snippet or recommend the simple version:

```js
const scrim = figma.createRectangle(); scrim.name = 'scrim';
hero.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE';
scrim.resize(hero.width, hero.height); scrim.x = 0; scrim.y = 0;
scrim.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
scrim.fills = [paint('bg/inverse')]; scrim.opacity = 0.5; // the layer's opacity, not the paint's
```

Note: even at 0.55 a busy photo can still make body text hard to read. The critique should check the lede's contrast, not only the H1.

### 5.7 `references/imagery-unsplash.md`

- Document the no-key search fallback, the intake upload pattern (4.2), and that download tracking needs the API id.

### 5.8 House rule: navigation links

`SKILL.md` line 241 says "three to five links". A sitemap in the brief can mandate more. Add: "unless the sitemap mandates more; then the nav action button covers Contact, and the rest stay as links."

### 5.9 Step 9 critique

The run skipped the formal 14-pass scored critique. Consider a required 6-question short form and keep the full critique optional:

- Is the first screen readable?
- Is the lede legible on the photo?
- Does any headline run past 2 lines?
- Do neighbouring sections share a composition?
- Is any image slot empty?
- Does the mobile wrapper's height make sense?

---

## 6. Default canvas and layout grid (requested by the user)

The user's house standard. It replaces the 1440 default in the skill.

### 6.1 Defaults

| Breakpoint | Frame width | Columns | Type | Margin | Gutter | Grid colour |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | **1920** | **12** | Stretch | **60** | **30** | `#FF0000` at 10% |
| Mobile (proposal, confirm with the user) | 390 | 4 | Stretch | 20 | 16 | same |

Only the Desktop row came from the user. Do not hard-code the Mobile row until the user confirms it. **No Tablet breakpoint** (see 7.2).

Files to change:

- `SKILL.md` step 6, `references/autolayout.md` (page skeleton) and `references/design-system.md`: the page wrapper is **1920** wide.
- The `layout` token table: Desktop `layout/margin = 60`, `layout/gutter = 30`.
- New token `grid/columns` (FLOAT, no scopes needed): 12 / 8 / 4.
- Rescale the other Desktop tokens (type sizes, section pad, measures) for 1920. For example, `layout/measure-text` stays near 600 so lines keep 45–75 characters.

### 6.2 The Figma API supports grids (tested on 2026-10-19)

A probe in a real file confirmed:

- `frame.layoutGrids = [{ pattern: 'COLUMNS', alignment: 'STRETCH', count: 12, gutterSize: 30, offset: 60, visible: true, color: { r: 1, g: 0, b: 0, a: 0.1 } }]` works. `offset` is the margin when the alignment is STRETCH.
- `figma.variables.setBoundVariableForLayoutGrid(grid, field, variable)` binds `count`, `gutterSize` and `offset` to variables. Like the paint helper, it returns a **new** grid object that must be reassigned.
- `figma.createGridStyle()` works, so the grid can also be published as a style.
- The DesignAgent bridge has a `set_grid` tool that can serve as a fallback.

So the skill can create the grid itself. The user only supplies the values (6.1).

### 6.3 What to build

1. Bind the grid fields to the layout tokens: `offset` to `layout/margin`, `gutterSize` to `layout/gutter`, `count` to `grid/columns`. Switching a wrapper's `layout` mode then changes its grid with the rest of the page.
2. Add a helper to `helpers.figma.js`:
   ```js
   async function columnGrid(frame) {
     let g = { pattern: 'COLUMNS', alignment: 'STRETCH', count: 12, gutterSize: 30, offset: 60, visible: true,
               color: { r: 1, g: 0, b: 0, a: 0.1 } };
     g = figma.variables.setBoundVariableForLayoutGrid(g, 'offset', need(V, 'layout/margin', 'variable'));
     g = figma.variables.setBoundVariableForLayoutGrid(g, 'gutterSize', need(V, 'layout/gutter', 'variable'));
     g = figma.variables.setBoundVariableForLayoutGrid(g, 'count', need(V, 'grid/columns', 'variable'));
     frame.layoutGrids = [g];
     return frame;
   }
   ```
   Call it on every page wrapper (`Page/Desktop`, `Page/Tablet`, `Page/Mobile`).
3. Also create grid styles `<Brand>/Grid/Desktop`, `/Tablet` and `/Mobile` with raw values. Designers apply those to new frames by hand, where variable modes may not be set.
4. Show the grid on the Foundations board: a 1920 strip with the grid visible, labelled with columns, margin and gutter.

### 6.4 Make the layout actually snap to the grid (important)

A visible grid only helps if the content lines up with it. Today's recipes split rows with `layoutGrow` weights (7 and 5). That does **not** land on column lines:

- At 1920 the content width is 1800 and one column is (1800 − 11·30) / 12 = **122.5**.
- A 7-column span is 7·122.5 + 6·30 = **1037.5**; a 5-column span is **732.5**.
- `layoutGrow` 7:5 shares the space left after the 30 px gap: 1770 × 7/12 = **1032.5** and 737.5. That is 5 px off the grid.

Pick one of these and write it into `references/autolayout.md` and `compositions.md`:

- **Preferred:** split sections with `layoutMode = 'GRID'`, 12 columns, column gap bound to `layout/gutter`, and children spanning N columns (`gridColumnSpan`). Tracks then match the layout grid exactly.
- **Fallback:** give split children a FIXED width from a helper and keep `layoutGrow` only for the last child:
  ```js
  // width of an n-column span at the frame's current mode
  const span = (n, W, cols, margin, gutter) => { const col = (W - 2 * margin - (cols - 1) * gutter) / cols; return n * col + (n - 1) * gutter; };
  ```
  Bind these span widths to variables (`span/7`, `span/5`, `span/4`, `span/8`) with per-mode values, so Tablet and Mobile stay token-driven.

Other rules to add:

- Sections keep `padX = layout/margin`. Every horizontal gap between columns is `layout/gutter`. No other horizontal spacing values at section level.
- Compositions describe widths in columns ("H1 spans 8", "image spans 7"), not in pixels or `measure-*` tokens. The measure tokens stay for line length inside a column span.

### 6.5 Audit: an off-grid check

Add to `audit.figma.js`, reading the grid from the root:

- For each direct child of a section and each column inside a split, compute its left x relative to the wrapper. WARN `off-grid` if it does not fall within ±1 px of a column start (margin + k·(col + gutter)).
- For split children, also check that the right edge falls on a column end.
- Skip `free/…` layers, full-bleed fills and absolute scrims.

---

## 7. Design options and breakpoints (requested by the user)

### 7.1 Ask for the number of options at the start

- In step 1, if the brief does not state how many design options are wanted, ask **once**, in the same question as the Figma URL (6.1, 5.1). Default to 1.
- Why up front, not "make another one" afterwards:
  - A second option made after the first is finished anchors on it and ends up a variation, not an alternative.
  - Foundations built for option A (palette, type) then have to be redone or bent to fit B.
- When there are 2 or more options:
  - Pick a **different direction** for each one from `deal.mjs --options N` (the script already prints three). Deal compositions separately per option with `--direction <id> --seed <n>`.
  - No two options may share the hero composition.
  - Write one line per option on what makes it different (idea, type, palette, hero), so the user compares ideas, not pixels.
  - Share the copy deck, the content, the image pool and the `layout` tokens.
  - Give each option its own colour mode (`color` collection modes `Option A`, `Option B`) and its own text styles (`A/Heading/H1`, `B/Heading/H1`). The components can stay shared when they bind to these tokens.
  - Name the frames `Option A/Desktop`, `Option B/Desktop`, … and place them side by side.
- **Option workflow:** build every option at **Desktop only** first and ask the user to pick. Build Mobile only for the chosen option. This halves the build work and keeps the comparison fair.
- If the user asks for another option later anyway, treat it as a new option with its own direction and colour mode, not as a duplicate of the existing frames.

### 7.2 Breakpoints: Desktop and Mobile only

- The user never needs Tablet. Remove it from the defaults:
  - `layout` modes are `Desktop` and `Mobile`.
  - Wrappers are `Page/Desktop` (1920) and `Page/Mobile` (390).
  - Screenshots and the audit cover those two.
- Update every place that names three breakpoints: `SKILL.md` steps 5, 6 and 9, `references/design-system.md` (layout table), `references/autolayout.md` (Responsive) and the audit's multi-root example (2.4).
- Build Tablet only if a user explicitly asks for it.

---

## 8. Copy: dummy content by default (requested by the user)

The Arunika run left many slots as `[Alamat kantor]`, `[n]`, `[n] m²` or "Logo klien". The user found the result hard to preview. The new default: **every slot is filled with realistic dummy content**, so the design reads as a finished page.

### 8.1 Rules for dummy copy

- Write it in the page language, at the length and tone the final copy will have. Use realistic sentences, not lorem ipsum, so line breaks, headline lengths and density show up correctly in the preview.
- Keep it internally consistent: the same numbers everywhere (if the stats say "350+ proyek", no section says otherwise). Use cities, years and categories that fit the brief.
- Proof-type content may be dummy, with these limits:
  - **Client logos:** invented generic wordmarks (simple text or shape marks with made-up names). **Never real company names or logos**, because a real name reads as a false claim of a client relationship.
  - **Testimonials:** invented names with role and company type only ("Manajer Fasilitas, perusahaan logistik"). No real people.
  - **Stats, addresses, phone numbers, emails:** plausible formats (for example `+62 31 5xxx xxxx`, `Jl. … No. 12, Surabaya`). Use the client's own domain for emails if it is known.
- Real facts from the brief (founding year, team size, service names) stay real and are not marked as dummy.

### 8.2 Mark every dummy layer

Dummy content must never be mistaken for approved content at handoff:

- Add a Figma annotation (`node.annotations`, label "Dummy") to every text layer and logo that is dummy. Alternatively, suffix the layer name with ` · dummy`.
- Add a `Dummy content` list to the report and to a small board next to the pages, grouped by section, with what the client must supply.
- Audit: count the dummy-marked layers and report the number. That is informational, not a FAIL.

### 8.3 Files to change

- `SKILL.md` step 4 ("Write the full copy deck"): the default content mode is "dummy-filled". Add an opt-in "real-only" mode for when the user supplies final copy or asks for honest placeholders.
- `SKILL.md` house-rules table and `references/house-rules.md` "No invented proof": reword as "No invented proof **presented as real**". Dummy proof is allowed only when it is marked (8.2) and never uses real company or person names.
- The empty-slot logic in `audit.figma.js` stays: image slots must still hold photographs.

---

## What worked (keep)

- The "no assistant palette" rule caught a cream + terracotta first choice. The run changed it to concrete + amber.
- The headline limit (about 32 characters, 2 lines at most) kept the hero copy tight at every breakpoint.
- `layout` tokens with Desktop/Tablet/Mobile modes, and text styles with bound font sizes, made Tablet and Mobile mostly automatic once Desktop was built.
- The audit gate found real problems (font sizes, unbound values) quickly. Its false positives are the ones listed in section 2.
