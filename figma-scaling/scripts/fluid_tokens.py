#!/usr/bin/env python3
"""Compute figma-scaling clamp() values and print them as CSS custom properties or Tailwind tokens.

Usage:
    python3 fluid_tokens.py <figma_px> [<figma_px> ...] [KIND] [--mobile PX] [--min-ratio R]
                            [--css | --v4 | --class PREFIX]
    python3 fluid_tokens.py --default [--css | --v4]   # the standard token set (SKILL.md Section 3)
    python3 fluid_tokens.py --measure WIDTH FONT [--class PREFIX]
                    # a text block's width in em from Figma: heading max-width, paragraph measure
                    # (SKILL.md Section 8, "Text-block widths"), e.g. --measure 570 24 -> 23.75em

  KIND (SKILL.md Section 11, step 1), default spacing (padding, margin, gap):
    --font [ROLE]   font-size, text curve for mobile. ROLE sets the floor, never above the Figma
                    value: body 16, ui 14, caption 12. Without ROLE: the 15px floor.
    --grid          grid-bound size: column and card widths, page margin, gutters, section
                    heights and everything positioned inside a composed box. Proportional from
                    1024 up (px * w / 1920), so a desktop row always fits between 1024 and 1440.
    --size          physical size: icon, avatar, button, tap target. Holds its 1440 value below
                    1440.

  Options:
    --mobile PX     the phone value at 390 from the design (a Figma mobile frame or a "Mobile"
                    variable mode) instead of the derived one; one value only
    --min-ratio R   with --font and several values: on phones, each size stays at least R times
                    the next smaller one (never more than their desktop ratio), e.g. 1.15

  Output (default: Tailwind v3 config entries):
    --css           plain CSS custom properties in a :root block
    --v4            Tailwind v4 @theme lines (same names as --css). Spacing --spacing-fluid-N,
                    font --text-fluid-N, grid --spacing-grid-N, size --spacing-size-N: the
                    --spacing-* namespace feeds w-, h-, size-, inset/top-, max-w-, p-, m-, gap-.
    --class PREFIX  a ready arbitrary-value class, e.g. --class flex-[0_1_ (spaces written as "_")

Model (SKILL.md Section 2): SOURCE_FRAME 1920, TARGET_FRAME 1440, MAX_FRAME 2560, 16px rem base.
1440 and up: value(w) = px * w / 1920, between the 1440 value (rounded to 0.5px) and the 2560 value.
Below 1440 (spacing and font): a straight line from the mobile value at MOBILE_FRAME 390 to the
1440 value, extended down to MOBILE_MIN_FRAME 360. The derived mobile value is
CURVE_BASE * (px / CURVE_BASE) ** exponent (spacing 0.6, font 0.5), rounded to 0.5px, never above
the 1440 value and never under a quarter of the desktop value. The line is capped at the 1440 value,
so from 1440 up every value is exactly the three-point one. Small values (spacing up to 32px, font
up to 24px) keep the 1440 value below 1440. A --mobile value above the 1440 value is allowed (a
phone body size larger than the laptop one); the line then slopes down to the 1440 value.
"""

import sys

SOURCE, TARGET, MAX = 1920, 1440, 2560
BASE_REM, STEP, FONT_FLOOR = 16, 0.5, 15
FONT_ROLE_FLOOR = {"body": 16, "ui": 14, "caption": 12}
MOBILE, MOBILE_MIN = 390, 360
GRID_FLOOR = 1024  # grid-bound sizes are proportional down to the tablet tier
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


def font_floor(px, role=None):
    return FONT_FLOOR if role is None else min(FONT_ROLE_FLOOR[role], px)


def derived_mobile(px, font=False, role=None):
    """The phone value at 390 the model derives from the desktop value (before the 1440 cap)."""
    mobile = half(CURVE_BASE * (px / CURVE_BASE) ** (FONT_EXP if font else SPACE_EXP))
    if font:
        mobile = max(mobile, font_floor(px, role))
    return max(mobile, half(px * MOBILE_SHARE_MIN))  # huge numerals: keeps the line flatter than desktop


