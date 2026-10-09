#!/usr/bin/env python3
"""Turn a DESIGN.md's YAML frontmatter into ready-to-use token files.

Usage:
    python3 design_tokens.py <DESIGN.md> <out_dir> [--lang id|en]
    python3 design_tokens.py <DESIGN.md> --check      # validate only, print summary
    python3 design_tokens.py <DESIGN.md> --contrast   # WCAG contrast of text/background pairs

Writes into <out_dir>:
    tokens.css          CSS custom properties + .type-* and .c-* utility classes
    tokens.json         resolved token values (references like {colors.primary} expanded)
    tailwind.preset.js  Tailwind preset (colors, radius, spacing, font families)
    styleguide.html     visual page of every color, type role, radius, spacing step and
                        component, for non-designers to review (labels in --lang, default id)

Expected frontmatter (Google Stitch DESIGN.md shape, as used by awesome-design-md):
    colors:      { name: "#hex" }
    colors-dark: { name: "#hex" }            # optional, same keys as colors
    typography:  { role: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } }
    rounded:     { name: 8px }
    spacing:     { name: 16px }
    components:  { name: { backgroundColor, textColor, typography, rounded, padding, ... } }

Stdlib only: no PyYAML needed. The parser covers the YAML subset these files use
(nested maps, quoted/unquoted scalars, block scalars, simple lists).
"""

import json
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------- YAML subset

def _strip_comment(line):
    out, quote = [], None
    for i, ch in enumerate(line):
        if quote:
            if ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
        elif ch == "#" and (i == 0 or line[i - 1] in " \t"):
            break
        out.append(ch)
    return "".join(out).rstrip()


def _scalar(raw):
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ("'", '"'):
        return raw[1:-1]
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    if re.fullmatch(r"-?\d*\.\d+", raw):
        return float(raw)
    return raw


def parse_yaml(text):
    lines = text.splitlines()
    root = {}
    stack = [(-1, root)]  # (indent, container)
    i = 0
    while i < len(lines):
        raw = lines[i]
        if not raw.strip() or raw.lstrip().startswith("#"):
            i += 1
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = _strip_comment(raw).strip()
        while stack and indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]

        if line.startswith("- "):
            if isinstance(parent, list):
                parent.append(_scalar(line[2:]))
            i += 1
            continue

        m = re.match(r"^([^:]+?):(?:\s+(.*))?$", line)
        if not m:
            i += 1
            continue
        key, val = m.group(1).strip().strip("'\""), (m.group(2) or "").strip()

        if val in ("|", ">", "|-", ">-", "|+", ">+"):
            block, j = [], i + 1
            while j < len(lines) and (not lines[j].strip() or
                                      len(lines[j]) - len(lines[j].lstrip(" ")) > indent):
                block.append(lines[j].strip())
                j += 1
            parent[key] = (" " if val.startswith(">") else "\n").join(block).strip()
            i = j
            continue

        if val == "":
            # Peek: list or map?
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            child = [] if j < len(lines) and lines[j].strip().startswith("- ") else {}
            parent[key] = child
            stack.append((indent, child))
        else:
            parent[key] = _scalar(val)
        i += 1
    return root


def read_frontmatter(path):
    text = Path(path).read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return None
    return parse_yaml(m.group(1))


# ---------------------------------------------------------------- helpers

REF = re.compile(r"\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)\}")
GROUP_PREFIX = {"colors": "color", "rounded": "radius", "spacing": "space", "typography": "type"}


def slug(s):
    return re.sub(r"[^a-z0-9-]+", "-", str(s).lower()).strip("-")


def css_var(group, name):
    return f"--{GROUP_PREFIX.get(group, slug(group))}-{slug(name)}"


def px(v):
    return f"{v}px" if isinstance(v, (int, float)) and v != 0 else str(v)


