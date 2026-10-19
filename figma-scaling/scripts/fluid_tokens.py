#!/usr/bin/env python3
"""Compute figma-scaling clamp() values and print them as CSS custom properties or Tailwind tokens.

Usage:
    python3 fluid_tokens.py <figma_px> [<figma_px> ...] [--font] [--css | --v4 | --class PREFIX]
    python3 fluid_tokens.py --default [--css | --v4]   # the standard token set (SKILL.md Section 3)

    (no format)     Tailwind v3 config entries
    --font          font-size: 15px floor, text curve for mobile
    --size          element size (column width, icon, image, button): desktop model only, no
                    mobile curve; default is spacing (padding, margin, gap)
    --css           plain CSS custom properties in a :root block (--spacing-fluid-N, --text-fluid-N)
    --v4            Tailwind v4 @theme lines (same names as --css)
    --class PREFIX  print a ready arbitrary-value class instead, e.g. --class flex-[0_1_
                    (top-level spaces already replaced by "_")

Model (SKILL.md Section 2): SOURCE_FRAME 1920, TARGET_FRAME 1440, MAX_FRAME 2560, 16px rem base.
1440 and up: value(w) = px * w / 1920, between the 1440 value (rounded to 0.5px) and the 2560 value.
Below 1440 (spacing and font, not --size): a straight line from the derived mobile value at
MOBILE_FRAME 390 up to the 1440 value, extended down to MOBILE_MIN_FRAME 360. The mobile value is
CURVE_BASE * (px / CURVE_BASE) ** exponent (spacing 0.6, font 0.5), rounded to 0.5px, never above
the 1440 value and never under a quarter of the desktop value. The line is capped at the 1440 value,
so from 1440 up every value is exactly the three-point one. Small values (spacing up to 32px, font up to 24px) keep the 1440 value below 1440.
Font sizes never go below FONT_FLOOR 15px.
"""

import sys

SOURCE, TARGET, MAX = 1920, 1440, 2560
BASE_REM, STEP, FONT_FLOOR = 16, 0.5, 15
MOBILE, MOBILE_MIN = 390, 360
CURVE_BASE, SPACE_EXP, FONT_EXP = 16, 0.6, 0.5
MOBILE_SHARE_MIN = 0.25  # the phone value is never under a quarter of the desktop value

DEFAULT_SPACING = [4, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 120, 160]
DEFAULT_FONT = [12, 16, 18, 20, 24, 28, 32, 40, 48, 64]


def fmt(x):
    """4 decimals like the token table, but keep exact 5-decimal rems such as 0.46875."""
    exact5 = abs(x * 1e5 - round(x * 1e5)) < 1e-6 and abs(x * 1e4 - round(x * 1e4)) > 1e-6
    s = f"{x:.5f}" if exact5 else f"{x:.4f}"
    return s.rstrip("0").rstrip(".")


def half(x):
    return int(x / STEP + 0.5) * STEP  # round half up to 0.5px


def model(px, font=False, size=False):
    """The numbers behind clamp(): desktop (laptop_px, vw, max_px) and, when the mobile line
    applies, (mobile_px, low_px, slope px per viewport px, intercept px). Mobile parts are None
    when the value keeps its 1440 value below 1440."""
    laptop = half(px * TARGET / SOURCE)
    if font:
        laptop = max(laptop, FONT_FLOOR)
    max_px = px * MAX / SOURCE
    if font:
        max_px = max(max_px, laptop)  # tiny text: the 15px floor wins, the size locks at 15px
    m = {"laptop": laptop, "vw": px / (SOURCE / 100), "max": max_px, "mobile": None}
    if size:
        return m
    mobile = half(CURVE_BASE * (px / CURVE_BASE) ** (FONT_EXP if font else SPACE_EXP))
    if font:
        mobile = max(mobile, FONT_FLOOR)
    mobile = max(mobile, half(px * MOBILE_SHARE_MIN))  # huge numerals: keeps the line flatter than desktop
    mobile = min(mobile, laptop)
    if mobile >= laptop:
        return m
    slope = (laptop - mobile) / (TARGET - MOBILE)
    intercept = mobile - slope * MOBILE
    low = intercept + slope * MOBILE_MIN
    if font:
        low = max(low, FONT_FLOOR)
    m.update(mobile=mobile, low=low, slope=slope, intercept=intercept)
    return m


def value_at(px, width, font=False, size=False):
    """What the browser computes for clamp(px) at a viewport width (no scrollbar)."""
    m = model(px, font, size)
    desktop = width * m["vw"] / 100
    if m["mobile"] is None:
        return max(m["laptop"], min(desktop, m["max"]))
    line = min(m["intercept"] + m["slope"] * width, m["laptop"])
    return max(m["low"], min(max(line, desktop), m["max"]))


def clamp(px, font=False, size=False):
    m = model(px, font, size)
    hi = f"{fmt(m['max'] / BASE_REM)}rem"
    desktop = f"{fmt(m['vw'])}vw"
    if m["mobile"] is None:
        return f"clamp({fmt(m['laptop'] / BASE_REM)}rem, {desktop}, {hi})"
    if m["intercept"] >= 0:
        line = f"{fmt(m['intercept'] / BASE_REM)}rem + {fmt(m['slope'] * 100)}vw"
    else:
        line = f"{fmt(m['slope'] * 100)}vw - {fmt(-m['intercept'] / BASE_REM)}rem"
    laptop = f"{fmt(m['laptop'] / BASE_REM)}rem"
    return f"clamp({fmt(m['low'] / BASE_REM)}rem, max(min({line}, {laptop}), {desktop}), {hi})"


def usage(error=None):
    if error:
        print(f"error: {error}", file=sys.stderr)
    print(__doc__, file=sys.stderr if error else sys.stdout)
    return 2


def main(argv):
    args = argv[1:]
    if not args:
        return usage()
    v4, css, font, size = "--v4" in args, "--css" in args, "--font" in args, "--size" in args
    prefix = None
    if "--class" in args:
        i = args.index("--class")
        if i + 1 >= len(args) or args[i + 1].startswith("--"):
            return usage("--class needs a PREFIX, e.g. --class 'flex-[0_1_'")
        prefix = args[i + 1]
        del args[i:i + 2]
    unknown = [a for a in args if a.startswith("--") and a not in ("--css", "--v4", "--font", "--size", "--default")]
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
        groups = [("font" if font else "size" if size else "spacing", nums, font)]
    if sum((v4, css, prefix is not None)) > 1:
        return usage("pick one output format: --css, --v4 or --class")
    if size and (font or "--default" in args):
        return usage("--size is for element sizes; it does not combine with --font or --default")

    if css:
        print(":root {")

    for kind, values, is_font in groups:
        for v in values:
            name = f"fluid-{v:g}"
            value = clamp(v, is_font, kind == "size")
            if prefix:
                cls = value.replace(", ", ",").replace(" + ", "_+_").replace(" - ", "_-_")
                print(f"{prefix}{cls}]")
            elif v4 or css:
                ns = {"font": "--text", "spacing": "--spacing", "size": "--size"}[kind]
                print(f"  {ns}-{name}: {value};  /* {v:g}px */")
            else:
                print(f"  '{name}': '{value}',  // {v:g}px ({kind})")
    if css:
        print("}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
