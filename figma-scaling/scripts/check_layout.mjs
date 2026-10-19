#!/usr/bin/env node
// Re-runnable layout check for a sliced page (SKILL.md Section 12). Node 22+, no dependencies:
// it starts Chrome headless and talks to it over the DevTools protocol.
//
//   node check_layout.mjs <url> [--sizes 1920x1080,1440x900,1280x800,1366x768,1024x768:touch,768x1024:touch,390x844:touch,360x800:touch]
//                               [--ref 1920x1080] [--out DIR] [--screens] [--chrome PATH]
//
// Sizes are WxH, ":touch" adds touch emulation (pointer: coarse, hover: none), so a 1024x768 tablet
// in landscape is checked as what it is: desktop width, touch input. For every size it reports:
//   - horizontal overflow (scrollWidth > viewport width)
//   - text blocks whose line count differs from the --ref size (headings, paragraphs, links)
//   - one-word last lines (orphans) in multi-line text
//   - the em width of each text block's longest line (for the max-width: Nem and the
//     min(token, calc((100vw - gutters) / EM)) patterns, SKILL.md Section 8)
//   - the first screen: a first section shorter than the viewport lets the next one peek in
//   - tap targets under 44px tall on touch sizes
//   - text that overlaps an image or video it is not part of
//   - fixed-height boxes whose content overflows them, and the free space below their content
// It writes DIR/report.json (default ./layout-check) and, with --screens, one PNG per section per size.
// Exit code 1 when overflow, overlap or overflowing boxes are found, so it can gate CI.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_SIZES = "1920x1080,1440x900,1280x800,1366x768,1024x768:touch,768x1024:touch,390x844:touch,360x800:touch";

function parseArgs(argv) {
  const opts = { sizes: DEFAULT_SIZES, ref: "1920x1080", out: "layout-check", screens: false, chrome: process.env.CHROME };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--screens") opts.screens = true;
    else if (["--sizes", "--ref", "--out", "--chrome"].includes(a)) opts[a.slice(2)] = argv[++i];
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else rest.push(a);
  }
  if (rest.length !== 1) throw new Error("give one URL (http://, https:// or file://)");
  opts.url = rest[0];
  opts.sizeList = opts.sizes.split(",").map(parseSize);
  opts.refSize = parseSize(opts.ref);
  if (!opts.sizeList.some((s) => s.key === opts.refSize.key)) opts.sizeList.unshift(opts.refSize);
  return opts;
}

function parseSize(text) {
  const m = /^(\d+)x(\d+)(:touch)?$/.exec(text.trim());
  if (!m) throw new Error(`size must be WxH or WxH:touch, got "${text}"`);
  return { width: +m[1], height: +m[2], touch: !!m[3], key: text.trim() };
}

