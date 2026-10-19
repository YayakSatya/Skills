# Critique

Judge only what the screenshot shows. A problem visible in the picture is real, whatever the layer
tree says.

## 0. The required short form (every round)

Answer these six in writing, with the node name for every "no":

1. Is the first screen readable in five seconds (what it is, what to do)?
2. Is the **lede** legible on the photograph, not only the headline? (A 0.5 scrim over a busy photo
   can still fail the body text.)
3. Does any headline run past two lines, at Desktop or Mobile?
4. Do neighbouring sections share a composition?
5. Is any image slot empty, or any dummy layer unmarked?
6. Does the Mobile wrapper's height make sense against the sum of its sections?

The fourteen passes and the score below are optional: use them for the final round of an important
page, or when the short form passes but the page still feels generic.

## 1. How to look

Take `get_screenshot` of each wrapper: Desktop at `maxDimension` 2400 (a 1920-wide page needs it to
read type), Mobile at 1600. For a long page, also screenshot the first screen alone (the Hero section
node). Look at the Desktop first, then compare Mobile against it. With several design options,
screenshot each option's Desktop and compare ideas, not pixels.

## 2. Fourteen passes

1. **Five seconds.** Cover everything below the first screen. Can a stranger say what this is and
   what to do? Name the headline, the sentence, the action.
2. **The idea.** Is the idea sentence visible on the page, or only in your notes? Would the nearest
   competitor's logo fit on this page unchanged?
3. **Hierarchy.** One dominant thing per screen. Squint: what is the first, second, third thing you
   see? If the answer is "the button" or "a card", it is wrong.
4. **Type.** Two or three sizes doing the work, the big one big enough (largest type ≈ 8–10vw on
   Desktop, roughly 150–190px at 1920), body readable, headlines ≤ 2 lines at every width, no orphans
   in the headline.
5. **Frame and grid.** Equal outer margins everywhere (the grid's 60). Columns start and end on the
   layout grid's lines (turn the grid on in the screenshot if in doubt). Text blocks share two or three
   left edges. No section huddled on one side with the other half empty.
6. **Rhythm.** Do neighbouring sections look different? Is the gap between sections clearly larger
   than gaps inside them? Is there exactly one rest at most?
7. **Fullness.** Each section delivers its full content. No screen is mostly empty ground.
8. **Imagery.** Real photographs, one family, chosen crops, the hero image large. No grey boxes left.
9. **Colour.** One ground, one ink, one accent; accent only on the action and maybe one other thing.
   Running text in full ink.
10. **Tells.** Eyebrows, pill badges, index numbers, monospace captions, hairlines, cards with icons,
    gradients, shadows, glow, centred-everything. Any one costs points.
11. **Components.** Buttons decided once (square or round), nav plain, footer a designed close.
12. **Mobile.** Is the phone version its own composition, or the desktop squeezed? Tap targets ≥ 44.
13. **Craft.** Clipped text, overlapping layers, widows, misaligned baselines, a caption jammed against
    an image edge, inconsistent gaps that tokens should have made equal.
14. **The file.** Open the layers panel in your head: does the audit pass, are the names semantic,
    is every repeated thing an instance? A beautiful screenshot from a messy file fails this skill.

## 3. Score

Score each 1–10, then weight:

| Area | Weight | Passes |
| --- | --- | --- |
| Design (composition, hierarchy, type, colour) | 40% | 3, 4, 5, 6, 9 |
| Idea and content | 25% | 1, 2, 7 |
| Imagery | 15% | 8 |
| Craft and responsiveness | 10% | 11, 12, 13 |
| File quality | 10% | 14 |

Caps (the final score cannot exceed):
- 5 if the first screen fails the five-second test.
- 6 if any audit FAIL remains.
- 6 if the page has fewer than four real photographs (marketing pages).
- 6 if any dummy layer is unmarked or uses a real company or person name.
- 7 if two neighbouring sections look the same.
- 7 if the idea sentence does not survive the competitor test.

## 4. Write it down

```
ROUND n — Desktop / Mobile
Score: design x, idea x, imagery x, craft x, file x → weighted x.x (cap: …)
Top problems (biggest effect first):
  1. …what, where (node name), the fix
  2. …
  3. …
Kept: what works and must not regress.
```

Fix the top three with targeted `use_figma` calls (edit nodes by ID, do not rebuild sections), then
screenshot again. Three rounds at most; report what still falls short honestly.
