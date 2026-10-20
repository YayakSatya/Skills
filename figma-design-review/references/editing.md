# How to change

Everything here happens on a copy or in new frames. The original is the reference the copy is
compared against, so it must stay exactly as it was.

## 1. Duplicate

```js
const src = await figma.getNodeByIdAsync('ORIGINAL_ID');
const copy = src.clone();                       // same parent, right above the original
const moved = copy.parent.type !== 'PAGE' && copy.parent.type !== 'SECTION';
if (moved) figma.currentPage.appendChild(copy);   // x/y are now page coordinates
copy.name = `${src.name} · polish`;             // or · relayout
copy.x = (moved ? src.absoluteBoundingBox.x : src.x) + src.width + 200;
copy.y = moved ? src.absoluteBoundingBox.y : src.y;
return { copyId: copy.id };
```

If the original sits inside an auto-layout parent, the clone is moved to the page so the parent does
not reflow. Re-run step 1 only if no copy exists yet: look for a frame named `<frame> · polish` first.
Node ids inside the copy differ from the original's; find layers in the copy by name path, or run
`inspect.figma.js` on the copy to get its ids.

## 2. Reuse the system, never type a new value

The fix takes a value the design already uses, in the same form the design uses it.

- **Bound values stay bound.** If the frame uses variables, bind to the variable that holds the right
  value. Copy it from a layer that already has it:

  ```js
  const good = await figma.getNodeByIdAsync('GOOD_ID');   // a layer with the right gap
  const bad = await figma.getNodeByIdAsync('BAD_ID');
  const v = good.boundVariables?.itemSpacing;
  if (v) bad.setBoundVariable('itemSpacing', await figma.variables.getVariableByIdAsync(v.id));
  else bad.itemSpacing = good.itemSpacing;
  ```

  Paints: `figma.variables.setBoundVariableForPaint(paint, 'color', variable)` returns a new paint;
  reassign the `fills` array. Or copy the whole fill: `bad.fills = good.fills`.
- **Styles stay styles.** A colour fix on text with a style: `await t.setFillStyleIdAsync(id)` with a
  colour style the file already has. A size fix: the text style one step up or down the scale
  (`await t.setTextStyleIdAsync(id)`), never a raw size on a styled text.
- **Raw values stay raw** in a design without variables or styles; then use the most common nearby
  value from `system` (23 → 24, `#343434` → `#333333`).
- **Text edits:** `await figma.loadFontAsync(t.fontName)` first (for mixed fonts, load each of
  `t.getRangeAllFontNames(0, t.characters.length)`). Polish does not change `characters`.
- **Components:** fix an instance by swapping to another variant of the same set
  (`instance.setProperties({ State: 'Default' })`) or by resetting an accidental override
  (`instance.resetOverrides()` only when every override on it is the slip). Never detach.
- **Alignment:** inside auto layout, fix the parent's padding or alignment, not the child's x. Outside
  auto layout, move the block to the existing edge. Never convert a section to auto layout in Polish.
- **Contrast on a photograph:** in Polish, use what the design already has: a scrim or overlay it uses
  elsewhere, its own darker text colour, or move the text to a calmer part of the picture.

## 3. Re-layout

Same content, same styles, same components; a better arrangement for the sections judged Rework.

- Plan first in the notes: the section's job, what is wrong with its shape, the new shape in one line
  ("image left 7 columns, text right 5, action under the text instead of centred below").
- Build on the frame's own grid (`system.grid`): widths on column spans, edges on column lines.
  Auto layout for the new structure is fine; keep layer names and the content layers themselves (move
  them, do not recreate them) so `compare.figma.js` can follow them.
- Change only the chosen sections. `KEEP` in `compare.figma.js` lists every other section.
- Check the section's height and the frame's height after the change; sections below should only
  move, never change.

## 4. Reference

One to three alternatives for one section, side by side, from the file's own material.

- **Where:** new frames named `Ref/<Section> · A`, `· B`, `· C`, each the width of the original
  frame, placed at the section's y, to the right of the original (and of the copy, when one exists),
  200px apart. On a page that has many frames, put them in a Figma section named `Ref/<Section>`.
- **Material:** the file's text styles, colour styles or variables, components (create instances of the
  components listed in `system.components`), the grid and spacing values from `system`. The section's
  real copy and pictures (copy image fills by `imageHash` from the original's layers). Content the new
  composition needs and the original lacks is realistic dummy in the page's language, marked
  (`Dummy` annotation and ` · dummy` name suffix).
- **Composition:** each option a different shape, chosen for the section's job (examples: split 7/5
  with one dominant picture; a stacked editorial block with a large statement; an index list; a
  sticky title with a scrolling list; a gallery wall; a single full-bleed picture with overlaid text).
  With the `figma-taste` skill installed, take shapes from its `references/compositions.md` (or let its
  `deal.mjs` pick one non-default composition per option); use only its composition recipes, not its
  fonts, palette or house rules.
- **Description:** one line per option: what changes and why it serves the job better. The user
  compares ideas, not pixels.
- **After the pick:** move the chosen arrangement into the copy (`· relayout`) in place of the section
  (Re-layout rules, `compare.figma.js`), and leave the `Ref/` frames for the user to delete.

## 5. Annotate

Every changed layer gets one `Review:` note: what changed and why, in one line ("gap 23 → 24 like the
other rows", "caption `#BBBBBB` → `#666666`: 1.9:1 → 5.7:1"). Use `annotate.figma.js` with all notes in
one call; `CLEAR = true` removes them once the user has accepted the copy.

## 6. Verify

1. `compare.figma.js`: `ORIGINAL_ID`, `COPY_ID`, `KEEP`, `BUDGET`. `verdict: OK`; every Keep section
   `untouched`; `missingKeep` empty (a misspelt section name is caught there); `share` within the budget
   or explained.
2. `inspect.figma.js` on the copy: the confirmed findings you fixed are gone, no new `major`.
3. Screenshots of the original and the copy side by side. The copy must look at least as good in every
   section. Undo anything that measures better and looks worse.
