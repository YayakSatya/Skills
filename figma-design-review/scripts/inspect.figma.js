// ===== figma-design-review inspect =====
// Read-only. Paste into a use_figma call with the frame's node id in ROOT_ID. It learns the design's
// own system from the frame (layout grid, type families and sizes, colours, spacing, radius, styles,
// variables and components in use) and reports where the frame departs from that system or from
// basic legibility. It never changes the file.
// SUMMARY = true returns the system, the per-section table and the top findings per section only.
const ROOT_ID = 'ROOT_ID';   // e.g. '12:345'
const SUMMARY = false;
const MAX_FINDINGS = 250;

const ROOT = await figma.getNodeByIdAsync(ROOT_ID);
if (!ROOT) return { error: `node ${ROOT_ID} not found` };
{
  let p = ROOT; while (p.parent && p.type !== 'PAGE') p = p.parent;
  if (p.type === 'PAGE' && p.id !== figma.currentPage.id) await figma.setCurrentPageAsync(p);
}

const r2 = v => Math.round(v * 100) / 100;
const box = n => n.absoluteBoundingBox || { x: 0, y: 0, width: n.width || 0, height: n.height || 0 };
const RB = box(ROOT);
const relX = n => r2(box(n).x - RB.x);
const kids = n => ('children' in n && n.children ? n.children.filter(c => c.visible !== false) : []);
const paints = arr => (Array.isArray(arr) ? arr : []).filter(p => p.visible !== false);
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2); };
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, bg, a) => '#' + rgb(fg).map((v, i) => Math.round(v * a + rgb(bg)[i] * (1 - a)).toString(16).padStart(2, '0')).join('').toUpperCase();
const count = (map, k, n) => { if (!map.has(k)) map.set(k, { n: 0, ids: [] }); const e = map.get(k); e.n++; if (n && e.ids.length < 40 && !e.ids.includes(n)) e.ids.push(n); };
const sorted = map => [...map.entries()].sort((a, b) => b[1].n - a[1].n);

// ---------- sections: the root's children, or the children of a single wrapper inside it
let secParent = ROOT;
while (kids(secParent).length === 1 && secParent.type !== 'INSTANCE' && kids(kids(secParent)[0]).length > 1
       && kids(secParent)[0].type !== 'INSTANCE') secParent = kids(secParent)[0];
const sections = kids(secParent);
const secIds = new Set(sections.map(s => s.id));
const sectionOf = n => { for (let p = n; p && p.id !== ROOT.id; p = p.parent) if (secIds.has(p.id)) return p; return null; };

// ---------- walk visible nodes once
const all = [];
const walk = (n, inInst) => {
  for (const c of kids(n)) { all.push({ n: c, inInst }); walk(c, inInst || c.type === 'INSTANCE'); }
};
walk(ROOT, ROOT.type === 'INSTANCE');
const inInstance = new Map(all.map(e => [e.n.id, e.inInst]));
const outermostInstance = n => { let hit = null; for (let p = n.parent; p && p.id !== ROOT.id; p = p.parent) if (p.type === 'INSTANCE') hit = p; return hit; };
const hasPaint = n => paints(n.fills).length > 0 || paints(n.strokes).length > 0;
// "On the ground": not inside an instance, nor inside a filled or stroked container (a card) below the section.
const onGround = n => {
  const sec = sectionOf(n);
  for (let p = n.parent; p && sec && p.id !== sec.id; p = p.parent) if (p.type === 'INSTANCE' || hasPaint(p)) return false;
  return !!sec;
};

const findings = [];
const add = (sev, rule, n, msg) => { const s = sectionOf(n); findings.push({ sev, rule, id: n.id, name: n.name, section: s ? s.name : null, msg }); };

