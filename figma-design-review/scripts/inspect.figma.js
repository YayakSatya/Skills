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

// ---------- sections: the root's children, or the children of a single wrapper inside it.
// Empty layers (no children, no paint) do not count: a forgotten empty frame stacked on the page
// must not hide the real sections.
const isEmptyLayer = n => 'children' in n && kids(n).length === 0 && paints(n.fills).length === 0 && paints(n.strokes).length === 0;
const content = n => kids(n).filter(c => !isEmptyLayer(c));
let secParent = ROOT;
while (content(secParent).length === 1 && secParent.type !== 'INSTANCE' && content(content(secParent)[0]).length > 1
       && content(secParent)[0].type !== 'INSTANCE') secParent = content(secParent)[0];
const sections = content(secParent);
const secIds = new Set(sections.map(s => s.id));
const sectionOf = n => { for (let p = n; p && p.id !== ROOT.id; p = p.parent) if (secIds.has(p.id)) return p; return null; };
// sections often share a name ("sec", "Section"): label them "sec #2" so the table stays readable
const secLabel = new Map();
{ const seen = new Map(), total = new Map();
  for (const s of sections) total.set(s.name, (total.get(s.name) || 0) + 1);
  for (const s of sections) { const i = (seen.get(s.name) || 0) + 1; seen.set(s.name, i); secLabel.set(s.id, total.get(s.name) > 1 ? `${s.name} #${i}` : s.name); } }

// ---------- walk visible nodes once
const all = [];
const walk = (n, inInst) => {
  for (const c of kids(n)) { all.push({ n: c, inInst }); walk(c, inInst || c.type === 'INSTANCE'); }
};
walk(ROOT, ROOT.type === 'INSTANCE');
const inInstance = new Map(all.map(e => [e.n.id, e.inInst]));
const findingsEarly = [];
for (const c of kids(ROOT)) if (isEmptyLayer(c)) findingsEarly.push(c);
const outermostInstance = n => { let hit = null; for (let p = n.parent; p && p.id !== ROOT.id; p = p.parent) if (p.type === 'INSTANCE') hit = p; return hit; };
const hasPaint = n => paints(n.fills).length > 0 || paints(n.strokes).length > 0;
// "On the ground": not inside an instance, nor inside a filled or stroked container (a card) below the section.
const onGround = n => {
  const sec = sectionOf(n);
  for (let p = n.parent; p && sec && p.id !== sec.id; p = p.parent) if (p.type === 'INSTANCE' || hasPaint(p)) return false;
  return !!sec;
};

