---
name: figma-design-review
description: Reviews and lightly improves a design that already exists in Figma, keeping the designer's own system and every part that already works. Review is a read-only audit (inconsistencies measured against the frame's own grid, type, colours and spacing, plus a screenshot critique, with a verdict per section: Keep, Polish, Rework). Polish fixes small things on a copy; Re-layout rearranges a section with the same content and styles on a copy; Reference designs one to three alternatives for a section beside it. The original is never edited, every change is annotated, and a compare script proves the Keep sections stayed untouched. Use when the user shares a Figma design and asks to audit, review, critique or give feedback on it, polish or tidy it, fix a few parts, redesign a layout without changing much, or wants a reference or alternative for a section, in any language ("audit desainku", "perbaiki sedikit", "buatkan referensi section"). To build a new page from scratch, use figma-taste.
---

# figma-design-review

The user has a design they made. Parts of it are good, some are not, and they want a second pair of
eyes that **improves it without taking it over**. The failure this skill exists to prevent is the
model that "reviews" a page by redrawing it in its own taste: new fonts, new colours, a different
layout, the designer's decisions gone. Here the designer's system is the standard, the original is
never touched, and every change is small, explained and measured.

`<skill>` below means this skill's folder. The `*.figma.js` scripts are pasted into `use_figma` calls;
they need no other files. Write the review in the user's language.

## Ground rules

1. **The original is never edited.** Work on a duplicate placed to its right (`<frame> · polish`,
   `<frame> · relayout`) or in new frames (`Ref/<Section> · A`). Only `Review:` annotations may go on the
   original, and only when the user asks for notes on it.
2. **The design's own system wins.** Use the text styles, colour styles or variables, components,
   layout grid, spacing base and radii the frame already uses (`inspect.figma.js` lists them). No new
   typefaces, no new colours, no house style. When a fix needs a value the system lacks, take the nearest
   one it has; when none fits, propose it in the report instead of adding it.
3. **The words stay.** Polish and Re-layout never rewrite copy. Copy suggestions go in the report.
   Reference may add content only where the section needs more; every added piece is marked dummy.
4. **Keep what works.** Every review names what is good before what is wrong, with the same precision.
   A section judged Keep is not touched in any mode, and `compare.figma.js` proves it.
5. **The smallest change that fixes it.** Each mode has a change budget (below). A change that needs
   more than its mode allows is a proposal for the next mode, not something to slip in.
6. **Every change is explained.** Each changed layer gets a `Review: <what and why>` annotation, and the
   report lists every change.
7. **Honest about evidence.** Say which findings were measured by a script and which were judged from
   the screenshot. A measured finding is a claim to confirm in the picture, not a verdict (a 3px indent
   can be optical alignment on purpose).

## Required companions

Before the first `use_figma` call, load the Figma MCP's `figma-use` skill (`get_figma_skill`, or
`skill://figma/figma-use/SKILL.md`). Its Plugin API rules win over anything here: return node IDs, load
fonts before any text edit, colours 0–1, append before setting FILL/HUG, resize before hug. Code per call
is capped at 50,000 characters; each script here is well under it.

## Modes and their budgets

| | **Review** | **Polish** | **Re-layout** | **Reference** |
| --- | --- | --- | --- | --- |
| Output | Report, optional annotations | Copy of the frame | Copy of the frame | New frames beside the section |
| May change | Nothing | Spacing to the system's values, alignment to existing edges or the grid, type size to the scale, colour to an existing one (contrast), radius, image crop or empty image, clipped or over-long text boxes | Polish, plus inside the chosen sections: order of blocks, column split, alignment axis, image size and ratio, auto layout structure, another variant of the same component | Anything inside the new frames, built from the file's styles and components |
| Never | Anything | Copy, typefaces, new colours, section order, Keep sections | Copy, typefaces, new colours, sections not chosen, section order (ask) | The original, the copy, invented content left unmarked |
| `compare.figma.js` | Not needed | `KEEP` = Keep sections, `BUDGET = 0.25` | `KEEP` = every section not chosen, `BUDGET = 0.6` | Not needed (nothing existing changes) |

When the user's words do not name a mode, map them: "audit / review / cek / kasih masukan" → Review;
"perbaiki sedikit / rapikan / polish / tidy" → Review, then Polish; "redesign layout tanpa mengubah
banyak" → Review, then Re-layout of the Rework sections; "referensi / alternatif / contoh section" →
Reference. Review always runs first: the other modes act on its verdicts.

## The run

### 1. Read the frame

- Take the `fileKey` and `node-id` from the URL (`-` becomes `:`). If the user gave a page or a file,
  `get_metadata` and ask which frame, or review each top-level frame named like a page.
- One short question only when it changes the work: what the page is for and who it is for, if that is
  not obvious; whether there is a Mobile frame too. Otherwise take the obvious reading and say it.
- `get_screenshot` of the frame (`maxDimension` 2400 for a desktop page, 1600 for mobile). For a long
  page also screenshot the first screen and each section you will judge closely.

### 2. Inspect (measured)

Paste `<skill>/scripts/inspect.figma.js` into a `use_figma` call with the frame's id in `ROOT_ID`.
Run it with `SUMMARY = true` first; run the full report when you need every finding. It returns:

