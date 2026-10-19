# Skills

Claude skills by Yayak Satya. Each folder at the root is one skill with its own `SKILL.md`.

| Skill | What it does |
| --- | --- |
| [`figma-taste/`](figma-taste/) | Anti-slop design built directly on the Figma canvas: a site-wide design system, flex layout on a 1920 / 12-column guide, dealt compositions, Unsplash imagery, and an in-canvas audit and token check. See its [CHANGELOG](figma-taste/CHANGELOG.md). |
| [`figma-design-system-scan/`](figma-design-system-scan/) | Scans a Figma frame or page for reusable components and design tokens before any layout or code is generated. |
| [`figma-scaling/`](figma-scaling/) | Converts Figma px values into fluid `clamp()` values (1440 floor, 1920 baseline, 2560 ceiling), with tablet and mobile derived proportionally from a desktop-only design, for plain CSS and Tailwind v3/v4 (`references/tailwind.md`). Includes `scripts/fluid_tokens.py`. See its [CHANGELOG](figma-scaling/CHANGELOG.md). |

## Install

Copy a skill folder into your skills directory, for example `~/.claude/skills/figma-taste/`, or into a
project's `.claude/skills/`.

## Development

`figma-taste` scripts run in Node 18+ with no dependencies:

```bash
node figma-taste/scripts/build-min.mjs
for t in figma-taste/scripts/test/*.test.mjs; do node "$t"; done
```

`figma-scaling`'s token script has standard-library tests (Python 3.9+) that keep it in sync with
the tables in `SKILL.md` and `references/tailwind.md`:

```bash
python3 figma-scaling/scripts/test/test_fluid_tokens.py
node figma-scaling/scripts/test/check_layout.test.mjs     # Node 22+ and Chrome
```

To check a sliced page at real screen sizes (line counts, overlap, first screen, tap targets):
`node figma-scaling/scripts/check_layout.mjs <url> --screens`.

CI runs these commands on every push and pull request that touches the skill. Releases are tagged `figma-taste-v<N>`.
Contributor rules are in [CLAUDE.md](CLAUDE.md).