const findings = [];
const add = (sev, rule, n, msg) => { const s = sectionOf(n); findings.push({ sev, rule, id: n.id, name: n.name, section: s ? secLabel.get(s.id) : null, sectionId: s ? s.id : null, msg }); };

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
const colourRole = new Map();   // hex → Set of 'text' | 'surface' | 'stroke'
let boundPaints = 0, rawPaints = 0;
for (const { n, inInst } of all) {
  for (const p of [...paints(n.fills), ...paints(n.strokes)]) {
    if (p.type !== 'SOLID') continue;
    if (!inInst) { const h = hex(p.color); if (!colourRole.has(h)) colourRole.set(h, new Set());
      colourRole.get(h).add(paints(n.strokes).includes(p) ? 'stroke' : n.type === 'TEXT' ? 'text' : 'surface'); }
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
// One finding per pair of values, on the first layer, with every layer's id in `ids`.
const nearDupes = (map, close, rule, label, roleNote) => {
  const entries = sorted(map);
  for (const [v, e] of entries) {
    const better = entries.find(([w, f]) => w !== v && f.n > e.n && close(v, w));
    if (!better) continue;
    const nodes = e.ids.map(id => all.find(x => x.n.id === id)).filter(Boolean).map(x => x.n);
    if (!nodes.length) continue;
    const note = roleNote ? roleNote(v, better[0]) : null;
    add(note ? 'check' : 'minor', rule, nodes[0], `${label(v)} on ${e.n} layer(s) next to ${label(better[0])} used ${better[1].n}×: ${note || `probably meant ${label(better[0])}`}`);
    findings[findings.length - 1].ids = nodes.map(n => n.id);
  }
};
// two near-identical colours in different roles (a surface and a text ink) may be on purpose
const roleNote = (a, b) => {
  const ra = [...(colourRole.get(a) || [])], rb = [...(colourRole.get(b) || [])];
  return ra.length && rb.length && !ra.some(r => rb.includes(r)) ? `${a} is used for ${ra.join('/')}, ${b} for ${rb.join('/')}; different roles, so check it is intended (warm and cool near-blacks side by side often read as a mismatch)` : null;
};
nearDupes(colours, (a, b) => dist(a, b) <= 14, 'near-colour', v => v, roleNote);
nearDupes(spacing, (a, b) => Math.abs(a - b) <= 2, 'near-spacing', v => `${v}px`);
nearDupes(radii, (a, b) => Math.abs(a - b) <= 2, 'near-radius', v => `radius ${v}`);
nearDupes(sizes, (a, b) => Math.abs(a - b) <= Math.max(1, b * 0.04), 'near-size', v => `${v}px type`);

// spacing base: 8 or 4 when most values sit on it
const spVals = sorted(spacing); const spTotal = spVals.reduce((s, [, e]) => s + e.n, 0);
const share = b => spTotal ? spVals.filter(([v]) => v % b === 0).reduce((s, [, e]) => s + e.n, 0) / spTotal : 0;
const spacingBase = share(8) >= 0.7 ? 8 : share(4) >= 0.7 ? 4 : null;
// A design scaled up (1440 → 1920 is ×1.33) leaves values like 13, 27, 43, 213: whole even numbers
// at the original size. Report the factor instead of calling every value off-scale.
let scaled = null;
if (!spacingBase && spTotal >= 8) {
  const big = spVals.filter(([v]) => v >= 3); const bigTotal = big.reduce((t, [, e]) => t + e.n, 0);
  const evenShare = f => bigTotal ? big.filter(([v]) => { const u = v / f; return Math.abs(u - 2 * Math.round(u / 2)) <= 0.3; }).reduce((t, [, e]) => t + e.n, 0) / bigTotal : 0;
  const plain = evenShare(1);
  for (const f of [4 / 3, 1.5, 2, 1.25]) {
    const sh = evenShare(f);
    if (sh >= 0.85 && sh - plain >= 0.3 && (!scaled || sh > scaled.share)) scaled = { factor: r2(f), raw: f, share: r2(sh), unscaledShare: r2(plain), from: Math.round(RB.width / f) };
  }
  if (scaled) scaled.examples = big.map(([v]) => v).filter(v => v % 2).sort((x, y) => y - x).slice(0, 3).map(v => `${v} = ${Math.round(v / scaled.raw)}×${scaled.factor}`);
}
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
// Translucent solid layers (a scrim, a shade) between the text and what is behind it are collected
// and composited: over a solid they give the exact colour, over a photograph a best and worst case.
const overlayOf = n => {
  const fs = paints(n.fills); const p = fs[fs.length - 1];
  if (!p || p.type !== 'SOLID') return null;
  const a = (p.opacity ?? 1) * (n.opacity ?? 1);
  return a > 0.02 && a < 0.95 ? { hex: hex(p.color), a } : null;
};
const composite = (base, overlays) => overlays.slice().reverse().reduce((bg, o) => mix(o.hex, bg, o.a), base);
const backgroundOf = t => {
  const tb = box(t); const overlays = [];
  const look = n => { const bg = ownBg(n); if (bg) return bg; const o = overlayOf(n); if (o) overlays.push(o); return null; };
  const done = bg => bg.hex ? { hex: composite(bg.hex, overlays) } : { ...bg, overlays };
  for (let n = t; n && n.parent; n = n.parent) {
    const par = n.parent;
    if ('children' in par) {
      const sibs = par.children; const idx = sibs.findIndex(c => c.id === n.id);
      for (let i = idx - 1; i >= 0; i--) { const s = sibs[i]; if (s.visible === false || !coverBox(box(s), tb)) continue; const bg = look(s); if (bg) return done(bg); }
    }
    if (par.type === 'PAGE') break;
    const bg = look(par); if (bg) return done(bg);
    if (par.id === ROOT.id) break;
  }
  return { hex: composite('#FFFFFF', overlays), assumed: true };
};
const mobile = RB.width <= 600;
const overflows = [];   // text sticking out of a frame with nothing hit: one finding per section
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
    const what = bg.image ? 'a photograph' : 'a gradient';
    if (ti.colour && bg.overlays.length) {
      // the photo's lightest and darkest pixels under the overlay: the real ratio lies between
      const fgOn = b => ti.alpha < 1 ? mix(ti.colour, b, ti.alpha) : ti.colour;
      const onWhite = composite('#FFFFFF', bg.overlays), onBlack = composite('#000000', bg.overlays);
      const worst = r2(Math.min(contrast(fgOn(onWhite), onWhite), contrast(fgOn(onBlack), onBlack)));
      const best = r2(Math.max(contrast(fgOn(onWhite), onWhite), contrast(fgOn(onBlack), onBlack)));
      const large = ti.size >= 24 || (ti.size >= 18.5 && ti.bold);
      const need = large ? 3 : 4.5;
      const shade = bg.overlays.map(o => `${o.hex} at ${Math.round(o.a * 100)}%`).join(' + ');
      if (best < need) add('major', 'contrast', n, `on ${what} under ${shade}: at most ${best}:1 anywhere in the picture, needs ${need}:1`);
      else if (worst < need) add('check', 'text-on-image', n, `on ${what} under ${shade}: ${worst}:1 where the picture is ${contrast(ti.colour, '#FFFFFF') > contrast(ti.colour, '#000000') ? 'dark' : 'light'}, ${best}:1 at best; needs ${need}:1, check the area behind it in the screenshot`);
    } else add('check', 'text-on-image', n, `text on ${what} with no overlay: check legibility in the screenshot (headline and the smaller text)`);
  }
  if (ti.size < 12) add('minor', 'tiny-text', n, `${ti.size}px text is below 12px`);
  else if (mobile && ti.size < 14 && chars.length > 40) add('minor', 'small-body', n, `${ti.size}px running text on a phone frame; 14–16px reads better`);
  const lines = ti.lh ? Math.round(box(n).height / ti.lh) : 1;
  // a long sentence set large is a statement, not a headline: judged more gently
  const statement = chars.length > 100;
  if (ti.size >= 40 && lines > 3 && !statement) add('major', 'headline-lines', n, `${ti.size}px headline runs ${lines} lines; cut words or widen it`);
  else if (ti.size >= 32 && lines > 3 && !statement) add('minor', 'headline-lines', n, `${ti.size}px heading runs ${lines} lines`);
  else if (ti.size >= 40 && lines > 4 && statement) add('minor', 'statement-lines', n, `${chars.length}-character statement at ${ti.size}px runs ${lines} lines; a shorter sentence or one step down the scale reads faster`);
  // text wider than its (non-clipping) frame: spills out, and may run into a neighbour
  const par = n.parent;
  if (par && par.type !== 'PAGE' && par.id !== ROOT.id && !secIds.has(par.id) && !par.clipsContent) {
    const tb = box(n), pb = box(par);
    const right = tb.x + tb.width - (pb.x + pb.width), left = pb.x - tb.x;
    if (right > 2 || left > 2) {
      const strip = right > 2 ? { x: pb.x + pb.width, y: tb.y, width: right, height: tb.height } : { x: tb.x, y: tb.y, width: left, height: tb.height };
      const hits = (par.parent && 'children' in par.parent ? par.parent.children : []).filter(c => c.id !== par.id && c.visible !== false && (() => {
        const b = box(c); return b.x < strip.x + strip.width && b.x + b.width > strip.x && b.y < strip.y + strip.height && b.y + b.height > strip.y; })());
      if (hits.length) add('major', 'overlap', n, `"${chars.slice(0, 24)}" is ${Math.round(Math.max(right, left))}px wider than its frame "${par.name}" and runs into "${hits[0].name}"; let the frame hug the text or move the neighbour`);
      else overflows.push({ n, par, px: Math.round(Math.max(right, left)), chars });
    }
  }
  if (ti.size <= 24 && lines > 1) {
    const cpl = Math.round(box(n).width / (ti.size * 0.5));
    if (cpl > 95) add('minor', 'measure', n, `about ${cpl} characters per line; 60–80 reads better (narrow the text box)`);
  }
  // clipped by a clipping ancestor
  for (let p = n.parent; p && p.id !== secParent.id && p.type !== 'PAGE'; p = p.parent) {
    if (p.clipsContent && !coverBox(box(p), box(n))) { add('major', 'clipped', n, `text overflows "${p.name}", which clips it`); break; }
  }
}

