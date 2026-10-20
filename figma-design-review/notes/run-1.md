# figma-design-review · run 1

Review mode on a real page: a 1920 × 10640 company-profile landing page (a contractor; built earlier
with figma-taste and then scaled from 1440). File key not published. Read-only: nothing in the file was
changed.

## 1. An empty frame hid every section — P1
**Symptom:** `inspect` reported two sections, both named "Arunika Beranda", with 0 blocks each.
**Cause:** the root held an empty frame stacked over the real wrapper (same name, no children, no
fill). The "single wrapper" rule saw two children and stopped descending.
**Change:** empty layers (no children, no paint) are skipped when finding sections and reported as
`empty-layer`. Same in `compare`.
**Verify:** `inspect-real-shape.test.mjs` "descends past the empty stacked frame". Done.

## 2. Same-named sections mixed their counts — P1
**Symptom:** four sections named `sec`; the per-section table matched findings by name.
**Change:** findings carry `sectionId`; sections are labelled `sec #1` … in `inspect` and `compare`;
`KEEP` takes those labels.
**Verify:** "same-named sections keep their own counts", "same-named sections are told apart". Done.

## 3. Scaled design read as "no spacing base" — P2
**Symptom:** spacing 13, 19, 27, 29, 43, 213 … `spacingBase: null`, nothing said.
**Cause:** the page was a 1440 design scaled ×1.33; 99% of values are whole even numbers at 1440.
**Change:** `system.scaled` with factor, share, original width and examples from the frame; a `scaled`
finding; no off-scale noise.
**Verify:** "scaled ×1.33 from 1440 detected", "scaled examples come from the frame". Done.

## 4. Text on photos was always just "check" — P2
**Change:** translucent shades between text and photo are composited; the ratio over the lightest and
darkest pixel decides: fails everywhere → `contrast` major, fails only on light areas → `check` with
both numbers. On the real page 22 checks became 1.
**Verify:** hero lede (check), 171px title (passes), dark text under a 90% black shade (major). Done.

## 5. "420rb m²" collision not caught — P1
**Symptom:** visible in the screenshot: the superscript m² sits on the "b" of 420rb.
**Cause:** the 448px text sits in a fixed 404px frame and runs into the neighbouring `unit` frame.
**Change:** `overlap` (major) when text wider than its non-clipping frame hits a neighbour; otherwise
`overflow` (minor), grouped per section, with a note when the design is scaled.
**Verify:** "420rb runs into m²", "2009 sticks out with nothing next to it". Done.

## 6. Noise — P2
- Near-value findings were one per layer (one colour pair: 9 findings). Now one per pair with `ids`.
- Nav links, buttons and footer columns counted as separate left edges (hero: 21 "edges"). Items of a
  row of three or more, or hugging items, after the first no longer count. Hero now 6.
- A 157-character sentence at 69px was a "headline" major. Now `statement-lines`, minor.
Total on the page: 1 major, 41 minor, 22 checks → 1 major, 18 minor, 1 check.

## 7. Screenshots — P3
`get_screenshot` URLs could not be downloaded through the session proxy; `enableBase64Response`
worked. `node.screenshot()` in one `use_figma` call returned only some of several images. Documented
in SKILL step 1.

## Open
- A content-edge / implied grid (every section starts at 64 here, the frame has no layout grid) is not
  inferred; off-grid checks only run with a real layout grid.
- `compare`, `annotate` and the Polish snippets have not run in Figma yet (Review only, read-only).