// ---------- the layout grid
let grid = null, colStarts = [], colEnds = [];
const cg = (Array.isArray(ROOT.layoutGrids) ? ROOT.layoutGrids : []).find(g => g.pattern === 'COLUMNS' && g.visible !== false);
if (cg) {
  const W = RB.width, cnt = cg.count, gut = cg.gutterSize || 0, off = cg.offset || 0;
  let colW, start;
  if (cg.alignment === 'STRETCH') { colW = (W - 2 * off - (cnt - 1) * gut) / cnt; start = off; }
  else { colW = cg.sectionSize; const total = cnt * colW + (cnt - 1) * gut; start = cg.alignment === 'CENTER' ? (W - total) / 2 : cg.alignment === 'MAX' ? W - off - total : off; }
  for (let i = 0; i < cnt; i++) { colStarts.push(r2(start + i * (colW + gut))); colEnds.push(r2(start + i * (colW + gut) + colW)); }
  grid = { columns: cnt, alignment: cg.alignment, margin: off, gutter: gut, column: r2(colW) };
}

// ---------- system: text
const families = new Map(), sizes = new Map(), styleUse = new Map(), textInfo = new Map();
let styled = 0, unstyled = 0;
const styleNames = new Map();
for (const { n } of all.filter(e => e.n.type === 'TEXT')) {
  let segs = [];
  try { segs = n.getStyledTextSegments(['fontName', 'fontSize', 'fills', 'lineHeight']); } catch (e) { segs = []; }
  let max = 0, lh = null, bold = false, colour = null, alpha = 1;
  for (const s of segs) {
    count(families, s.fontName.family);
    count(sizes, s.fontSize, n.id);
    if (s.fontSize > max) {
      max = s.fontSize; bold = /bold|black|heavy|semi|extra/i.test(s.fontName.style || '');
      lh = s.lineHeight && s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value : s.lineHeight && s.lineHeight.unit === 'PERCENT' ? s.lineHeight.value * s.fontSize / 100 : s.fontSize * 1.2;
      const p = paints(s.fills).find(f => f.type === 'SOLID');
      if (p) { colour = hex(p.color); alpha = (p.opacity ?? 1) * (n.opacity ?? 1); }
    }
  }
  const sid = n.textStyleId;
  if (sid && sid !== figma.mixed) {
    styled++;
    if (!styleNames.has(sid)) { const st = await figma.getStyleByIdAsync(sid); styleNames.set(sid, st ? st.name : sid); }
    count(styleUse, styleNames.get(sid));
  } else if (!inInstance.get(n.id)) unstyled++;
  textInfo.set(n.id, { size: max, lh, bold, colour, alpha });
}

// ---------- system: colours, spacing, radius, variables, components
const colours = new Map(), spacing = new Map(), radii = new Map(), comps = new Map(), varIds = new Map();
let boundPaints = 0, rawPaints = 0;
for (const { n, inInst } of all) {
  for (const p of [...paints(n.fills), ...paints(n.strokes)]) {
    if (p.type !== 'SOLID') continue;
    if (p.boundVariables && p.boundVariables.color) { boundPaints++; count(varIds, p.boundVariables.color.id); }
    else if (!inInst) rawPaints++;
    if (!inInst) count(colours, hex(p.color), n.id);
  }
  if (n.type === 'INSTANCE' && !inInst) {
    let main = null; try { main = await n.getMainComponentAsync(); } catch (e) { main = n.mainComponent || null; }
    const name = main ? (main.parent && main.parent.type === 'COMPONENT_SET' ? `${main.parent.name} / ${main.name}` : main.name) : n.name;
    count(comps, name);
  }
  if (inInst) continue;
  if (n.layoutMode && n.layoutMode !== 'NONE') {
    const fields = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];
    if (n.primaryAxisAlignItems !== 'SPACE_BETWEEN') fields.push('itemSpacing');
    for (const f of fields) if (typeof n[f] === 'number' && n[f] > 0) count(spacing, n[f], n.id);
  }
  if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0) count(radii, n.cornerRadius, n.id);
}
const variables = [];
for (const [id, e] of sorted(varIds).slice(0, 40)) {
  let v = null; try { v = figma.variables && await figma.variables.getVariableByIdAsync(id); } catch (err) { v = null; }
  variables.push({ id, name: v ? v.name : null, uses: e.n });
}