def resolve(value, fm, as_css):
    """Expand {group.name} references, either to var(--x) or to the raw value."""
    if not isinstance(value, str):
        return value

    def sub(m):
        group, name = m.group(1), m.group(2)
        if as_css and group in ("colors", "rounded", "spacing"):
            return f"var({css_var(group, name)})"
        target = fm.get(group, {})
        for part in name.split("."):
            target = target.get(part, m.group(0)) if isinstance(target, dict) else m.group(0)
        return target if isinstance(target, str) else json.dumps(target)

    return REF.sub(sub, value)


TYPE_PROPS = {
    "fontFamily": "font-family",
    "fontSize": "font-size",
    "fontWeight": "font-weight",
    "lineHeight": "line-height",
    "letterSpacing": "letter-spacing",
    "fontFeature": "font-feature-settings",
    "textTransform": "text-transform",
}

COMPONENT_PROPS = {
    "backgroundColor": "background-color",
    "textColor": "color",
    "borderColor": "border-color",
    "border": "border",
    "rounded": "border-radius",
    "padding": "padding",
    "height": "height",
    "width": "width",
    "gap": "gap",
    "shadow": "box-shadow",
    "boxShadow": "box-shadow",
}


def type_decls(spec, fm):
    decls = []
    for k, prop in TYPE_PROPS.items():
        if k in spec:
            v = spec[k]
            if k == "fontFeature":
                v = ", ".join(f'"{f.strip()}"' for f in str(v).split(","))
            elif k in ("fontSize", "letterSpacing"):
                v = px(v)
            decls.append(f"{prop}: {resolve(v, fm, True)};")
    return decls


# ---------------------------------------------------------------- emitters

def build_css(fm):
    out = ["/* Generated by design-killer/scripts/design_tokens.py. Edit DESIGN.md, then regenerate. */", ":root {"]
    for group in ("colors", "rounded", "spacing"):
        for name, val in (fm.get(group) or {}).items():
            out.append(f"  {css_var(group, name)}: {px(resolve(val, fm, False))};")
    out.append("}")

    dark = fm.get("colors-dark") or {}
    if dark:
        body = [f"  {css_var('colors', n)}: {resolve(v, fm, False)};" for n, v in dark.items()]
        out += ["", "@media (prefers-color-scheme: dark) {", '  :root:not([data-theme="light"]) {']
        out += ["  " + b for b in body]
        out += ["  }", "}", "", ':root[data-theme="dark"] {'] + body + ["}"]

    typo = fm.get("typography") or {}
    if typo:
        out.append("")
        for role, spec in typo.items():
            if isinstance(spec, dict):
                out.append(f".type-{slug(role)} {{ " + " ".join(type_decls(spec, fm)) + " }")

    comps = fm.get("components") or {}
    if comps:
        out.append("")
        for name, spec in comps.items():
            if not isinstance(spec, dict):
                continue
            decls = []
            ty = spec.get("typography")
            if isinstance(ty, str):
                m = REF.fullmatch(ty.strip())
                if m and m.group(1) == "typography":
                    decls += type_decls(typo.get(m.group(2), {}), fm)
            for k, prop in COMPONENT_PROPS.items():
                if k in spec:
                    decls.append(f"{prop}: {px(resolve(spec[k], fm, True))};")
            if decls:
                out.append(f".c-{slug(name)} {{ " + " ".join(decls) + " }")
    return "\n".join(out) + "\n"


def build_json(fm):
    def walk(v):
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        if isinstance(v, list):
            return [walk(x) for x in v]
        return resolve(v, fm, False)

    keep = ("name", "colors", "colors-dark", "typography", "rounded", "spacing", "components")
    return json.dumps({k: walk(fm[k]) for k in keep if k in fm}, indent=2, ensure_ascii=False) + "\n"