for (const sec of [...sections, null]) {
  const o = overflows.filter(x => sectionOf(x.n) === sec).sort((a, b) => b.px - a.px);
  if (!o.length) continue;
  const worst = o[0];
  add('minor', 'overflow', worst.n, o.length === 1
    ? `"${worst.chars.slice(0, 24)}" sticks out of its frame "${worst.par.name}" by ${worst.px}px; let the frame hug the text`
    : `${o.length} text layers stick out of their fixed-width frames by ${o[o.length - 1].px}–${worst.px}px (worst: "${worst.chars.slice(0, 24)}" in "${worst.par.name}"); let those frames hug their text${scaled ? ' (typical after scaling a design: the frames were scaled, the text reflowed)' : ''}`);
  findings[findings.length - 1].ids = o.map(x => x.n.id);
}

// ---------- alignment: left edges on the ground of each section, and the column grid
const blocksOf = sec => {
  const out = [], seen = new Set();
  for (const { n } of all) {
    if (sectionOf(n) !== sec || n.id === sec.id) continue;
    const inst = outermostInstance(n);
    if (inst) { if (onGround(inst) && !seen.has(inst.id)) { seen.add(inst.id); out.push(inst); } continue; }
    if (!onGround(n)) continue;
    // items of a row (nav links, buttons, footer columns, logos) other than the first do not make their
    // own edge: a row of three or more, or of hugging items, is structured by the row itself
    let inRow = false;
    for (let c = n, p = n.parent; p; c = p, p = p.parent) {
      const row = kids(p);
      if (p.layoutMode === 'HORIZONTAL' && row[0] && row[0].id !== c.id && (row.length >= 3 || c.layoutSizingHorizontal === 'HUG')) { inRow = true; break; }
      if (p.id === sec.id) break;
    }
    if (inRow) continue;
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
  secRows.push({ id: sec.id, name: secLabel.get(sec.id), y: r2(box(sec).y - RB.y), height: r2(box(sec).height), blocks: blocks.length, leftEdges: distinct });
}

// ---------- system-level notes
for (const e of findingsEarly) add('minor', 'empty-layer', e, `empty ${e.type.toLowerCase()} ${Math.round(e.width)}×${Math.round(e.height)} on the page: delete it (it can also catch clicks meant for the design)`);
if (scaled) add('minor', 'scaled', ROOT, `spacing looks scaled ×${scaled.factor} from a ${scaled.from}-wide design: ${Math.round(scaled.share * 100)}% of the values are whole even numbers at that size (${Math.round(scaled.unscaledShare * 100)}% at this one)${scaled.examples.length ? `, e.g. ${scaled.examples.join(', ')}` : ''}; round to a scale at this size`);
const famList = sorted(families);
if (famList.length > 3) add('minor', 'families', ROOT, `${famList.length} type families (${famList.map(f => f[0]).join(', ')}); two usually do the work`);
const sizeList = sorted(sizes).map(([v, e]) => ({ size: v, uses: e.n })).sort((a, b) => b.size - a.size);
if (sizeList.length > 12) add('minor', 'sizes', ROOT, `${sizeList.length} different type sizes; a scale of 8–10 is easier to keep consistent`);

// ---------- per-section table with a measured hint (the screenshot decides the verdict)
const sevRank = { major: 0, minor: 1, check: 2 };
findings.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
for (const row of secRows) {
  const f = findings.filter(x => x.sectionId === row.id);
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
  spacingBase, scaled,
  radii: sorted(radii).map(([v, e]) => ({ radius: v, uses: e.n })),
  textStyles: { styled, unstyled, used: sorted(styleUse).map(([v, e]) => ({ style: v, uses: e.n })) },
  paints: { bound: boundPaints, raw: rawPaints },
  variables,
  components: sorted(comps).map(([v, e]) => ({ component: v, uses: e.n })),
};
const totals = { major: findings.filter(f => f.sev === 'major').length, minor: findings.filter(f => f.sev === 'minor').length, check: findings.filter(f => f.sev === 'check').length };
if (SUMMARY) {
  const top = {};
  top['(frame)'] = findings.filter(f => !f.sectionId).slice(0, 5).map(f => `${f.sev} ${f.rule}: ${f.name} — ${f.msg}`);
  for (const row of secRows) top[row.name] = findings.filter(f => f.sectionId === row.id).slice(0, 5).map(f => `${f.sev} ${f.rule}: ${f.name} — ${f.msg}`);
  return { system, sections: secRows, totals, top };
}
return { system, sections: secRows, totals, findings: findings.slice(0, MAX_FINDINGS), truncated: findings.length > MAX_FINDINGS };
