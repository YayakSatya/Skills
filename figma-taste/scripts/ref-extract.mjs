#!/usr/bin/env node
// figma-taste: extract a live reference site's design system (tokens, type, colour, spacing, outline).
//   node ref-extract.mjs <url> [<url> ...] [--max-css 12]
// Writes .figma-taste/refs/<host>.json and .md. Node 18+, no dependencies.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('.figma-taste/refs');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const argv = process.argv.slice(2);
const urls = argv.filter(x => /^https?:\/\//.test(x));
const maxCssIdx = argv.indexOf('--max-css');
const MAX_CSS = maxCssIdx >= 0 ? Number(argv[maxCssIdx + 1]) || 12 : 12;
if (!urls.length) { console.error('Usage: node ref-extract.mjs <url> [<url> ...] [--max-css 12]'); process.exit(1); }

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/css,*/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { text: await res.text(), url: res.url };
}
const count = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const top = (arr, n) => count(arr).slice(0, n).map(([v, c]) => ({ value: v, count: c }));
const strip = s => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
const textOf = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function normColor(c) {
  c = c.trim().toLowerCase();
  const m3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/); if (m3) return `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
  const m6 = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/); if (m6) return `#${m6[1]}`;
  const rgb = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map(n => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
  return c;
}
function lum(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/); if (!m) return null;
  const [r, g, b] = m.slice(1).map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function sat(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/); if (!m) return 0;
  const [r, g, b] = m.slice(1).map(h => parseInt(h, 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

async function extract(url) {
  const page = await get(url);
  const html = page.text;
  const base = page.url;
  const host = new URL(base).host.replace(/^www\./, '');

  // stylesheets
  const links = [...html.matchAll(/<link[^>]+>/gi)].map(m => m[0])
    .filter(t => /rel=["']?[^"'>]*stylesheet/i.test(t))
    .map(t => (t.match(/href=["']([^"']+)["']/i) || [])[1]).filter(Boolean)
    .map(h => new URL(h.replace(/&amp;/g, '&'), base).toString());
  const googleFonts = links.filter(h => /fonts\.googleapis\.com/.test(h));
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  const styleAttrs = [...html.matchAll(/style=["']([^"']+)["']/gi)].map(m => m[1]);
  const sheets = [];
  const failed = [];
  for (const href of links.slice(0, MAX_CSS)) {
    try { sheets.push((await get(href)).text); } catch (e) { failed.push(href); }
  }
  // follow one level of @import
  for (const s of sheets.slice()) {
    for (const m of s.matchAll(/@import\s+(?:url\()?["']?([^"')]+)["']?\)?/g)) {
      if (sheets.length >= MAX_CSS + 4) break;
      try { sheets.push((await get(new URL(m[1], base).toString())).text); } catch {}
    }
  }
  const css = [...inline, ...sheets, styleAttrs.join(';')].join('\n');

  // tokens
  const customProps = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)].map(m => [m[1], m[2].trim()]);
  const propMap = new Map(); for (const [k, v] of customProps) if (!propMap.has(k)) propMap.set(k, v);

  const colors = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)/g)].map(m => normColor(m[0]));
  const colorTop = top(colors, 20);
  const hexes = colorTop.map(c => c.value).filter(v => /^#[0-9a-f]{6}$/.test(v));
  const bgDecl = [...css.matchAll(/(?:^|[;{\s])background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g)].map(m => normColor(m[1]));
  const colorDecl = [...css.matchAll(/(?:^|[;{\s])color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g)].map(m => normColor(m[1]));
  const ground = top(bgDecl, 3).map(x => x.value)[0] || hexes.find(h => lum(h) > 0.85) || null;
  const ink = top(colorDecl, 3).map(x => x.value)[0] || hexes.find(h => lum(h) < 0.05) || null;
  const accent = hexes.filter(h => sat(h) > 0.35 && lum(h) > 0.03 && lum(h) < 0.8)[0] || null;

  const families = [...css.matchAll(/font-family\s*:\s*([^;}{]+)/g)].map(m => m[1].split(',')[0].replace(/["']/g, '').trim()).filter(f => !/^var\(/.test(f));
  const faces = [...css.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^;"']+)/g)].map(m => m[1].trim());
  const sizes = [...css.matchAll(/font-size\s*:\s*([^;}{]+)/g)].map(m => m[1].trim()).filter(v => !/inherit|initial|unset/.test(v));
  const lineHeights = [...css.matchAll(/line-height\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const tracking = [...css.matchAll(/letter-spacing\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const weights = [...css.matchAll(/font-weight\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const radius = [...css.matchAll(/border-radius\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const gaps = [...css.matchAll(/(?:^|[;{\s])(?:row-|column-)?gap\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const paddings = [...css.matchAll(/padding(?:-inline|-block|-left|-right|-top|-bottom)?\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const maxWidths = [...css.matchAll(/max-width\s*:\s*([^;}{]+)/g)].map(m => m[1].trim()).filter(v => /px|rem|ch|vw/.test(v));
  const gridCols = [...css.matchAll(/grid-template-columns\s*:\s*([^;}{]+)/g)].map(m => m[1].trim());
  const effects = {
    gradients: (css.match(/(?:linear|radial|conic)-gradient\(/g) || []).length,
    shadows: (css.match(/box-shadow\s*:\s*(?!none)/g) || []).length,
    blur: (css.match(/backdrop-filter\s*:\s*blur/g) || []).length,
    monospace: (css.match(/font-family\s*:[^;]*mono/gi) || []).length,
    uppercase: (css.match(/text-transform\s*:\s*uppercase/g) || []).length,
  };

  // outline
  const body = strip(html);
  const headings = [...body.matchAll(/<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({ tag: m[1].toLowerCase(), text: textOf(m[2]).slice(0, 90) })).filter(h => h.text);
  const sections = (body.match(/<section\b/gi) || []).length;
  const images = (body.match(/<img\b/gi) || []).length + (body.match(/<picture\b/gi) || []).length;
  const videos = (body.match(/<video\b/gi) || []).length;
  const title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const themeColor = (html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i) || [])[1] || null;

  const thin = css.length < 2000;
  return {
    url: base, host, title, themeColor, fetchedAt: new Date().toISOString(),
    stylesheets: { fetched: sheets.length, failed, googleFonts, inlineBlocks: inline.length, styleAttrs: styleAttrs.length, inlineChars: inline.join('').length + styleAttrs.join('').length },
    thin,
    tokens: Object.fromEntries([...propMap.entries()].slice(0, 80)),
    colour: { likelyGround: ground, likelyInk: ink, likelyAccent: accent, top: colorTop },
    type: {
      families: top(families, 8), fontFaces: [...new Set(faces)].slice(0, 12),
      sizes: top(sizes, 16).map(x => ({ ...x, px1440: toPx(x.value, 1440), px390: toPx(x.value, 390) })), lineHeights: top(lineHeights, 8), tracking: top(tracking, 8), weights: top(weights, 8),
    },
    shape: { radius: top(radius, 8) },
    space: { gaps: top(gaps, 10), paddings: top(paddings, 12), maxWidths: top(maxWidths, 6), gridColumns: top(gridCols, 6) },
    effects,
    outline: { title, sections, images, videos, headings: headings.slice(0, 40) },
  };
}

// Evaluate a CSS length (px, rem, em, vw, vh, calc(), clamp(), min(), max()) at a viewport width.
function toPx(value, vw, vh = 900) {
  const v = String(value).trim().toLowerCase();
  const fn = v.match(/^(clamp|min|max|calc)\((.*)\)$/);
  if (fn) {
    const args = splitArgs(fn[2]).map(x => toPx(x, vw, vh));
    if (args.some(x => x == null)) return null;
    if (fn[1] === 'clamp') return Math.min(Math.max(args[1], args[0]), args[2]);
    if (fn[1] === 'min') return Math.min(...args);
    if (fn[1] === 'max') return Math.max(...args);
    return args[0];
  }
  // a sum such as "1rem + 2.5vw" or "100px - 1vw"
  const terms = v.replace(/\s+/g, ' ').match(/[+-]?\s*[\d.]+(px|rem|em|vw|vh|vmin|vmax|%)?/g);
  if (!terms || terms.join('').replace(/\s/g, '').length < v.replace(/\s/g, '').length - 2) return null;
  let total = 0;
  for (const t of terms) {
    const m = t.replace(/\s/g, '').match(/^([+-]?[\d.]+)(px|rem|em|vw|vh|vmin|vmax|%)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    const u = m[2] || 'px';
    total += u === 'px' ? n : (u === 'rem' || u === 'em') ? n * 16 : u === 'vw' ? n * vw / 100 : u === 'vh' ? n * vh / 100
      : u === 'vmin' ? n * Math.min(vw, vh) / 100 : u === 'vmax' ? n * Math.max(vw, vh) / 100 : null;
    if (Number.isNaN(total)) return null;
  }
  return total;
}
function splitArgs(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
// "3.73vw ≈ 54px @1440 / 15px @390" for viewport-relative sizes; px and rem are shown as px.
function annotateSize(value) {
  if (!/vw|vh|vmin|vmax|clamp|calc|min\(|max\(|rem|em\b/i.test(value)) return value;
  const d = toPx(value, 1440), m = toPx(value, 390);
  if (d == null || m == null) return value;
  return Math.round(d) === Math.round(m) ? `${value} ≈ ${Math.round(d)}px` : `${value} ≈ ${Math.round(d)}px @1440 / ${Math.round(m)}px @390`;
}

function md(r) {
  const list = (arr, n = 8) => arr.slice(0, n).map(x => `${x.value} ×${x.count}`).join(' · ') || '—';
  const sizeList = (arr, n) => arr.slice(0, n).map(x => `${annotateSize(x.value)} ×${x.count}`).join(' · ') || '—';
  return `# Reference: ${r.host}

${r.url}  (fetched ${r.fetchedAt})${r.stylesheets.fetched === 0 ? `\n\n> SPA or inline CSS: no stylesheets could be read. Read instead: ${r.stylesheets.inlineBlocks} inline <style> blocks and ${r.stylesheets.styleAttrs} style="" attributes (${r.stylesheets.inlineChars} characters). For type, rhythm and crops, load the built-in-browser or chrome-browser skill and take screenshots at 1440 and 390.` : r.thin ? '\n\n> Little CSS was readable (likely CSS-in-JS or blocked). Load the built-in-browser or chrome-browser skill and take screenshots.' : ''}

## Colour
- ground ${r.colour.likelyGround || '?'}, ink ${r.colour.likelyInk || '?'}, accent ${r.colour.likelyAccent || '?'}${r.themeColor ? `, theme-color ${r.themeColor}` : ''}
- frequent: ${list(r.colour.top, 12)}

## Type
- families: ${list(r.type.families)}
- font faces loaded: ${r.type.fontFaces.join(', ') || '—'}${r.stylesheets.googleFonts.length ? `\n- Google Fonts: ${r.stylesheets.googleFonts.join(' ')}` : ''}
- sizes: ${sizeList(r.type.sizes, 14)}
- line-heights: ${list(r.type.lineHeights)}
- tracking: ${list(r.type.tracking)}
- weights: ${list(r.type.weights)}

## Shape and space
- radius: ${list(r.shape.radius)}
- gaps: ${list(r.space.gaps)}
- paddings: ${list(r.space.paddings, 10)}
- containers: ${list(r.space.maxWidths)}
- grid columns: ${list(r.space.gridColumns, 4)}

## Effects used (counts in CSS)
gradients ${r.effects.gradients} · shadows ${r.effects.shadows} · backdrop blur ${r.effects.blur} · monospace ${r.effects.monospace} · uppercase ${r.effects.uppercase}

## Outline
${r.outline.sections} <section> elements, ${r.outline.images} images, ${r.outline.videos} videos

${r.outline.headings.map(h => `${'  '.repeat(Number(h.tag[1]) - 1)}- ${h.tag}: ${h.text}`).join('\n') || '—'}

## Reference sheet (fill in)
Adopt:
  type
  grid
  images
  rhythm
  colour
Do not take: logo, copy, photographs, exact brand colours, signature graphics
`;
}

fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
for (const u of urls) {
  try {
    const r = await extract(u);
    fs.writeFileSync(path.join(OUT, `${r.host}.json`), JSON.stringify(r, null, 2));
    fs.writeFileSync(path.join(OUT, `${r.host}.md`), md(r));
    console.log(`OK  ${r.host}: ${r.stylesheets.fetched} stylesheets, ${r.type.families.length} families, ${r.outline.headings.length} headings → .figma-taste/refs/${r.host}.md`);
    if (r.stylesheets.fetched === 0) console.log(`    ${r.host}: SPA or inline CSS: no stylesheets; read ${r.stylesheets.inlineBlocks} inline <style> blocks and ${r.stylesheets.styleAttrs} style="" attributes. Load the built-in-browser or chrome-browser skill for screenshots.`);
  } catch (e) {
    failures++;
    console.log(`ERR ${u}: ${e.message || e}  (open it with WebFetch or a browser instead)`);
  }
}
if (failures) process.exitCode = 1;