def build_tailwind(fm):
    colors = {slug(n): f"var({css_var('colors', n)})" for n in (fm.get("colors") or {})}
    radius = {slug(n): f"var({css_var('rounded', n)})" for n in (fm.get("rounded") or {})}
    space = {slug(n): f"var({css_var('spacing', n)})" for n in (fm.get("spacing") or {})}
    families = {}
    for role, spec in (fm.get("typography") or {}).items():
        if isinstance(spec, dict) and "fontFamily" in spec:
            fam = [f.strip().strip("'\"") for f in str(spec["fontFamily"]).split(",")]
            families.setdefault(fam[0], fam)
    fonts = {slug(k): v for k, v in families.items()}
    preset = {"theme": {"extend": {"colors": colors, "borderRadius": radius,
                                   "spacing": space, "fontFamily": fonts}}}
    return ("// Generated by design-killer. Requires tokens.css to be loaded (values are CSS variables).\n"
            "module.exports = " + json.dumps(preset, indent=2, ensure_ascii=False) + ";\n")


# ---------------------------------------------------------------- contrast

def _rgb(value):
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?", str(value).strip())
    if not m:
        return None
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def _luminance(rgb):
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(fg, bg):
    a, b = _rgb(fg), _rgb(bg)
    if not a or not b:
        return None
    hi, lo = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def contrast_report(fm):
    """WCAG ratios for every component text/background pair, plus common ink-on-canvas pairs."""
    rows = []
    comps = fm.get("components") or {}
    for name, spec in comps.items():
        if "disabled" in str(name).lower():
            continue  # WCAG 1.4.3 exempts inactive controls
        if isinstance(spec, dict) and "textColor" in spec and "backgroundColor" in spec:
            fg, bg = resolve(spec["textColor"], fm, False), resolve(spec["backgroundColor"], fm, False)
            r = contrast(fg, bg)
            if r is not None:
                rows.append((f"component {name}", fg, bg, r))

    def parts(name):
        return set(str(name).lower().split("-"))

    def is_light(value):
        rgb = _rgb(value)
        return rgb is not None and _luminance(rgb) >= 0.18

    for mode in ("colors", "colors-dark"):
        colors = fm.get(mode) or {}
        inks = [k for k in colors
                if parts(k) & {"ink", "text", "body", "foreground", "fg"} and not k.startswith("on-")]
        grounds = [k for k in colors if parts(k) & {"canvas", "surface", "background", "bg", "paper"}]
        for ink in inks:
            for ground in grounds:
                # Dark ink is meant for light grounds and vice versa; same-polarity pairs are
                # never used together, so checking them only adds noise.
                if is_light(colors[ink]) == is_light(colors[ground]):
                    continue
                r = contrast(colors[ink], colors[ground])
                if r is not None:
                    rows.append((f"{mode} {ink} on {ground}", colors[ink], colors[ground], r))
    return rows


# ---------------------------------------------------------------- style guide

SYSTEM_FONTS = {"system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto", "arial",
                "helvetica", "helvetica neue", "sans-serif", "serif", "monospace", "georgia",
                "times new roman", "sf pro display", "sf pro text", "sf pro rounded", "ui-monospace",
                "menlo", "courier new", "inherit"}

LABELS = {
    "id": {"colors": "Warna", "type": "Tipografi", "radius": "Sudut", "space": "Jarak",
           "components": "Komponen", "sample": "Halaman yang sama, gaya berbeda",
           "on_canvas": "di atas canvas", "theme": "Ganti tema terang/gelap",
           "intro": "Halaman ini dibuat otomatis dari DESIGN.md. Cek apakah warna, huruf, dan bentuk tombol sudah terasa pas sebelum halaman HI-FI dibuat."},
    "en": {"colors": "Colors", "type": "Typography", "radius": "Corners", "space": "Spacing",
           "components": "Components", "sample": "Same page, different style",
           "on_canvas": "on canvas", "theme": "Toggle light/dark",
           "intro": "Generated from DESIGN.md. Check that colors, type and button shapes feel right before HI-FI pages are built."},
}


