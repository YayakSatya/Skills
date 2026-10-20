# Skills

Claude skills by Yayak Satya. One folder per skill at the repo root, each with its own `SKILL.md`.

| Skill | What it does |
| --- | --- |
| `figma-taste/` | Anti-slop design built directly on the Figma canvas (site-wide design system, flex layout on a 1920/12-column guide, composition deal, Unsplash, audit and token check). Actively developed: follow the rules below. |
| `figma-design-review/` | Reviews an existing Figma design against its own system (verdict per section: Keep, Polish, Rework), then polishes or re-lays out on a copy, or designs reference alternatives for a section. Never edits the original. Run `for t in figma-design-review/scripts/test/*.test.mjs; do node "$t"; done` after changing a script. |
| `figma-design-system-scan/` | Scans a Figma frame or page for reusable components and design tokens before any layout or code is generated. |
| `figma-scaling/` | Converts Figma px values into fluid `clamp()` values (1440 floor, 1920 baseline, 2560 ceiling) with tablet and mobile derived proportionally from a desktop-only design, for plain CSS and Tailwind v3/v4 (`references/tailwind.md`). `scripts/fluid_tokens.py` generates the values; run `scripts/test/test_fluid_tokens.py` after changing the script or any token table, and `scripts/test/check_layout.test.mjs` after changing `scripts/check_layout.mjs`. Field notes from test runs stay local (`figma-scaling/notes/` is git-ignored); what they changed goes in the CHANGELOG. |

## Developing figma-taste

The skill improves in rounds: a test run in a real project produces notes, and a development session
applies them.

### A round

1. The new notes are in `figma-taste/notes/run-<n>.md` (run 1 and run 2 are there as examples of the
   format: numbered sections, symptom, cause, change, **Verify**, priority P1/P2/P3).
2. Read `figma-taste/SKILL.md`, `figma-taste/CHANGELOG.md` and the notes before changing anything.
3. Work in the notes' priority order, one file at a time.
4. After **every** script change:
   ```bash
   node figma-taste/scripts/build-min.mjs                       # regenerates helpers.min and audit.min
   for t in figma-taste/scripts/test/*.test.mjs; do node "$t"; done
   ```
   All tests must pass. When a note has a **Verify** step that can run in Node, add it to a test in
   `scripts/test/` (the tests use a mock of the Figma Plugin API). When it can only run in Figma, add it
   to `scripts/selftest.figma.js`.
5. Add a dated entry at the top of `figma-taste/CHANGELOG.md`: what was verified here, what still needs
   verifying inside Figma, documentation changes, open items. Refer to the notes' section numbers.
6. Commit with the prefix `figma-taste: …`. The user creates the release tag (`figma-taste-v<N>`) on
   GitHub.

### Rules

- **No downgrade.** Every audit rule, check and output that passed before must still pass. A default,
  token or helper may be replaced only when the same result is produced in a better place, and a test
  proves it. If a change cannot meet this, keep the old behaviour and write down why in the CHANGELOG.
- **Public helper names never change** (`stack`, `add`, `section`, `txt`, `inst`, `row`, `grid`, `cell`,
  `spanTo`, `component`, `textProp`, `toColumn`, `scrim`, `columnGrid`, `dummy`, …). Build calls in
  other projects paste them. Add new behaviour next to the old; keep old option names as aliases.
- **Never edit `helpers.min.figma.js` or `audit.min.figma.js` by hand**: change the full file and run
  `build-min.mjs`. The audit test checks that the full and min audits return identical results.
- A single `deal.mjs` run with the same arguments must keep giving the same result unless a note asks
  for a change.
- Be honest in the CHANGELOG about what ran only against the mock and what was verified in Figma.
- Figma-side code follows the Figma MCP `figma-use` rules: return node IDs, load fonts before any text
  edit, colours 0–1, append before setting FILL/HUG, resize before hug.
- This repo is **public**: never commit Figma file keys, tokens, client data or credentials. Write
  "(file key not published)" in notes instead.

### House standards the skill encodes (from the user)

- Desktop frame 1920, 12 columns, stretch, margin 60, gutter 30, grid `#FF0000` at 10%.
- Desktop and Mobile by default; Tablet only when a PRD asks. Mobile 390 · 4 · 20/16 and Tablet
  768 · 8 · 40/24 are proposals until the user confirms them.
- Dummy-filled content by default, every dummy layer marked; one design option by default.

### Layout of figma-taste

- `SKILL.md`: the run (steps 1–10), house rules, files table.
- `references/`: design system, auto layout, compositions, house rules, imagery, references, critique.
- `scripts/`: `*.figma.js` run inside Figma via `use_figma`; `*.mjs` run in Node 18+ with no dependencies.
- `scripts/test/`: Node regression tests (mock Figma API).
- `notes/`: run notes, one file per test run.
