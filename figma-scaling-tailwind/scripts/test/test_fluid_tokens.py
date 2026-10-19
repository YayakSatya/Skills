#!/usr/bin/env python3
"""Regression tests for fluid_tokens.py. Standard library only:
    python3 figma-scaling-tailwind/scripts/test/test_fluid_tokens.py
Checks that the script and the token tables in SKILL.md (and figma-scaling's Section 3) agree,
so an edit to one cannot drift from the other.
"""

import re
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / "fluid_tokens.py"
SKILL = (HERE.parent.parent / "SKILL.md").read_text()
SOURCE_SKILL = HERE.parent.parent.parent / "figma-scaling" / "SKILL.md"

sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPT.parent))
import fluid_tokens as ft  # noqa: E402


def run(*args):
    p = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    return p.returncode, p.stdout


def block(start, end="\n}"):
    i = SKILL.index(start)
    return SKILL[i:SKILL.index(end, i)]


def rem(s):
    return float(s.removesuffix("rem"))


class Tables(unittest.TestCase):
    def test_v3_config_matches_script(self):
        cfg = block("module.exports = {")
        spacing = cfg[cfg.index("spacing:"):cfg.index("fontSize:")]
        font = cfg[cfg.index("fontSize:"):cfg.index("maxWidth:")]
        for section, is_font in ((spacing, False), (font, True)):
            entries = re.findall(r"'fluid-(\d+)':\s+'(clamp\([^']+\))'", section)
            self.assertTrue(entries)
            for px, value in entries:
                self.assertEqual(value, ft.clamp(float(px), is_font), f"fluid-{px} font={is_font}")

    def test_v4_theme_matches_default_output(self):
        theme = re.findall(r"(--(?:spacing|text)-fluid-\d+: clamp\([^)]+\));", block("@theme {"))
        code, out = run("--default", "--v4")
        self.assertEqual(code, 0)
        self.assertEqual(theme, re.findall(r"(--(?:spacing|text)-fluid-\d+: clamp\([^)]+\));", out))

    def test_spacing_matches_figma_scaling_section_3(self):
        rows = re.findall(r"\| \*\*(\d+)px\*\* \|.*`(clamp\([^`]+\))` \|", SOURCE_SKILL.read_text())
        self.assertEqual(len(rows), 15)
        for px, value in rows:
            self.assertEqual(value, ft.clamp(float(px)), f"{px}px")

    def test_documented_class_example(self):
        code, out = run("377", "--class", "flex-[0_1_")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "flex-[0_1_clamp(17.6875rem,19.6354vw,31.4167rem)]")
        self.assertIn(out.strip(), SKILL)


class Model(unittest.TestCase):
    def parts(self, value):
        lo, vw, hi = re.fullmatch(r"clamp\(([\d.]+rem), ([\d.]+)vw, ([\d.]+rem)\)", value).groups()
        return rem(lo) * 16, float(vw), rem(hi) * 16

    def test_font_floor_is_never_broken(self):
        for tenth in range(10, 2000, 5):
            px = tenth / 10
            lo, _, hi = self.parts(ft.clamp(px, font=True))
            self.assertGreaterEqual(lo, 15, px)
            self.assertLessEqual(lo, hi, px)

    def test_tiny_font_locks_to_floor(self):
        self.assertEqual(ft.clamp(10, font=True), "clamp(0.9375rem, 0.5208vw, 0.9375rem)")

    def test_spacing_min_never_exceeds_max(self):
        for tenth in range(5, 2000, 5):
            lo, vw, hi = self.parts(ft.clamp(tenth / 10))
            self.assertLessEqual(lo, hi, tenth / 10)
            self.assertAlmostEqual(vw * 19.2, tenth / 10, delta=0.01)


class Cli(unittest.TestCase):
    def test_bad_input_exits_2_without_traceback(self):
        for args in (["abc"], ["32", "--class"], ["32", "--vv"], [], ["--v4"]):
            p = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
            self.assertEqual(p.returncode, 2, args)
            self.assertNotIn("Traceback", p.stderr, args)


if __name__ == "__main__":
    unittest.main(verbosity=2)
