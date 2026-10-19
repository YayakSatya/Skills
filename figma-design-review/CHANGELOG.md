# figma-design-review changelog

## 1.0 — 2026-10-19

First version: review and lightly improve a design that already exists in Figma, keeping the
designer's own system.

### Added
- `SKILL.md`: four modes (Review, Polish, Re-layout, Reference) with a change budget each; ground rules
  (the original is never edited, the design's own system wins, the words stay, Keep sections untouched,
  every change annotated, measured versus seen).
- `scripts/inspect.figma.js` (read-only): learns the frame's grid, type, colours, spacing, radii, styles,
  variables and components; reports contrast, text on images, clipped text, empty image slots, long
  headlines, near-duplicate values, off-scale spacing, near and ragged left edges, off-grid blocks,
  line length, tiny text and phone tap sizes; per-section table with a measured hint.
- `scripts/compare.figma.js` (read-only): every change between original and copy by section, Keep
  violations, misspelt Keep names, share of layers touched against the mode's budget.
- `scripts/annotate.figma.js`: `Review:` annotations; clearing removes only these.
- `references/review-lenses.md`, `references/editing.md`, `assets/review-template.md`.

### Verified here (Node, mock Plugin API: 38 checks)
- `inspect`: on a 1440 page with planted slips it finds each one (23 vs 24 gap, radius 13 vs 12,
  `#343434` vs `#333333`, 15 vs 16px, a 3px edge, `#BBBBBB` caption at 1.9:1, empty image, clipped
  quote, off-grid picture, 160-character lines) and stays quiet on what is fine (white on `#111111`,
  text inside cards, ragged-right text ends, 14px captions next to 16px body). Read-only.
- `compare`: an untouched, renamed and moved copy shows zero changes; a four-fix Polish stays inside
  Features and under budget; an edit in a Keep section fails the verdict; a misspelt Keep name is
  reported; added layers are counted per section.
- `annotate`: no duplicate notes on re-run; other people's annotations kept; clear removes only ours.

### Still to verify inside Figma
- All three scripts ran only against the mock. Run `inspect` and `compare` on a real file first
  (expected differences: `absoluteBoundingBox` on rotated layers, `getStyledTextSegments` on text with
  mixed fills, instance children identity).
- The duplicate and edit snippets in `references/editing.md`.

### Open
- No `selftest.figma.js` yet; add one after the first real run shows which API behaviours matter.
- Mobile-specific checks are light (small body text, tap size); a run on a real phone frame should say
  what else to measure.
