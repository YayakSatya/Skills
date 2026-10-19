# Changelog — figma-scaling-tailwind

- **1.3** (2026-10-19) — Review fixes:
  - **Line height**: `text-fluid-*` tokens set font-size only, unlike Tailwind's built-in `text-*`. New Section 1 subsection: pair every fluid text with a unitless leading (`leading-*`, the `text-fluid-32/tight` shorthand, or baked in with a v3 tuple / v4 `--text-*--line-height`). Workflow step 9 and a checklist item added. Both forms verified by compiling with Tailwind 3.4.17 and 4.1.11.
  - **Font floor for tiny text**: 1.2 capped MIN at MAX, so Figma text under 11.25px came out below 15px (10px → a constant 13.33px). The script now locks those sizes at 15px. Token tables unchanged (all default sizes are 12px and up).
  - **Tests**: `scripts/test/test_fluid_tokens.py` checks the script against the v3 and v4 tables in Section 1, the `figma-scaling` Section 3 table (15/15), the `--class` example, the font floor and spacing MIN ≤ MAX over 0.5–200px, and CLI errors. Runs in CI.
  - **Script CLI**: a non-numeric value, a non-positive value, an unknown option or `--class` without a prefix now exits 2 with a message instead of a traceback.
  - `px-fluid-*` output named per version (`padding-inline` in v4, `padding-left/right` in v3).
- **1.2** (2026-10-18) — Packaged as a skill, with corrections:
  - **Tailwind v4 namespaces**: font sizes must use `--text-*`; `--font-size-*` generates no `text-*` utility. Max widths use the documented `--container-*` namespace (`--max-width-*` also works in 4.1). Full v4 `@theme` block added.
  - **Flex reset direction**: the 1.1 example `flex flex-row lg:flex-col` + `lg:flex-none lg:w-full` stacked on desktop and kept the row on mobile. Replaced with a desktop-first `max-lg:` pattern and a mobile-first `lg:` pattern.
  - **Breakpoint table**: now shows that Tailwind prefixes are min-width while SCALING.md tiers are max-width, and the 1px boundary offset.
  - **Checklist contradiction removed**: 1.1 Section 6 said the negative prefix works with clamp(), but the checklist forbade it. The checklist now matches Section 6.
  - `max-*` variants exist since Tailwind v3.2 (1.1 said v3.4).
  - 377px example minimum follows the formula's 0.5px rounding: `17.6875rem` (1.1 had the unrounded `17.6718rem`).
  - Verified by compiling with Tailwind 3.4.17 and 4.1.11: negative prefix on clamp tokens and arbitrary values, `max-md:`/`max-lg:`, underscore rule (a spaced arbitrary class is not generated), v4 namespaces.
  - Added `scripts/fluid_tokens.py` so agents generate clamp values instead of computing them by hand; output verified against the figma-scaling Section 3 table (15/15 match).
  - Added lateral padding tiers in Tailwind, v4 `@source` / class-detection notes, and a 360px check.
- **1.1** (2026-09-13) — Added Next.js notes: TS config location, App Router content globs, viewport zoom, `next/font` vs root font-size.
- **1.0** (2026-09-13) — Initial Tailwind adaptation of SCALING.md v3.3.