- `system`: the frame's own layout grid, type families and sizes, colours, spacing values and base,
  radii, text styles, variables and components in use. This is the standard for every later step.
- `sections`: the top-level sections with their finding counts and a measured `hint`
  (`keep`, `polish`, `look closer`).
- `findings`, each with severity `major`, `minor` or `check`:

| Rule | Measures |
| --- | --- |
| `contrast` | text against the fill behind it (WCAG 4.5:1 body, 3:1 large); `major` when far off |
| `text-on-image` | text over a photograph or gradient: check it in the screenshot |
| `clipped`, `empty-image`, `headline-lines` | text cut off by a clipping frame, an image slot without a picture, a headline past three lines |
| `near-colour`, `near-size`, `near-spacing`, `near-radius` | a value used less, next to one used more (`#343434` beside `#333333`, 23 beside 24): probably a slip |
| `off-scale-spacing` | spacing off the 4 or 8 base the rest of the frame uses |
| `near-edge`, `ragged` | left edges a few px apart in one section; more than four left edges |
| `off-grid` | blocks starting (pictures and cards: also ending) off the frame's own column grid, when it has one |
| `measure`, `tiny-text`, `small-body`, `tap-size` | over-long lines, text under 12px, small body text and tap targets on a phone frame |
| `families`, `sizes` | more than three typefaces, more than twelve type sizes |

The script is read-only and works on any frame: auto layout or not, with or without variables and
styles. It does not judge taste; step 3 does.

### 3. Look (judged)

Follow `<skill>/references/review-lenses.md`: go through the screenshot section by section with the
lenses (first screen, hierarchy, alignment and grid, spacing rhythm, type, colour and contrast,
imagery, consistency, mobile), confirm or dismiss each measured finding with a reason, and give each
section one verdict:

- **Keep**: works; no change. Say why in one line, specifically.
- **Polish**: works as a composition; small slips to fix (Polish budget).
- **Rework**: the layout itself does not do its job (hierarchy, rhythm, empty or crowded); needs
  Re-layout or a Reference.

The script's `hint` is a starting point; the verdict is yours, and you say when you overrule it.

### 4. Report (the Review deliverable)

Use `<skill>/assets/review-template.md`: what works, the verdict table, findings by section (where,
what, why it matters, the fix and its mode), copy suggestions apart, and the measured system. Mark each
finding `measured` or `seen`. If the user asked for notes in Figma, pin them with
`<skill>/scripts/annotate.figma.js` (on the original only when asked; otherwise on the copy).

**End Review with one question:** apply the Polish fixes, re-lay out the Rework sections, design
references for a section, or stop here. When the user's first message already asked for one of these,
go straight on.

### 5. Polish or Re-layout (on a copy)

Follow `<skill>/references/editing.md`:

1. Duplicate the frame onto the page canvas 200px to its right, named `<frame> · polish` or
   `<frame> · relayout`. Never move or rename the original.
2. Edit by node id, one or two sections per call, only inside the mode's budget. Reuse the system:
   copy a variable binding or style from a layer that already has the right value; load fonts before
   text edits.
3. Annotate each changed layer `Review: …`.
4. **Verify** in one call: `compare.figma.js` with `ORIGINAL_ID`, `COPY_ID`, `KEEP` and `BUDGET` from
   the mode table. `verdict` must be `OK` and every Keep section `untouched`; if `overBudget`, say so
   and say why, or undo the extra changes. Then run `inspect.figma.js` on the copy: the fixed findings
   are gone and no new `major` appears. Screenshot the original and the copy side by side and look
   once more: a change that measures better but looks worse is undone.

### 6. Reference (new frames)

Follow the Reference part of `references/editing.md`: one to three alternatives for the section, each
a frame `Ref/<Section> · A` the width of the original frame, placed level with the section to the right
of the work, built from the frame's text styles, colours, components and grid, with the section's real
copy. Each option takes a different composition, never three variations of one; write one line per
option on what changes and why it serves the section's job better. When the `figma-taste` skill is
installed, its `references/compositions.md` and `scripts/deal.mjs` supply non-default compositions;
its art direction, fonts and palette do not apply here. Ask which option to take; on a pick, put it in
the copy in place of the section (Re-layout rules and `compare.figma.js`).

### 7. Hand over

Tell the user: the verdict table, what changed (from `compare.figma.js`: sections touched, layers
changed, share), the before/after findings count, which findings were dismissed and why, and what is
still open. The copy replaces the original only when the user says so; never delete the original.

## Files

| File | What it is |
| --- | --- |
| `scripts/inspect.figma.js` | Read-only: the frame's own system, per-section table, measured findings. |
| `scripts/compare.figma.js` | Read-only: every change between the original and the copy, by section; Keep violations; change share against the budget. |
| `scripts/annotate.figma.js` | Pins `Review:` annotations; `CLEAR = true` removes only these. |
| `references/review-lenses.md` | How to look: the lenses, confirming measured findings, verdict rules. |
| `references/editing.md` | How to change: duplicate, reuse the system, Plugin API snippets, the Reference build. |
| `assets/review-template.md` | The report. |
| `scripts/test/` | Node regression tests on a mock Plugin API: `for t in figma-design-review/scripts/test/*.test.mjs; do node "$t"; done` |