// ---------- near-duplicates: a value used less, close to one used more, is probably a slip
const nearDupes = (map, close, rule, label) => {
  const entries = sorted(map);
  for (const [v, e] of entries) {
    const better = entries.find(([w, f]) => w !== v && f.n > e.n && close(v, w));
    if (better) for (const id of e.ids) { const n = all.find(x => x.n.id === id); if (n) add('minor', rule, n.n, `${label(v)} next to ${label(better[0])} (used ${better[1].n}×): probably meant ${label(better[0])}`); }
  }
};
nearDupes(colours, (a, b) => dist(a, b) <= 14, 'near-colour', v => v);
nearDupes(spacing, (a, b) => Math.abs(a - b) <= 2, 'near-spacing', v => `${v}px`);
nearDupes(radii, (a, b) => Math.abs(a - b) <= 2, 'near-radius', v => `radius ${v}`);
nearDupes(sizes, (a, b) => Math.abs(a - b) <= Math.max(1, b * 0.04), 'near-size', v => `${v}px type`);

// spacing base: 8 or 4 when most values sit on it
const spVals = sorted(spacing); const spTotal = spVals.reduce((s, [, e]) => s + e.n, 0);
const share = b => spTotal ? spVals.filter(([v]) => v % b === 0).reduce((s, [, e]) => s + e.n, 0) / spTotal : 0;
const spacingBase = share(8) >= 0.7 ? 8 : share(4) >= 0.7 ? 4 : null;
if (spacingBase) for (const [v, e] of spVals) if (v % spacingBase !== 0 && v > 2) for (const id of e.ids) {
  const n = all.find(x => x.n.id === id); if (n && !findings.some(f => f.id === id && f.rule === 'near-spacing')) add('minor', 'off-scale-spacing', n.n, `${v}px is off the ${spacingBase}px spacing base the rest of the frame uses`);
}

// ---------- per text node: contrast, size, lines, measure
const coverBox = (a, b) => a.x <= b.x + 0.5 && a.y <= b.y + 0.5 && a.x + a.width >= b.x + b.width - 0.5 && a.y + a.height >= b.y + b.height - 0.5;
const ownBg = n => {
  const fs = paints(n.fills);
  for (let i = fs.length - 1; i >= 0; i--) {
    const p = fs[i];
    if (p.type === 'IMAGE') return { image: true };
    if (p.type.startsWith('GRADIENT')) return { gradient: true };
    if (p.type === 'SOLID' && (p.opacity ?? 1) * (n.opacity ?? 1) >= 0.95) return { hex: hex(p.color) };
  }
  return null;
};
const backgroundOf = t => {
  const tb = box(t);
  for (let n = t; n && n.parent; n = n.parent) {
    const par = n.parent;
    if ('children' in par) {
      const sibs = par.children; const idx = sibs.findIndex(c => c.id === n.id);
      for (let i = idx - 1; i >= 0; i--) { const s = sibs[i]; if (s.visible === false || !coverBox(box(s), tb)) continue; const bg = ownBg(s); if (bg) return bg; }
    }
    if (par.type === 'PAGE') break;
    const bg = ownBg(par); if (bg) return bg;
    if (par.id === ROOT.id) break;
  }
  return { hex: '#FFFFFF', assumed: true };
};
const mobile = RB.width <= 600;
for (const { n } of all.filter(e => e.n.type === 'TEXT')) {
  const ti = textInfo.get(n.id); if (!ti || !ti.size) continue;
  const chars = (n.characters || '').trim(); if (!chars) continue;
  const bg = backgroundOf(n);
  if (ti.colour && bg.hex) {
    const fg = ti.alpha < 1 ? mix(ti.colour, bg.hex, ti.alpha) : ti.colour;
    const ratio = r2(contrast(fg, bg.hex));
    const large = ti.size >= 24 || (ti.size >= 18.5 && ti.bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) add(ratio < need - 1 ? 'major' : 'minor', 'contrast', n, `contrast ${ratio}:1 (${fg} on ${bg.hex}${bg.assumed ? ', page white assumed' : ''}), needs ${need}:1 for ${large ? 'large' : 'body'} text`);
  } else if (bg.image || bg.gradient) {
    add('check', 'text-on-image', n, `text on ${bg.image ? 'a photograph' : 'a gradient'}: check legibility in the screenshot (headline and the smaller text)`);
  }
  if (ti.size < 12) add('minor', 'tiny-text', n, `${ti.size}px text is below 12px`);
  else if (mobile && ti.size < 14 && chars.length > 40) add('minor', 'small-body', n, `${ti.size}px running text on a phone frame; 14–16px reads better`);
  const lines = ti.lh ? Math.round(box(n).height / ti.lh) : 1;
  if (ti.size >= 40 && lines > 3) add('major', 'headline-lines', n, `${ti.size}px headline runs ${lines} lines; cut words or widen it`);
  else if (ti.size >= 32 && lines > 3) add('minor', 'headline-lines', n, `${ti.size}px heading runs ${lines} lines`);
  if (ti.size <= 24 && lines > 1) {
    const cpl = Math.round(box(n).width / (ti.size * 0.5));
    if (cpl > 95) add('minor', 'measure', n, `about ${cpl} characters per line; 60–80 reads better (narrow the text box)`);
  }
  // clipped by a clipping ancestor
  for (let p = n.parent; p && p.id !== secParent.id && p.type !== 'PAGE'; p = p.parent) {
    if (p.clipsContent && !coverBox(box(p), box(n))) { add('major', 'clipped', n, `text overflows "${p.name}", which clips it`); break; }
  }
}

