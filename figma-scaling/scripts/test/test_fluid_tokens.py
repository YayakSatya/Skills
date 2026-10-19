#!/usr/bin/env python3
"""Regression tests for fluid_tokens.py. Standard library only:
    python3 figma-scaling/scripts/test/test_fluid_tokens.py
Checks that the script, the SKILL.md tables and the Tailwind tables in references/tailwind.md
agree, so an edit to one cannot drift from the others, and that the model keeps its promises:
from 1440 up every value equals the three-point model, below 1440 it is continuous, monotonic
and never above the 1440 value, and font sizes never go under 15px.
"""

import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / "fluid_tokens.py"
ROOT = HERE.parent.parent
SKILL = (ROOT / "references" / "tailwind.md").read_text()
SOURCE_SKILL = (ROOT / "SKILL.md").read_text()

sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPT.parent))
import fluid_tokens as ft  # noqa: E402

CLAMP = r"clamp\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)"  # nested max(min(...)) inside clamp()
WIDTHS = (390, 768, 1440, 1920, 2560)


def run(*args):
    p = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    return p.returncode, p.stdout


def block(start, end="\n}"):
    i = SKILL.index(start)
    return SKILL[i:SKILL.index(end, i)]


def section(text, number):
    i = text.index(f"\n## {number}. ")
    j = text.find("\n## ", i + 1)
    return text[i:j if j > 0 else None]


def three_point(px, font=False):
    """The 3.x model, before the phone line: the reference for every width from 1440 up."""
    lo = int(px * 0.75 / 0.5 + 0.5) * 0.5
    hi = px * 2560 / 1920
    if font:
        lo = max(lo, 15)
        hi = max(hi, lo)
    return lambda w: max(lo, min(px * w / 1920, hi))


def table_rows(text, number):
    rows = re.findall(r"\| \*\*(\d+)px\*\* \| ([^`]+)\| `(" + CLAMP + r")` \|", section(text, number))
    return [(int(px), [float(c) for c in cells.split("|") if c.strip()], value) for px, cells, value in rows]


class Tables(unittest.TestCase):
    def check_table(self, number, values, font):
        rows = table_rows(SOURCE_SKILL, number)
        self.assertEqual([px for px, _, _ in rows], values)
        for px, cells, value in rows:
            self.assertEqual(value, ft.clamp(px, font), f"{px}px")
            expected = [round(ft.value_at(px, w, font), 1) for w in WIDTHS]
            self.assertEqual(cells, expected, f"{px}px")

    def test_section_3_spacing_table(self):
        self.check_table(3, ft.DEFAULT_SPACING, False)

    def test_section_8_font_table(self):
        self.check_table(8, ft.DEFAULT_FONT, True)

    def test_v3_config_matches_script(self):
        cfg = block("module.exports = {")
        spacing = cfg[cfg.index("spacing:"):cfg.index("fontSize:")]
        font = cfg[cfg.index("fontSize:"):cfg.index("maxWidth:")]
        for part, is_font, keys in ((spacing, False, ft.DEFAULT_SPACING), (font, True, ft.DEFAULT_FONT)):
            entries = re.findall(r"'fluid-(\d+)':\s+'(" + CLAMP + ")'", part)
            self.assertEqual([int(px) for px, _ in entries], keys)
            for px, value in entries:
                self.assertEqual(value, ft.clamp(float(px), is_font), f"fluid-{px} font={is_font}")

    def test_v4_theme_matches_default_output(self):
        pattern = r"(--(?:spacing|text)-fluid-\d+: " + CLAMP + ");"
        theme = re.findall(pattern, block("@theme {"))
        code, out = run("--default", "--v4")
        self.assertEqual(code, 0)
        self.assertEqual(len(theme), len(ft.DEFAULT_SPACING) + len(ft.DEFAULT_FONT))
        self.assertEqual(theme, re.findall(pattern, out))

    def test_line_height_examples_use_current_token(self):
        self.assertEqual(SKILL.count(ft.clamp(32, True)), 4)  # v3 fontSize, @theme, v3 tuple, v4 line-height

    def test_css_output_is_a_root_block_with_v4_names(self):
        code, css = run("--default", "--css")
        _, v4 = run("--default", "--v4")
        self.assertEqual(code, 0)
        lines = css.strip().splitlines()
        self.assertEqual((lines[0], lines[-1]), (":root {", "}"))
        self.assertEqual(lines[1:-1], v4.rstrip("\n").splitlines())

    def test_documented_examples(self):
        for text in (SOURCE_SKILL, SKILL):
            self.assertNotIn("17.6718rem", text)
        self.assertIn(ft.clamp(377, grid=True), SOURCE_SKILL)  # Section 4 column (run-1 note 2: columns are grid)
        code, out = run("377", "--grid", "--class", "flex-[0_1_")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "flex-[0_1_clamp(12.5625rem,19.6354vw,31.4167rem)]")
        self.assertIn(out.strip(), SKILL)
        code, out = run("96", "--class", "py-[")
        self.assertEqual(code, 0)
        self.assertIn(out.strip(), SKILL)
        self.assertNotIn(" ", out.strip())


