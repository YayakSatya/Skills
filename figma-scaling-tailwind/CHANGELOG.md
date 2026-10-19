# Changelog — figma-scaling-tailwind

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