// ---------- alignment: left edges on the ground of each section, and the column grid
const blocksOf = sec => {
  const out = [], seen = new Set();
  for (const { n } of all) {
    if (sectionOf(n) !== sec || n.id === sec.id) continue;
    const inst = outermostInstance(n);
    if (inst) { if (onGround(inst) && !seen.has(inst.id)) { seen.add(inst.id); out.push(inst); } continue; }
    if (!onGround(n)) continue;
    const isImg = paints(n.fills).some(p => p.type === 'IMAGE');
    const isText = n.type === 'TEXT' && (n.textAlignHorizontal || 'LEFT') === 'LEFT';
    if (isText || n.type === 'INSTANCE' || isImg || (n.type !== 'TEXT' && hasPaint(n) && box(n).width < box(sec).width - 1)) { if (!seen.has(n.id)) { seen.add(n.id); out.push(n); } }
  }
  return out;
};
const secRows = [];
for (const sec of sections) {
  const blocks = blocksOf(sec);
  const edges = new Map();
  for (const b of blocks) count(edges, relX(b), b.id);
  const es = sorted(edges);
  for (const [x, e] of es) {
    const better = es.find(([y, f]) => y !== x && f.n >= e.n && Math.abs(x - y) <= 6 && (f.n > e.n || y < x));
    if (better) for (const id of e.ids) { const b = blocks.find(k => k.id === id); add('minor', 'near-edge', b, `left edge ${x} is ${r2(Math.abs(x - better[0]))}px off ${better[0]}, where ${better[1].n} other block(s) start`); }
  }
  const distinct = es.filter(([x], i) => !es.slice(0, i).some(([y]) => Math.abs(x - y) <= 6)).length;
  if (distinct > 4) add('minor', 'ragged', sec, `${distinct} different left edges in one section; two or three read calmer`);
  if (grid) for (const b of blocks) {
    const x = relX(b), w = r2(box(b).width);
    const onStart = colStarts.some(c => Math.abs(c - x) <= 1);
    const fullBleed = x <= 1 && w >= RB.width - 1;
    if (!onStart && !fullBleed && !findings.some(f => f.id === b.id && f.rule === 'near-edge')) add('minor', 'off-grid', b, `starts at ${x}, not on a column line of the frame's ${grid.columns}-column grid`);
    // right edges only for pictures and cards: ragged-right text and sized buttons end where they end
    const hug = b.type === 'TEXT' || b.type === 'INSTANCE' || b.layoutSizingHorizontal === 'HUG';
    if (onStart && !hug && !fullBleed && w > colEnds[0] - colStarts[0] + 1 && !colEnds.some(c => Math.abs(c - (x + w)) <= 1)) add('minor', 'off-grid', b, `ends at ${r2(x + w)}, not on a column line (width ${w})`);
  }
  // empty image slots and small tap targets
  for (const { n } of all) {
    if (sectionOf(n) !== sec) continue;
    if (/^(image|img|photo|foto|gambar|picture)\b/i.test(n.name) && !paints(n.fills).some(p => p.type === 'IMAGE')
        && !('findAll' in n && n.findAll(c => paints(c.fills).some(p => p.type === 'IMAGE')).length)) add('major', 'empty-image', n, 'image slot without a picture');
    if (mobile && (n.type === 'INSTANCE' || n.type === 'FRAME') && /button|btn|tombol|link|tab|icon/i.test(n.name) && box(n).height < 44 && !inInstance.get(n.id)) add('minor', 'tap-size', n, `tap target ${r2(box(n).height)}px high; 44px minimum on a phone`);
  }
  secRows.push({ id: sec.id, name: sec.name, y: r2(box(sec).y - RB.y), height: r2(box(sec).height), blocks: blocks.length, leftEdges: distinct });
}