class Model(unittest.TestCase):
    PXS = [x / 2 for x in range(1, 641)]  # 0.5 .. 320px

    def test_1440_and_up_is_the_three_point_model(self):
        for font in (False, True):
            for px in self.PXS:
                old = three_point(px, font)
                for w in range(1440, 3001, 40):
                    self.assertAlmostEqual(ft.value_at(px, w, font), old(w), places=6, msg=(px, w, font))

    def test_size_is_the_three_point_model_everywhere(self):
        for px in self.PXS:
            old = three_point(px)
            for w in range(320, 3001, 40):
                self.assertAlmostEqual(ft.value_at(px, w, size=True), old(w), places=6, msg=(px, w))

    def test_below_1440_is_monotonic_and_never_above_the_1440_value(self):
        for font in (False, True):
            for px in self.PXS:
                at1440 = ft.value_at(px, 1440, font)
                prev = 0
                for w in range(300, 1441, 10):
                    v = ft.value_at(px, w, font)
                    self.assertGreaterEqual(v + 1e-9, prev, (px, w, font))
                    self.assertLessEqual(v, at1440 + 1e-9, (px, w, font))
                    prev = v

    def test_phone_value_and_proportional_tablet(self):
        for font in (False, True):
            for px in self.PXS:
                m = ft.model(px, font)
                if m["mobile"] is None:
                    continue
                self.assertAlmostEqual(ft.value_at(px, 390, font), m["mobile"], places=6)
                # tablet sits on the straight line between the 390 and 1440 values
                mid = m["mobile"] + (m["laptop"] - m["mobile"]) * (768 - 390) / 1050
                self.assertAlmostEqual(ft.value_at(px, 768, font), mid, places=6)

    def test_documented_phone_values(self):
        self.assertEqual(ft.value_at(120, 390), 53.5)
        self.assertEqual(ft.value_at(64, 390, font=True), 32)
        self.assertEqual(ft.value_at(16, 390), 12)  # small values keep the 1440 value

    def test_font_floor_is_never_broken(self):
        for px in self.PXS:
            for w in range(300, 3001, 20):
                self.assertGreaterEqual(ft.value_at(px, w, font=True), 15 - 1e-9, (px, w))

    def test_tiny_font_locks_to_floor(self):
        self.assertEqual(ft.clamp(10, font=True), "clamp(0.9375rem, 0.5208vw, 0.9375rem)")

    def test_clamp_string_matches_value_at(self):
        """Evaluate the printed CSS the way a browser does and compare with value_at."""
        for font in (False, True):
            for px in self.PXS[::7]:
                css = ft.clamp(px, font)
                for w in (320, 360, 390, 600, 768, 1024, 1440, 1920, 2560, 3000):
                    self.assertAlmostEqual(evaluate(css, w), ft.value_at(px, w, font), delta=0.02,
                                           msg=(css, w))


def evaluate(css, width):
    expr = css.replace("rem", "*16").replace("vw", f"*{width / 100}")
    expr = expr.replace("clamp(", "_clamp(")
    return eval(expr, {"_clamp": lambda lo, v, hi: max(lo, min(v, hi)), "max": max, "min": min})