def model(px, font=False, size=False, grid=False, role=None, mobile=None):
    """The numbers behind clamp(): desktop (laptop_px, vw, max_px) and, when the mobile line
    applies, (mobile_px, low_px, slope px per viewport px, intercept px). Mobile parts are None
    when the value keeps its 1440 value below 1440. For --grid, "laptop" is the 1024 value."""
    laptop = half(px * (GRID_FLOOR if grid else TARGET) / SOURCE)
    if font:
        laptop = max(laptop, font_floor(px, role))
    max_px = px * MAX / SOURCE
    if font:
        max_px = max(max_px, laptop)  # tiny text: the floor wins, the size locks at the floor
    m = {"laptop": laptop, "vw": px / (SOURCE / 100), "max": max_px, "mobile": None}
    if size or grid:
        return m
    if mobile is None:
        mobile = min(derived_mobile(px, font, role), laptop)
    if mobile == laptop:
        return m
    slope = (laptop - mobile) / (TARGET - MOBILE)
    intercept = mobile - slope * MOBILE
    low = intercept + slope * MOBILE_MIN if slope > 0 else laptop
    if font and slope > 0:
        low = max(low, min(font_floor(px, role), mobile))
    m.update(mobile=mobile, low=low, slope=slope, intercept=intercept)
    m["max"] = max(m["max"], intercept + slope * MOBILE_MIN)  # a large phone value is never capped
    return m


def value_at(px, width, font=False, size=False, grid=False, role=None, mobile=None):
    """What the browser computes for clamp(px) at a viewport width (no scrollbar)."""
    m = model(px, font, size, grid, role, mobile)
    desktop = width * m["vw"] / 100
    if m["mobile"] is None:
        return max(m["laptop"], min(desktop, m["max"]))
    line = m["intercept"] + m["slope"] * width
    if m["slope"] > 0:
        line = min(line, m["laptop"])
    return max(m["low"], min(max(line, desktop), m["max"]))


def clamp(px, font=False, size=False, grid=False, role=None, mobile=None):
    m = model(px, font, size, grid, role, mobile)
    hi = f"{fmt(m['max'] / BASE_REM)}rem"
    desktop = f"{fmt(m['vw'])}vw"
    if m["mobile"] is None:
        return f"clamp({fmt(m['laptop'] / BASE_REM)}rem, {desktop}, {hi})"
    a, b = m["intercept"] / BASE_REM, m["slope"] * 100
    if a >= 0 and b >= 0:
        line = f"{fmt(a)}rem + {fmt(b)}vw"
    elif a >= 0:
        line = f"{fmt(a)}rem - {fmt(-b)}vw"
    else:
        line = f"{fmt(b)}vw - {fmt(-a)}rem"
    laptop = f"{fmt(m['laptop'] / BASE_REM)}rem"
    if m["slope"] > 0:
        return f"clamp({fmt(m['low'] / BASE_REM)}rem, max(min({line}, {laptop}), {desktop}), {hi})"
    return f"clamp({laptop}, max({line}, {desktop}), {hi})"


def keep_ratio(values, ratio, role=None):
    """Phone values for a set of font sizes, raised so each stays at least `ratio` times the
    next smaller one (never more than their desktop ratio, never above its 1440 value)."""
    out, prev = {}, None
    for px in sorted(set(values)):
        laptop = model(px, font=True, role=role)["laptop"]
        mobile = min(derived_mobile(px, True, role), laptop)
        if prev is not None:
            want = out[prev] * min(ratio, px / prev)
            mobile = min(max(mobile, int(want / STEP + 0.999999) * STEP), laptop)  # round up
        out[px], prev = mobile, px
    return out


def usage(error=None):
    if error:
        print(f"error: {error}", file=sys.stderr)
    print(__doc__, file=sys.stderr if error else sys.stdout)
    return 2