// ---------- system-level notes
const famList = sorted(families);
if (famList.length > 3) add('minor', 'families', ROOT, `${famList.length} type families (${famList.map(f => f[0]).join(', ')}); two usually do the work`);
const sizeList = sorted(sizes).map(([v, e]) => ({ size: v, uses: e.n })).sort((a, b) => b.size - a.size);
if (sizeList.length > 12) add('minor', 'sizes', ROOT, `${sizeList.length} different type sizes; a scale of 8–10 is easier to keep consistent`);

// ---------- per-section table with a measured hint (the screenshot decides the verdict)
const sevRank = { major: 0, minor: 1, check: 2 };
findings.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
for (const row of secRows) {
  const f = findings.filter(x => x.section === row.name);
  row.major = f.filter(x => x.sev === 'major').length;
  row.minor = f.filter(x => x.sev === 'minor').length;
  row.check = f.filter(x => x.sev === 'check').length;
  row.hint = row.major === 0 && row.minor <= 2 ? 'keep' : row.major <= 1 && row.minor <= 8 ? 'polish' : 'look closer';
}

const system = {
  frame: { id: ROOT.id, name: ROOT.name, width: r2(RB.width), height: r2(RB.height), mobile },
  grid,
  families: famList.map(([v, e]) => ({ family: v, uses: e.n })),
  sizes: sizeList,
  colours: sorted(colours).slice(0, 16).map(([v, e]) => ({ hex: v, uses: e.n })),
  spacing: spVals.map(([v, e]) => ({ px: v, uses: e.n })).sort((a, b) => a.px - b.px),
  spacingBase,
  radii: sorted(radii).map(([v, e]) => ({ radius: v, uses: e.n })),
  textStyles: { styled, unstyled, used: sorted(styleUse).map(([v, e]) => ({ style: v, uses: e.n })) },
  paints: { bound: boundPaints, raw: rawPaints },
  variables,
  components: sorted(comps).map(([v, e]) => ({ component: v, uses: e.n })),
};
const totals = { major: findings.filter(f => f.sev === 'major').length, minor: findings.filter(f => f.sev === 'minor').length, check: findings.filter(f => f.sev === 'check').length };
if (SUMMARY) {
  const top = {};
  for (const row of secRows) top[row.name] = findings.filter(f => f.section === row.name).slice(0, 5).map(f => `${f.sev} ${f.rule}: ${f.name} — ${f.msg}`);
  return { system, sections: secRows, totals, top };
}
return { system, sections: secRows, totals, findings: findings.slice(0, MAX_FINDINGS), truncated: findings.length > MAX_FINDINGS };