class Kinds(unittest.TestCase):
    """run-1 notes 1-6: --grid, --size names, --mobile, font roles, --min-ratio."""

    PXS = [x / 2 for x in range(1, 641)]

    def test_v4_size_and_grid_use_the_spacing_namespace(self):  # note 1
        self.assertEqual(run("46", "--size", "--v4")[1].split(":")[0].strip(), "--spacing-size-46")
        self.assertEqual(run("315", "--grid", "--v4")[1].split(":")[0].strip(), "--spacing-grid-315")
        self.assertIn("'size-46':", run("46", "--size")[1])

    def test_grid_is_proportional_from_1024(self):  # note 2
        for px in self.PXS:
            for w in range(1024, 2561, 16):
                self.assertAlmostEqual(ft.value_at(px, w, grid=True), px * w / 1920, delta=0.25, msg=(px, w))
            self.assertEqual(ft.value_at(px, 800, grid=True), ft.model(px, grid=True)["laptop"])  # held below 1024
            for w in range(1441, 3001, 40):  # from 1440 up the same as --size
                self.assertAlmostEqual(ft.value_at(px, w, grid=True), ft.value_at(px, w, size=True), delta=0.25)

    def test_mobile_override(self):  # note 4
        for px in (24, 46, 88, 120):
            for phone in (px * 0.3, px * 0.6, px * 0.9):
                self.assertAlmostEqual(ft.value_at(px, 390, font=True, mobile=phone), phone, places=6)
                old = three_point(px, True)
                for w in range(1440, 3001, 40):
                    self.assertAlmostEqual(ft.value_at(px, w, font=True, mobile=phone), old(w), places=6)
        # a phone value above the 1440 value (body 20px with an 18px Figma mobile mode, body role)
        self.assertAlmostEqual(ft.value_at(20, 390, font=True, role="body", mobile=18), 18, places=6)
        self.assertAlmostEqual(ft.value_at(20, 1440, font=True, role="body", mobile=18), 16, places=6)
        self.assertAlmostEqual(ft.value_at(20, 1920, font=True, role="body", mobile=18), 20, places=6)
        code, out = run("20", "--font", "body", "--mobile", "18", "--css")
        self.assertEqual(code, 0)
        css = re.search(CLAMP, out).group(0)
        for w in (360, 390, 768, 1440, 1920, 2560):
            self.assertAlmostEqual(evaluate(css, w), ft.value_at(20, w, True, role="body", mobile=18), delta=0.02)

    def test_font_roles_never_raise_text_above_figma(self):  # note 6
        for role, floor in (("body", 16), ("ui", 14), ("caption", 12)):
            for px in self.PXS[16:]:  # 8.5px and up
                self.assertAlmostEqual(ft.value_at(px, 1920, font=True, role=role), px, places=6, msg=(role, px))
                for w in range(300, 3001, 50):
                    self.assertGreaterEqual(ft.value_at(px, w, font=True, role=role), min(floor, px) - 1e-9)
        self.assertEqual(ft.value_at(14, 1440, font=True, role="caption"), 12)
        self.assertEqual(ft.value_at(14, 1440, font=True), 15)  # --font alone keeps the 15px floor

    def test_min_ratio_keeps_heading_steps(self):  # note 5
        phone = ft.keep_ratio([210, 88, 72], 1.15)
        self.assertGreaterEqual(phone[88] / phone[72], 1.15)
        self.assertGreaterEqual(phone[210] / phone[88], 1.15)
        for px, v in phone.items():
            self.assertLessEqual(v, ft.model(px, font=True)["laptop"])
        close = ft.keep_ratio([24, 26], 1.15)  # never more than the desktop ratio
        self.assertLessEqual(close[26] / close[24], 26 / 24 + 0.03)
        code, out = run("72", "88", "210", "--font", "--min-ratio", "1.15", "--v4")
        self.assertEqual(code, 0)
        self.assertIn(ft.clamp(88, font=True, mobile=phone[88]), out)


class Measure(unittest.TestCase):
    """run-2 note 1: text-block widths in em from Figma."""

    def test_values_from_the_field_notes(self):
        self.assertEqual(run("--measure", "1320", "210")[1].strip(), "6.2857em")  # hero title
        self.assertEqual(run("--measure", "570", "24")[1].strip(), "23.75em")     # hero intro
        self.assertEqual(run("--measure", "720", "72", "--class", "max-w-[")[1].strip(), "max-w-[10em]")

    def test_em_width_equals_figma_width_at_1920(self):
        for width, font in ((1320, 210), (570, 20), (598, 72)):
            em = float(ft.measure(width, font)[:-2])
            self.assertAlmostEqual(em * ft.value_at(font, 1920, font=True), width, delta=0.05 * font)

    def test_bad_input(self):
        for args in (["--measure"], ["--measure", "570"], ["--measure", "570", "0"], ["--measure", "570", "24", "--css"]):
            self.assertEqual(run(*args)[0], 2, args)