def _esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def build_styleguide(fm, lang="id"):
    L = LABELS.get(lang, LABELS["en"])
    colors = fm.get("colors") or {}
    typo = fm.get("typography") or {}

    families = []
    for spec in typo.values():
        if isinstance(spec, dict) and spec.get("fontFamily"):
            for fam in str(spec["fontFamily"]).split(","):
                fam = fam.strip().strip("'\"")
                if fam and fam.lower() not in SYSTEM_FONTS and fam not in families:
                    families.append(fam)
                break  # only the first (intended) family of each stack
    # One <link> per family: a family Google Fonts does not have fails alone, not the whole sheet.
    font_links = "\n".join(
        f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={f.replace(" ", "+")}:wght@300;400;500;600;700;800&display=swap">'
        for f in families)

    canvas = colors.get("canvas") or colors.get("background") or "#ffffff"
    ink = colors.get("ink") or colors.get("text") or "#111111"

    swatches = []
    for name, val in colors.items():
        hexv = resolve(val, fm, False)
        r = contrast(hexv, canvas)
        # Ratios only mean something for colors used as text or marks on the canvas.
        ground = set(str(name).lower().split("-")) & {"canvas", "surface", "hairline", "border",
                                                       "bg", "background", "on", "disabled"}
        badge = "" if r is None or ground else f'<span class="sg-badge">{r:.1f}:1 {L["on_canvas"]}</span>'
        swatches.append(f'<figure class="sg-swatch"><div style="background:var({css_var("colors", name)})"></div>'
                        f'<figcaption><b>{_esc(name)}</b><code>{_esc(hexv)}</code>{badge}</figcaption></figure>')

    type_rows = []
    for role, spec in typo.items():
        if not isinstance(spec, dict):
            continue
        meta = " · ".join(str(spec[k]) for k in ("fontSize", "fontWeight", "lineHeight") if k in spec)
        type_rows.append(f'<div class="sg-type"><code>{_esc(role)} · {_esc(meta)}</code>'
                         f'<p class="type-{slug(role)}">{_esc(L["sample"])}</p></div>')

    radii = "".join(f'<div class="sg-radius"><div style="border-radius:var({css_var("rounded", n)})"></div>'
                    f'<code>{_esc(n)} {_esc(px(v))}</code></div>' for n, v in (fm.get("rounded") or {}).items())
    spaces = "".join(f'<div class="sg-space"><code>{_esc(n)} {_esc(px(v))}</code>'
                     f'<div style="width:var({css_var("spacing", n)})"></div></div>'
                     for n, v in (fm.get("spacing") or {}).items())
    comps = "".join(f'<div class="sg-comp"><code>{_esc(n)}</code><div class="c-{slug(n)}">{_esc(n)}</div></div>'
                    for n, spec in (fm.get("components") or {}).items() if isinstance(spec, dict))

    toggle = ""
    if fm.get("colors-dark"):
        toggle = (f'<button class="sg-toggle" type="button" onclick="var d=document.documentElement;'
                  f'd.dataset.theme=d.dataset.theme===\'dark\'?\'light\':\'dark\'">{_esc(L["theme"])}</button>')

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_esc(fm.get('name', 'Design system'))}</title>
{font_links}
<link rel="stylesheet" href="tokens.css">
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--color-canvas, {canvas}); color: var(--color-ink, {ink});
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }}
  main {{ max-width: 1120px; margin: 0 auto; padding: 32px 16px 80px; }}
  h1 {{ font-size: 28px; margin: 0 0 8px; }}
  h2 {{ font-size: 20px; margin: 48px 0 16px; padding-top: 16px; border-top: 1px solid currentColor; opacity: .9; }}
  .sg-intro {{ max-width: 70ch; opacity: .8; margin: 0 0 8px; }}
  code {{ font: 12px/1.4 ui-monospace, Menlo, monospace; opacity: .75; display: block; }}
  .sg-grid {{ display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }}
  .sg-swatch {{ margin: 0; }}
  .sg-swatch div {{ height: 72px; border-radius: 8px; border: 1px solid rgba(127,127,127,.35); }}
  .sg-swatch figcaption {{ font-size: 13px; padding-top: 6px; }}
  .sg-badge {{ font-size: 11px; opacity: .7; }}
  .sg-type {{ padding: 12px 0; border-bottom: 1px solid rgba(127,127,127,.25); overflow-wrap: anywhere; }}
  .sg-type p {{ margin: 6px 0 0; }}
  .sg-radius {{ display: inline-block; margin: 0 16px 16px 0; text-align: center; }}
  .sg-radius div {{ width: 72px; height: 72px; background: var(--color-primary, #888); margin-bottom: 6px; }}
  .sg-space {{ display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }}
  .sg-space code {{ width: 110px; flex: none; }}
  .sg-space div {{ height: 12px; background: var(--color-primary, #888); }}
  .sg-comp {{ margin-bottom: 20px; }}
  .sg-comp > div {{ display: inline-block; max-width: 100%; margin-top: 6px; overflow-wrap: anywhere; }}
  .sg-toggle {{ font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid currentColor;
    background: transparent; color: inherit; cursor: pointer; min-height: 44px; }}
</style>
</head>
<body>
<main>
  <h1>{_esc(fm.get('name', 'Design system'))}</h1>
  <p class="sg-intro">{_esc(L['intro'])}</p>
  {toggle}
  <h2>{_esc(L['colors'])}</h2>
  <div class="sg-grid">{''.join(swatches)}</div>
  <h2>{_esc(L['type'])}</h2>
  {''.join(type_rows)}
  <h2>{_esc(L['radius'])}</h2>
  <div>{radii}</div>
  <h2>{_esc(L['space'])}</h2>
  <div>{spaces}</div>
  <h2>{_esc(L['components'])}</h2>
  <div>{comps}</div>
</main>
</body>
</html>
"""


# ---------------------------------------------------------------- main

def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    src = argv[1]
    fm = read_frontmatter(src)
    if not fm:
        print(f"ERROR: {src} has no YAML frontmatter. Normalize it first "
              "(see references/adapt-design-md.md, 'Normalize').", file=sys.stderr)
        return 1

    missing = [k for k in ("colors", "typography", "rounded", "spacing") if not fm.get(k)]
    summary = (f"{fm.get('name', '?')}: {len(fm.get('colors') or {})} colors, "
               f"{len(fm.get('typography') or {})} type roles, {len(fm.get('rounded') or {})} radii, "
               f"{len(fm.get('spacing') or {})} spacing steps, {len(fm.get('components') or {})} components"
               + (f", {len(fm['colors-dark'])} dark colors" if fm.get("colors-dark") else ""))
    unresolved = sorted({m.group(0) for m in REF.finditer(build_json(fm))})

    if argv[2] == "--check":
        print(summary)
        if missing:
            print("MISSING groups: " + ", ".join(missing))
        if unresolved:
            print("UNRESOLVED references: " + ", ".join(unresolved))
        return 1 if (missing or unresolved) else 0

    if argv[2] == "--contrast":
        # AA: 4.5 for body text, 3.0 for large text (>= 24px, or >= 18.66px bold) and UI parts.
        rows = contrast_report(fm)
        fails = 0
        for label, fg, bg, r in sorted(rows, key=lambda x: x[3]):
            verdict = "PASS" if r >= 4.5 else ("LARGE-ONLY" if r >= 3.0 else "FAIL")
            fails += verdict == "FAIL"
            print(f"{verdict:10} {r:5.2f}  {label}  ({fg} on {bg})")
        print(f"{len(rows)} pairs checked, {fails} below 3.0")
        return 1 if fails else 0

    out = Path(argv[2])
    out.mkdir(parents=True, exist_ok=True)
    (out / "tokens.css").write_text(build_css(fm), encoding="utf-8")
    (out / "tokens.json").write_text(build_json(fm), encoding="utf-8")
    (out / "tailwind.preset.js").write_text(build_tailwind(fm), encoding="utf-8")
    lang = argv[argv.index("--lang") + 1] if "--lang" in argv[:-1] else "id"
    (out / "styleguide.html").write_text(build_styleguide(fm, lang), encoding="utf-8")
    print(summary)
    print(f"wrote {out}/tokens.css, tokens.json, tailwind.preset.js, styleguide.html")
    if missing:
        print("WARNING missing groups: " + ", ".join(missing))
    if unresolved:
        print("WARNING unresolved references: " + ", ".join(unresolved))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