function findChrome(given) {
  const candidates = [given, "/opt/pw-browsers/chromium/chrome-linux/chrome",
    ...(existsSync("/opt/pw-browsers") ? readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium-"))
      .map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : []),
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"];
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error("Chrome not found: pass --chrome PATH or set CHROME");
  return found;
}

async function launch(chromePath) {
  const profile = mkdtempSync(join(tmpdir(), "layout-check-"));
  const proc = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--no-sandbox",
    "--disable-component-update", "--disable-background-networking",
    // headless Chrome has no pointer at all; give it a mouse (fine pointer, hover), touch sizes override it
    "--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2",
    "about:blank"],
  { stdio: "ignore" });
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) throw new Error("Chrome did not start (no DevToolsActivePort)");
  const [port, path] = readFileSync(portFile, "utf8").trim().split("\n");
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error("DevTools socket failed")); });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
    const msgId = ++id;
    pending.set(msgId, { ok, fail });
    ws.send(JSON.stringify({ id: msgId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500); };
  return { send, listeners, close };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs in the page. Keys are DOM paths, so the same element can be compared across sizes.
const COLLECT = String.raw`(() => {
  const path = (el) => { const parts = []; for (let e = el; e && e !== document.body; e = e.parentElement) {
    const same = [...(e.parentElement?.children || [])].filter((c) => c.tagName === e.tagName);
    parts.unshift(e.tagName.toLowerCase() + (same.length > 1 ? ":" + (same.indexOf(e) + 1) : "")); }
    return parts.join(">"); };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
  const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el);
    const rows = []; for (const r of range.getClientRects()) { if (r.width < 1) continue;
      const row = rows.find((x) => Math.abs(x.top - r.top) < r.height / 2);
      if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); }
      else rows.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right }); }
    return rows.sort((a, b) => a.top - b.top); };
  const lastLineWords = (el, rowTop) => { const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange(); let words = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) for (let i = 0; i < n.length; i++) {
      range.setStart(n, i); range.setEnd(n, i + 1); const r = range.getBoundingClientRect();
      if (r.height && Math.abs(r.top - rowTop) < r.height / 2) words += n.data[i]; }
    return words.trim().split(/\s+/).filter(Boolean).length; };
  const W = innerWidth, H = innerHeight, sy = scrollY;
  const textSel = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dt,dd,a,button,label";
  const texts = [];
  for (const el of document.querySelectorAll(textSel)) {
    if (!visible(el) || !el.textContent.trim()) continue;
    if (el.closest(textSel) !== el && el.parentElement.closest(textSel)) continue;  // outermost text block only
    const fs = parseFloat(getComputedStyle(el).fontSize); const rows = lines(el);
    if (!rows.length) continue;
    const widest = Math.max(...rows.map((r) => r.right - r.left));
    texts.push({ key: path(el), tag: el.tagName.toLowerCase(), text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
      fontPx: +fs.toFixed(2), lines: rows.length, longestLineEm: +(widest / fs).toFixed(3),
      orphan: rows.length > 1 && lastLineWords(el, rows[rows.length - 1].top) === 1,
      charsPerLine: Math.round(el.textContent.trim().length / rows.length) });
  }
  const media = [...document.querySelectorAll("img,video,picture,canvas,svg")].filter(visible)
    .map((m) => ({ el: m, r: m.getBoundingClientRect() })).filter((m) => m.r.width * m.r.height > 2500);
  // Text covered by an image is a bug; text drawn on top of its background photo is design.
  // So only report when the topmost element in the overlap is the image.
  const overlaps = [];
  for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,a,button,li")) {
    if (!visible(el) || !el.textContent.trim()) continue;
    let worst = null;
    for (const row of lines(el)) for (const m of media) {
      if (m.el.contains(el) || el.contains(m.el)) continue;
      const x0 = Math.max(row.left, m.r.left), x1 = Math.min(row.right, m.r.right);
      const y0 = Math.max(row.top, m.r.top), y1 = Math.min(row.bottom, m.r.bottom);
      if (x1 - x0 <= 4 || y1 - y0 <= 4) continue;
      const cx = (x0 + x1) / 2, docY = (y0 + y1) / 2 + sy;
      scrollTo(0, Math.max(0, docY - H / 2));  // elementFromPoint only sees the viewport
      const top = document.elementFromPoint(cx, docY - scrollY);
      if (top && (top === m.el || m.el.contains(top) || top.contains(m.el)) && !el.contains(top))
        if (!worst || x1 - x0 > worst.overlapPx) worst = { text: path(el), media: path(m.el), overlapPx: Math.round(x1 - x0),
          snippet: el.textContent.trim().slice(0, 40) };
    }
    if (worst) overlaps.push(worst);
  }
  scrollTo(0, sy);
  const candidates = [...document.querySelectorAll("body > *, main > *, body > div > *, body > div > main > *")]
    .filter((s) => visible(s) && s.getBoundingClientRect().width >= W * 0.9 && s.getBoundingClientRect().height > 40
      && !["SCRIPT", "STYLE", "MAIN", "NOSCRIPT"].includes(s.tagName) && !s.querySelector("main"));
  const sections = candidates.filter((s) => !candidates.some((o) => o !== s && o.contains(s)))
    .map((s) => { const r = s.getBoundingClientRect(); const cs = getComputedStyle(s);
      let bottom = r.top; for (const c of s.querySelectorAll("*")) { if (!visible(c)) continue;
        const cr = c.getBoundingClientRect(); if (cr.bottom <= r.bottom + 1) bottom = Math.max(bottom, cr.bottom); }
      return { key: path(s), top: Math.round(r.top + sy), height: Math.round(r.height),
        pinned: ["fixed", "sticky"].includes(cs.position),
        paddingTop: parseFloat(cs.paddingTop), paddingBottom: parseFloat(cs.paddingBottom),
        overflowHidden: cs.overflow.includes("hidden") || cs.overflowY === "hidden" || cs.overflowY === "clip",
        contentOverflowPx: Math.max(0, s.scrollHeight - s.clientHeight - 1),
        freeBelowContent: +((r.bottom - bottom) / r.height).toFixed(3) }; });
  const first = sections.filter((s) => !s.pinned).sort((a, b) => a.top - b.top)[0];
  const taps = [...document.querySelectorAll("a[href],button,input,select,textarea,[role=button]")].filter(visible)
    .map((el) => ({ key: path(el), text: (el.textContent || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 30),
      height: Math.round(el.getBoundingClientRect().height), width: Math.round(el.getBoundingClientRect().width) }))
    .filter((t) => t.height < 44);
  return { viewport: { width: W, height: H }, pointer: { fine: matchMedia("(pointer: fine)").matches, hover: matchMedia("(hover: hover)").matches },
    overflowX: Math.max(0, document.documentElement.scrollWidth - W), texts, overlaps, sections,
    firstScreen: first ? { key: first.key, height: first.height, viewportHeight: H, nextPeeksPx: Math.max(0, H - first.height) } : null,
    smallTapTargets: taps };
})()`;

async function checkSize(browser, sessionId, url, size, opts) {
  const { send } = browser;
  await send("Emulation.setDeviceMetricsOverride", { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: size.touch }, sessionId);
  // each size gets a fresh tab, so touch emulation is only switched on, never off (switching it off
  // resets the pointer to "none" in headless Chrome)
  if (size.touch) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
  const loaded = new Promise((ok) => { const l = (m) => { if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) {
    browser.listeners.splice(browser.listeners.indexOf(l), 1); ok(); } }; browser.listeners.push(l); });
  await send("Page.navigate", { url }, sessionId);
  await Promise.race([loaded, sleep(30000)]);
  // scroll through once so lazy images and scroll-driven layout settle, then back to the top
  await send("Runtime.evaluate", { expression: `(async () => { await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    scrollTo(0, 0); await new Promise(r => setTimeout(r, 300)); })()`, awaitPromise: true }, sessionId);
  const { result, exceptionDetails } = await send("Runtime.evaluate", { expression: COLLECT, returnByValue: true }, sessionId);
  if (exceptionDetails) throw new Error(`collector failed: ${exceptionDetails.exception?.description || exceptionDetails.text}`);
  const data = result.value;
  // a mobile viewport zooms out to fit wide content, so measure overflow against the requested width
  const sw = await send("Runtime.evaluate", { expression: "document.documentElement.scrollWidth", returnByValue: true }, sessionId);
  data.overflowX = Math.max(0, sw.result.value - size.width);
  if (opts.screens) {
    const dir = join(opts.out, size.key.replace(":", "-"));
    mkdirSync(dir, { recursive: true });
    for (const [i, s] of data.sections.entries()) {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
        clip: { x: 0, y: s.top, width: size.width, height: Math.max(1, s.height), scale: 1 } }, sessionId);
      writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.png`), Buffer.from(shot.data, "base64"));
    }
  }
  return data;
}

export { parseArgs };

export async function run(opts) {
  const browser = await launch(findChrome(opts.chrome));
  try {
    const results = {};
    for (const size of opts.sizeList) {
      const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
      await browser.send("Page.enable", {}, sessionId);
      results[size.key] = await checkSize(browser, sessionId, opts.url, size, opts);
      await browser.send("Target.closeTarget", { targetId });
    }
    return summarize(results, opts);
  } finally {
    browser.close();
  }
}

function summarize(results, opts) {
  const ref = results[opts.refSize.key];
  const refLines = new Map(ref.texts.map((t) => [t.key, t]));
  const report = { url: opts.url, ref: opts.refSize.key, sizes: {} };
  for (const [key, r] of Object.entries(results)) {
    const lineChanges = r.texts.filter((t) => refLines.has(t.key) && refLines.get(t.key).lines !== t.lines
      && (t.fontPx >= 24 || /^h[1-6]$/.test(t.tag)))
      .map((t) => ({ key: t.key, text: t.text, ref: refLines.get(t.key).lines, now: t.lines, fontPx: t.fontPx, longestLineEm: t.longestLineEm }));
    report.sizes[key] = { viewport: r.viewport, pointer: r.pointer, overflowX: r.overflowX,
      headingLineChanges: lineChanges, orphans: r.texts.filter((t) => t.orphan).map((t) => ({ key: t.key, text: t.text, lines: t.lines })),
      firstScreen: r.firstScreen, overlaps: r.overlaps,
      boxesWithOverflowingContent: r.sections.filter((s) => s.overflowHidden && s.contentOverflowPx > 0),
      sections: r.sections, smallTapTargets: key.endsWith(":touch") ? r.smallTapTargets : [],
      texts: r.texts };
  }
  return report;
}

function print(report) {
  const out = [`layout check: ${report.url} (line counts compared with ${report.ref})`];
  let failed = false;
  for (const [key, s] of Object.entries(report.sizes)) {
    const issues = [];
    if (s.overflowX) { issues.push(`horizontal overflow ${s.overflowX}px`); failed = true; }
    if (s.firstScreen?.nextPeeksPx > 0) issues.push(`first screen ${s.firstScreen.height}px < viewport ${s.firstScreen.viewportHeight}px: next section peeks ${s.firstScreen.nextPeeksPx}px`);
    for (const c of s.headingLineChanges) issues.push(`lines ${c.ref} -> ${c.now}: "${c.text}" (${c.fontPx}px, longest line ${c.longestLineEm}em)`);
    for (const o of s.orphans) issues.push(`one-word last line: "${o.text}"`);
    for (const o of s.overlaps) { issues.push(`text over image ${o.overlapPx}px: "${o.snippet}"`); failed = true; }
    for (const b of s.boxesWithOverflowingContent) { issues.push(`content overflows a clipped box by ${b.contentOverflowPx}px: ${b.key}`); failed = true; }
    for (const t of s.smallTapTargets) issues.push(`tap target ${t.height}px tall: "${t.text}"`);
    const tag = `${key}${s.pointer.fine ? "" : " (touch)"}`;
    out.push(issues.length ? `\n${tag}\n  - ${issues.join("\n  - ")}` : `\n${tag}: ok`);
  }
  console.log(out.join("\n"));
  return failed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`error: ${e.message}`); process.exit(2); }
  run(opts).then((report) => {
    mkdirSync(opts.out, { recursive: true });
    writeFileSync(join(opts.out, "report.json"), JSON.stringify(report, null, 2));
    const failed = print(report);
    console.log(`\nreport: ${join(opts.out, "report.json")}${opts.screens ? ", screenshots per section" : ""}`);
    process.exit(failed ? 1 : 0);
  }).catch((e) => { console.error(`error: ${e.message}`); process.exit(2); });
}
