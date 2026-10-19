// Runs check_layout.mjs on fixtures/layout.html, which reproduces problems from field notes runs 1-3
// (summarised in CHANGELOG 5.1 and 5.2).
// Needs Chrome (found like the script does, or CHROME=path); prints SKIP without it.
//   node figma-scaling/scripts/test/check_layout.test.mjs
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { parseArgs, run } from "../check_layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, "fixtures", "layout.html")).href;
const checks = [];
const check = (name, ok) => checks.push([name, !!ok]);

let report;
try {
  report = await run(parseArgs([url, "--sizes", "1920x1080,1024x768:touch,360x800:touch", "--out", "/tmp/layout-check-test"]));
} catch (e) {
  if (/Chrome not found/.test(e.message)) { console.log(`SKIP check_layout: ${e.message}`); process.exit(0); }
  throw e;
}
const desk = report.sizes["1920x1080"], tab = report.sizes["1024x768:touch"], phone = report.sizes["360x800:touch"];

check("touch sizes emulate a coarse pointer, desktop a fine one", desk.pointer.fine && !tab.pointer.fine && !phone.pointer.fine);
check("first screen: 736px hero at 1024x768 lets the next section peek 32px (run 3 #2)",
  tab.firstScreen.height === 736 && tab.firstScreen.nextPeeksPx === 32);
check("first screen is taller than the viewport at 1920 (no peek)", desk.firstScreen.nextPeeksPx === 0);
check("fixed header is not taken as the first screen", !/header/.test(tab.firstScreen.key));
check("grid-width heading gains lines at 1024 (run 2 #1)",
  tab.headingLineChanges.some((c) => /Shaped by hand/.test(c.text) && c.now > c.ref));
check("one-word last line is reported (run 3 #1)", desk.orphans.some((o) => /aaaa/.test(o.text)));
check("longest line em width is measured (run 2 #6)",
  tab.texts.find((t) => /Shaped by hand/.test(t.text)).longestLineEm > 0);
check("photo covering text is reported below 1100 (run 1 #2)", tab.overlaps.some((o) => /Special Editions/.test(o.snippet)));
check("no photo overlap at 1920", !desk.overlaps.some((o) => /Special Editions/.test(o.snippet)));
check("text on its own background photo is not reported", ![desk, tab, phone].some((s) => s.overlaps.some((o) => /background photo/.test(o.snippet))));
check("content overflowing a clipped fixed-height box is reported (run 2 #2)", desk.boxesWithOverflowingContent.length === 1);
check("horizontal overflow at 360", phone.overflowX > 0 && desk.overflowX === 0);
check("small tap target on touch sizes only", phone.smallTapTargets.some((t) => t.text === "tiny link") && desk.smallTapTargets.length === 0);

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
process.exitCode = checks.every(([, ok]) => ok) ? 0 : 1;
