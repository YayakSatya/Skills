#!/usr/bin/env python3
"""Compute figma-scaling clamp() values and print them as Tailwind tokens.

Usage:
    python3 fluid_tokens.py <figma_px> [<figma_px> ...] [--font] [--v4] [--class PREFIX]
    python3 fluid_tokens.py --default [--v4]      # the standard token set (Section 1 of SKILL.md)

    --font          apply FONT_FLOOR_PX (15px) to the minimum (font-size only)
    --v4            print Tailwind v4 @theme lines instead of v3 config entries
    --class PREFIX  print a ready arbitrary-value class instead, e.g. --class flex-[0_1_
                    (top-level spaces already replaced by "_")

Model (same as the figma-scaling skill): SOURCE_FRAME 1920, TARGET_FRAME 1440 (floor),
MAX_FRAME 2560 (ceiling), 16px rem base, minimum rounded to the nearest 0.5px.
"""

import sys

SOURCE, TARGET, MAX = 1920, 1440, 2560
BASE_REM, STEP, FONT_FLOOR = 16, 0.5, 15

DEFAULT_SPACING = [4, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 120, 160]
DEFAULT_FONT = [12, 16, 18, 20, 24, 28, 32, 40, 48, 64]


def fmt(x):
    """4 decimals like the token table, but keep exact 5-decimal rems such as 0.46875."""
    exact5 = abs(x * 1e5 - round(x * 1e5)) < 1e-6 and abs(x * 1e4 - round(x * 1e4)) > 1e-6
    s = f"{x:.5f}" if exact5 else f"{x:.4f}"
    return s.rstrip("0").rstrip(".")


def clamp(px, font=False):
    min_px = int(px * TARGET / SOURCE / STEP + 0.5) * STEP  # round half up to 0.5px
    if font:
        min_px = max(min_px, FONT_FLOOR)
    max_px = px * MAX / SOURCE
    min_px = min(min_px, max_px)  # a floor can never exceed the ceiling
    return f"clamp({fmt(min_px / BASE_REM)}rem, {fmt(px / (SOURCE / 100))}vw, {fmt(max_px / BASE_REM)}rem)"


def main(argv):
    args = argv[1:]
    if not args:
        print(__doc__)
        return 2
    v4, font = "--v4" in args, "--font" in args
    prefix = None
    if "--class" in args:
        i = args.index("--class")
        prefix = args[i + 1]
        del args[i:i + 2]

    if "--default" in args:
        groups = [("spacing", DEFAULT_SPACING, False), ("font", DEFAULT_FONT, True)]
    else:
        nums = [float(a) for a in args if not a.startswith("--")]
        groups = [("font" if font else "spacing", nums, font)]

    for kind, values, is_font in groups:
        for v in values:
            name = f"fluid-{v:g}"
            value = clamp(v, is_font)
            if prefix:
                print(f"{prefix}{value.replace(', ', ',')}]")
            elif v4:
                ns = "--text" if kind == "font" else "--spacing"
                print(f"  {ns}-{name}: {value};  /* {v:g}px */")
            else:
                print(f"  '{name}': '{value}',  // {v:g}px ({kind})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