def take(args, flag, convert, error):
    """Remove `flag VALUE` from args; return (value or None, error message or None)."""
    if flag not in args:
        return None, None
    i = args.index(flag)
    if i + 1 >= len(args) or args[i + 1].startswith("--"):
        return None, error
    try:
        value = convert(args[i + 1])
    except ValueError:
        return None, error
    del args[i:i + 2]
    return value, None


def measure(width, font_px):
    """A text block's Figma width in em, so it keeps its line breaks at every size of its font."""
    return f"{fmt(width / font_px)}em"


def main(argv):
    args = argv[1:]
    if not args:
        return usage()
    if "--measure" in args:
        i = args.index("--measure")
        try:
            width, font_px = float(args[i + 1]), float(args[i + 2])
        except (IndexError, ValueError):
            return usage("--measure needs WIDTH and FONT in px, e.g. --measure 570 24")
        del args[i:i + 3]
        prefix, err = take(args, "--class", str, "--class needs a PREFIX, e.g. --class 'max-w-['")
        if err or args or width <= 0 or font_px <= 0:
            return usage(err or "--measure takes WIDTH FONT (positive) and optionally --class PREFIX")
        print(f"{prefix}{measure(width, font_px)}]" if prefix else measure(width, font_px))
        return 0
    prefix, err = take(args, "--class", str, "--class needs a PREFIX, e.g. --class 'flex-[0_1_'")
    mobile, err = (None, err) if err else take(args, "--mobile", float, "--mobile needs a px value")
    ratio, err = (None, err) if err else take(args, "--min-ratio", float, "--min-ratio needs a number, e.g. 1.15")
    if err:
        return usage(err)
    role = None
    if "--font" in args:
        i = args.index("--font")
        if i + 1 < len(args) and args[i + 1] in FONT_ROLE_FLOOR:
            role = args.pop(i + 1)
    flags = ("--css", "--v4", "--font", "--size", "--grid", "--default")
    unknown = [a for a in args if a.startswith("--") and a not in flags]
    if unknown:
        return usage(f"unknown option {unknown[0]}")
    css, v4, font, size, grid = (f in args for f in flags[:5])

    if "--default" in args:
        if size or grid or mobile is not None or ratio is not None or role:
            return usage("--default prints the standard spacing and font set; it takes no other kind or option")
        groups = [("spacing", DEFAULT_SPACING), ("font", DEFAULT_FONT)]
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
        if sum((font, size, grid)) > 1:
            return usage("pick one kind: --font, --grid or --size (default: spacing)")
        if mobile is not None and (len(nums) != 1 or size or grid or mobile <= 0):
            return usage("--mobile takes one positive value, for one spacing or --font value")
        if ratio is not None and (not font or len(nums) < 2 or ratio < 1):
            return usage("--min-ratio needs --font, two or more values and a ratio of at least 1")
        groups = [("font" if font else "size" if size else "grid" if grid else "spacing", nums)]
    if sum((v4, css, prefix is not None)) > 1:
        return usage("pick one output format: --css, --v4 or --class")

    phone = {}
    if ratio is not None:
        phone = keep_ratio(groups[0][1], ratio, role)
    elif mobile is not None:
        phone = {groups[0][1][0]: mobile}

    if css:
        print(":root {")
    for kind, values in groups:
        for v in values:
            name = {"size": f"size-{v:g}", "grid": f"grid-{v:g}"}.get(kind, f"fluid-{v:g}")
            value = clamp(v, font=kind == "font", size=kind == "size", grid=kind == "grid",
                          role=role, mobile=phone.get(v))
            if prefix:
                cls = value.replace(", ", ",").replace(" + ", "_+_").replace(" - ", "_-_")
                print(f"{prefix}{cls}]")
            elif v4 or css:
                ns = "--text" if kind == "font" else "--spacing"
                print(f"  {ns}-{name}: {value};  /* {v:g}px */")
            else:
                print(f"  '{name}': '{value}',  // {v:g}px ({kind})")
    if css:
        print("}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
