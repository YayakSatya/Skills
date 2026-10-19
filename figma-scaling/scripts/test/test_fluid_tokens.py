#!/usr/bin/env python3
"""Regression tests for fluid_tokens.py. Standard library only:
    python3 figma-scaling/scripts/test/test_fluid_tokens.py
Checks that the script, the SKILL.md tables and the Tailwind tables in references/tailwind.md
agree, so an edit to one cannot drift from the others, and that the model keeps its promises:
from 1440 up every value equals the three-point model, below 1440 it is continuous, monotonic
and never above the 1440 value, and font sizes never go under 15px.
"""

import re
import subprocess
import sys
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
        self.assertIn("clamp(17.6875rem, 19.6354vw, 31.4167rem)", SOURCE_SKILL)
        code, out = run("377", "--size", "--class", "flex-[0_1_")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]")
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


class Cli(unittest.TestCase):
    def test_bad_input_exits_2_without_traceback(self):
        for args in (["abc"], ["32", "--class"], ["32", "--vv"], [], ["--v4"], ["32", "--css", "--v4"],
                     ["32", "--size", "--font"], ["--default", "--size"]):
            p = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
            self.assertEqual(p.returncode, 2, args)
            self.assertNotIn("Traceback", p.stderr, args)


if __name__ == "__main__":
    unittest.main(verbosity=2)
