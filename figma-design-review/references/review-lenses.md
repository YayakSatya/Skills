# How to look

Judge what the screenshot shows against what the page is for. The standard is the design's own
intent and system, not a taste you bring. A good review is specific in both directions: "the hero
works because the photograph and the one-line promise carry it" is as useful as "the lede is 3:1 on
the photo".

## 1. Before the lenses

- Say what the page is for and the one thing a visitor should do. Every judgement below serves that.
- Read `system` from `inspect.figma.js`. Name the system in one line ("Inter only, 9 sizes from 14 to
  64, 8px spacing, 12-column grid at 80/24, one accent `#C2410C`"). A finding is a departure from this,
  not from your preferences.
- Look at the whole page small first (rhythm, balance, where the eye lands), then each section large.

## 2. The lenses

For each section, go through these. Write only what you find, good or bad.

| Lens | Look for | Typical fix and mode |
| --- | --- | --- |
| **First screen** | In five seconds: what it is, for whom, what to do. One dominant thing. | Bigger or shorter headline, action above the fold (Polish); a different hero composition (Reference). |
| **Hierarchy** | Squint: first, second, third thing. Is the order the page's argument? Two things fighting for first? | Step one element down the scale, give the main one room (Polish); reorder blocks (Re-layout). |
| **Alignment and grid** | Shared left edges; blocks on the column lines; nothing a few px off. | Snap to the existing edge or column (Polish). |
| **Spacing rhythm** | Gaps inside a group smaller than between groups; section padding consistent; one or two values doing the work. | Use the system's values (Polish); regroup (Re-layout). |
| **Type** | Sizes from one scale; headlines ≤ 2–3 lines; body 60–80 characters per line; no orphan words in headlines. | Size to the nearest scale step, narrow the text box (Polish). |
| **Colour and contrast** | Running text readable; accent used for the action and little else; text on photos legible, the small text too. | An existing darker colour, a scrim the file already uses, move text off the bright area (Polish). |
| **Imagery** | Real pictures in every slot, one family and grade, chosen crops, faces and subjects not cut. | Re-crop (Polish); bigger dominant image (Re-layout). |
| **Consistency** | Same thing done the same way: buttons, cards, radii, icon sizes, link styles. | Swap to the same component or variant (Polish). |
| **Composition** | Each section has a job and a shape that serves it; neighbours do not repeat the same layout; no screen mostly empty or overcrowded. | Re-layout or Reference. |
| **Mobile** (when there is a phone frame) | Its own composition, not the desktop squeezed; tap targets ≥ 44; body ≥ 14–16px. | Polish; Re-layout for a squeezed section. |

## 3. Measured findings: confirm or dismiss

Every `inspect.figma.js` finding gets one of:

- **Confirmed**: visible or clearly a slip. It goes in the report with its fix.
- **Dismissed**, with the reason. Common legitimate reasons:
  - `near-edge` / `off-grid`: optical alignment (a quote mark hung outside the edge, a round shape set
    slightly in), a deliberate inset, a full-bleed or intentionally off-grid picture that the
    composition clearly wants.
  - `near-colour`: a deliberate tint (hover, a second surface) that the screenshot shows as distinct.
  - `near-size`: two text roles that should differ by more, which is a different finding (hierarchy).
  - `contrast` on disabled states, decorative text, or logos (WCAG exempts them).
  - `ragged`: a section that is a deliberate collage.
- **Check**: `text-on-image` always needs the screenshot; look at the smallest text over the busiest
  part of the picture.

Never pass a measured finding to the user as fact without the picture agreeing.

## 4. Verdicts

| Verdict | When | What happens |
| --- | --- | --- |
| **Keep** | The section does its job; at most cosmetic slips you would not fix. | Untouched in every mode. One line on why it works. |
| **Polish** | The composition works; slips in alignment, spacing, size, contrast, consistency. | Fixed on the copy within the Polish budget. |
| **Rework** | The layout does not do its job: hierarchy unclear, empty or overcrowded, repeats its neighbour, the action lost. | Re-layout on the copy, or Reference alternatives first when the right shape is not obvious. |

Be stingy with Rework. The user asked for help without changing much; a page with every section in
Rework is a page you have not tried to keep. If more than half the sections seem to need it, say so
plainly and ask whether they want a redesign (figma-taste) instead.

## 5. Priorities

Order the findings by effect on the page's job, not by count: first screen and the action; legibility;
hierarchy; alignment and rhythm; consistency; cosmetic. In the report, the top three are the ones to
fix even if nothing else is.
