# Adopting live reference websites

The user will give you live sites to learn from. The goal is to adopt their **system** (proportions,
rhythm, type behaviour, image treatment, density) so the new design sits at their level, while the
content, brand assets and identity remain the client's own.

## 1. Extract

```bash
node <skill>/scripts/ref-extract.mjs https://ref-one.com https://ref-two.com [--max-css 12]
```

For each URL it fetches the HTML and its stylesheets and writes `.figma-taste/refs/<host>.json` and
a readable `.figma-taste/refs/<host>.md` with:

- CSS custom properties (the site's own tokens, if it has them)
- colour frequency (hex/rgb/hsl/oklch), the likely ground, ink and accent
- font families declared and loaded (`@font-face`, Google Fonts links)
- font sizes by frequency, including `clamp()` and `vw` values (the type scale)
- border-radius values (square, soft or pill)
- gaps, paddings and `max-width` containers (the grid and margins)
- the page outline: headings in order and the number of sections

Single-page apps that inject CSS at runtime give thin results; say so and rely more on screenshots.
If the shell has no network, use WebFetch on each URL and read what it returns.

## 2. Look

Open each site with WebFetch for its content structure. If a browser tool is available (Claude in
Chrome or the built-in browser), take screenshots at desktop and phone width and look at them; that
is where rhythm, crops and density show. Optionally capture a page into Figma with the Figma
capture tool when available, as a visual reference only, on its own page named `_reference`,
**never** inside the deliverable, and delete it before finishing.

## 3. Write the reference sheet

In your notes, one block per site:

```
REF: ref-one.com
Adopt:
  type      one grotesk family, display ≈ 9vw, body 17px, ratio ≈ 8:1, tight tracking
  grid      12 cols, 24px margins, sections ≈ 200px apart, text blocks on 2 left edges
  images    full-bleed, square corners, warm grade, one image per screen
  rhythm    alternates full-bleed photo / text-only sections, footer name at full width
  colour    off-white ground, near-black ink, accent used only on the action
Do not take:
  logo, wordmark, copy, photographs, exact brand colours, its signature illustration
```

Then merge the sites into one decision:

- When references agree, adopt it.
- When they disagree, pick by the client's subject and audience and write one line why.
- Map the result onto the design-system variables (palette ramps, type sizes per mode, section gap,
  radius set) before building. References are usually measured at 1440: ref-extract prints `vw` and
  `clamp()` sizes in px at 1440 and 390; multiply Desktop values by 1920/1440 for this canvas. The
  margins and gutter stay the house grid (60 / 30) whatever the reference uses; adopt its density and
  rhythm, not its grid numbers. The dealt direction yields to the reference sheet on
  type and palette (`--keep type,palette`); it still supplies the composition.

## What may be adopted, what may not

| Adopt freely | Do not copy |
| --- | --- |
| Type scale ratios, sizes, tracking, leading | Logos, wordmarks, brand marks |
| Grid, margins, section spacing, density | Copy, slogans, product names |
| How sections alternate, the page's rhythm | Photographs and illustrations |
| Image treatment (crop family, corners, grade) | A distinctive layout so exact it reads as a clone |
| Component behaviour (nav shape, button shape) | Proprietary fonts the client has no licence for |
| General palette proportions (ground/ink/accent) | The reference's exact brand palette, unless the user says so |

If a reference uses a commercial typeface, choose the closest available family in Figma
(`listAvailableFontsAsync`) and name the substitution in the report.

## Where references and house rules collide

Gallery sites often use monospace captions, index numbers, hairline grids and eyebrows. These are
banned here anyway: adopt the reference's proportions and keep the house rules. If the user
explicitly wants a banned device because a reference has it, do it, mark the layer name with the
exception and note it in the report.