@unittest.skipUnless(os.environ.get("TAILWIND_V3") and os.environ.get("TAILWIND_V4"),
                     "set TAILWIND_V3 / TAILWIND_V4 to folders with tailwindcss 3 and 4 (+ @tailwindcss/cli) installed")
class TailwindCompile(unittest.TestCase):
    """Compiles references/tailwind.md and the script output with real Tailwind (run-1 note 1)."""

    CLASSES = ("py-fluid-120 text-fluid-64 -mt-fluid-120 gap-fluid-40 max-w-layout max-w-layout-content "
               "w-size-46 h-size-46 top-size-46 max-w-size-46 size-size-46 w-grid-315 max-w-grid-315")

    def compile(self, version, css, config=None):
        with tempfile.TemporaryDirectory(dir=os.environ[f"TAILWIND_V{version}"]) as d:  # v4 resolves @import from here
            Path(d, "index.html").write_text(f'<div class="{self.CLASSES}"></div>')
            if version == 3:
                Path(d, "tailwind.config.js").write_text(config.replace(
                    "module.exports = {", f"module.exports = {{ content: ['{d}/index.html'],", 1))
                Path(d, "in.css").write_text("@tailwind utilities;")
                cmd = [str(Path(os.environ["TAILWIND_V3"], "node_modules/.bin/tailwindcss")),
                       "-c", f"{d}/tailwind.config.js", "-i", f"{d}/in.css"]
            else:
                Path(d, "in.css").write_text(f'@import "tailwindcss";\n@source "{d}/index.html";\n{css}')
                cmd = [str(Path(os.environ["TAILWIND_V4"], "node_modules/.bin/tailwindcss")), "-i", f"{d}/in.css"]
            p = subprocess.run(cmd, capture_output=True, text=True, cwd=os.environ[f"TAILWIND_V{version}"])
            self.assertEqual(p.returncode, 0, p.stderr)
            return p.stdout

    def test_v4(self):
        extra = run("46", "--size", "--v4")[1] + run("315", "--grid", "--v4")[1]
        theme = block("@theme {").rstrip() + "\n" + extra + "}"
        out = self.compile(4, theme)
        for cls in self.CLASSES.split():
            self.assertRegex(out, r"\." + re.escape(cls).replace("\\-", "-") + r"\s*\{", cls)
        self.assertIn(ft.clamp(120), out)

    def test_v3(self):
        cfg = block("module.exports = {")
        extra = run("46", "--size")[1] + run("315", "--grid")[1]
        cfg = cfg.replace("      spacing: {\n", "      spacing: {\n" + extra, 1) + "\n}"
        out = self.compile(3, None, cfg)
        for cls in self.CLASSES.split():
            if cls.startswith("max-w-") and ("size" in cls or "grid" in cls):
                continue  # v3 max-w-* reads maxWidth, not spacing: use w- or register under maxWidth
            self.assertRegex(out, r"\." + re.escape(cls).replace("\\-", "-") + r"\s*\{", cls)
        self.assertIn(ft.clamp(120), out)


class Cli(unittest.TestCase):
    def test_bad_input_exits_2_without_traceback(self):
        for args in (["abc"], ["32", "--class"], ["32", "--vv"], [], ["--v4"], ["32", "--css", "--v4"],
                     ["32", "--size", "--font"], ["--default", "--size"], ["32", "--grid", "--size"],
                     ["32", "40", "--mobile", "20"], ["32", "--size", "--mobile", "20"], ["32", "--mobile"],
                     ["32", "40", "--min-ratio", "1.15"], ["32", "--font", "--min-ratio", "1.15"],
                     ["--default", "--grid"], ["--default", "--font", "body"]):
            p = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
            self.assertEqual(p.returncode, 2, args)
            self.assertNotIn("Traceback", p.stderr, args)


if __name__ == "__main__":
    unittest.main(verbosity=2)
