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
Font sizes whose 2560 value is below the 15px floor (Figma px < 11.25) lock to 15px.
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
    if font:
        max_px = max(max_px, min_px)  # tiny text: the 15px floor wins, the size locks at 15px
    return f"clamp({fmt(min_px / BASE_REM)}rem, {fmt(px / (SOURCE / 100))}vw, {fmt(max_px / BASE_REM)}rem)"


def usage(error=None):
    if error:
        print(f"error: {error}", file=sys.stderr)
    print(__doc__, file=sys.stderr if error else sys.stdout)
    return 2


def main(argv):
    args = argv[1:]
    if not args:
        return usage()
    v4, font = "--v4" in args, "--font" in args
    prefix = None
    if "--class" in args:
        i = args.index("--class")
        if i + 1 >= len(args) or args[i + 1].startswith("--"):
            return usage("--class needs a PREFIX, e.g. --class 'flex-[0_1_'")
        prefix = args[i + 1]
        del args[i:i + 2]
    unknown = [a for a in args if a.startswith("--") and a not in ("--v4", "--font", "--default")]
    if unknown:
        return usage(f"unknown option {unknown[0]}")

    if "--default" in args:
        groups = [("spacing", DEFAULT_SPACING, False), ("font", DEFAULT_FONT, True)]
    else:
        nums = []
        for a in args:
            if a.startswith("--"):
                continue
            try:
                nums.append(float(a))
            except ValueError:
                return usage(f"not a px value: {a}")
            if nums[-1] <= 0:
                return usage(f"px value must be positive: {a}")
        if not nums:
            return usage("give at least one px value, or --default")
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
