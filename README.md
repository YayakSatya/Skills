# Skills

Claude skills by Yayak Satya. Each folder at the root is one skill with its own `SKILL.md`.

| Skill | What it does |
| --- | --- |
| [`figma-taste/`](figma-taste/) | Anti-slop design built directly on the Figma canvas: a site-wide design system, flex layout on a 1920 / 12-column guide, dealt compositions, Unsplash imagery, and an in-canvas audit and token check. See its [CHANGELOG](figma-taste/CHANGELOG.md). |
| [`figma-design-system-scan/`](figma-design-system-scan/) | Scans a Figma frame or page for reusable components and design tokens before any layout or code is generated. |
| [`figma-scaling/`](figma-scaling/) | Converts Figma px values into fluid CSS `clamp()` values (1440 floor, 1920 baseline, 2560 ceiling) plus tablet/mobile rules. See its [CHANGELOG](figma-scaling/CHANGELOG.md). |
| [`figma-scaling-tailwind/`](figma-scaling-tailwind/) | The figma-scaling model for Next.js + Tailwind (v3 config or v4 `@theme`): named `fluid-*` tokens, arbitrary clamp classes, flex resets, `max-md:`/`max-lg:` overrides. Includes `scripts/fluid_tokens.py`. See its [CHANGELOG](figma-scaling-tailwind/CHANGELOG.md). |

## Install

Copy a skill folder into your skills directory, for example `~/.claude/skills/figma-taste/`, or into a
project's `.claude/skills/`.

## Development

`figma-taste` scripts run in Node 18+ with no dependencies:

```bash
node figma-taste/scripts/build-min.mjs
for t in figma-taste/scripts/test/*.test.mjs; do node "$t"; done
```

CI runs the same commands on every push and pull request. Releases are tagged `figma-taste-v<N>`.
Contributor rules are in [CLAUDE.md](CLAUDE.md).
