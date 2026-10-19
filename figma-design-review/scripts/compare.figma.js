// ===== figma-design-review compare =====
// Read-only. Compares a working copy with the original frame it was duplicated from and lists every
// change by section: properties changed, layers added, layers removed. Put the review's Keep sections
// in KEEP: any change inside them is a violation and the verdict is FAIL. BUDGET is the largest share
// of layers a Polish or Re-layout pass may touch; going over it is reported, not hidden.
// Layers are paired by their path of names (with an index among same-named siblings), so renaming a
// layer in the copy shows up as one removal plus one addition.
const ORIGINAL_ID = 'ORIGINAL_ID';   // e.g. '12:345'
const COPY_ID = 'COPY_ID';           // e.g. '12:900'
const KEEP = [];                     // section names, e.g. ['Hero', 'Footer']
const BUDGET = 0.25;                 // Polish 0.25, Re-layout 0.6
const MAX_CHANGES = 200;

const A = await figma.getNodeByIdAsync(ORIGINAL_ID);
const B = await figma.getNodeByIdAsync(COPY_ID);
if (!A || !B) return { error: `node ${!A ? ORIGINAL_ID : COPY_ID} not found` };

const r2 = v => Math.round(v * 100) / 100;
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const paintSig = arr => !Array.isArray(arr) ? String(arr) : arr.filter(p => p.visible !== false).map(p =>
  p.type === 'SOLID' ? `${hex(p.color)}${(p.opacity ?? 1) < 1 ? '@' + r2(p.opacity) : ''}${p.boundVariables && p.boundVariables.color ? '{' + p.boundVariables.color.id + '}' : ''}`
  : p.type === 'IMAGE' ? `image:${p.imageHash}:${p.scaleMode || ''}` : p.type).join(',');
const val = (n, k) => {
  if (!(k in n)) return undefined;
  const v = n[k];
  if (v === figma.mixed) return 'mixed';
  if (k === 'fills' || k === 'strokes') return paintSig(v);
  if (k === 'effects') return Array.isArray(v) ? v.filter(e => e.visible !== false).map(e => e.type).join(',') : '';
  if (k === 'fontName') return v && v.family ? `${v.family} ${v.style}` : String(v);
  if (typeof v === 'number') return r2(v);
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v;
};
const PROPS = ['visible', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'fills', 'strokes', 'strokeWeight', 'effects',
  'cornerRadius', 'layoutMode', 'layoutWrap', 'itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft',
  'paddingRight', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'layoutSizingHorizontal', 'layoutSizingVertical',
  'layoutPositioning', 'clipsContent', 'characters', 'fontSize', 'fontName', 'textStyleId', 'fillStyleId',
  'textAlignHorizontal', 'lineHeight', 'letterSpacing', 'textCase'];
const kids = n => ('children' in n && n.children ? n.children : []);
const keyed = n => { const seen = new Map(); return kids(n).map(c => { const i = seen.get(c.name) || 0; seen.set(c.name, i + 1); return [`${c.name}#${i}`, c]; }); };

// sections, as in inspect: the children of the root, or of a single wrapper inside it
const secParentOf = root => { let p = root; while (kids(p).filter(c => c.visible !== false).length === 1 && kids(kids(p)[0]).length > 1 && kids(p)[0].type !== 'INSTANCE') p = kids(p)[0]; return p; };
const depthA = (() => { const target = secParentOf(A); let d = 0; for (let p = A; p !== target; p = kids(p).find(c => c.visible !== false)) d++; return d; })();

const changes = [], added = [], removed = [];
const bySection = new Map();
const sec = name => { if (!bySection.has(name)) bySection.set(name, { section: name, changed: 0, added: 0, removed: 0, nodes: 0 }); return bySection.get(name); };
let total = 0, touched = 0;
const pair = async (a, b, path, depth, section) => {
  const secName = depth === depthA + 1 ? a.name : section;
  total++;
  if (secName) sec(secName).nodes++;
  let changedHere = false;
  for (const k of PROPS) {
    if (depth === 0 && (k === 'x' || k === 'y')) continue;
    const va = val(a, k), vb = val(b, k);
    if (va === vb) continue;
    changedHere = true;
    changes.push({ section: secName || '(frame)', path: path.join(' / ') || b.name, id: b.id, prop: k, from: va, to: vb });
  }
  if (a.type !== b.type) { changedHere = true; changes.push({ section: secName || '(frame)', path: path.join(' / '), id: b.id, prop: 'type', from: a.type, to: b.type }); }
  if (a.type === 'INSTANCE' && b.type === 'INSTANCE') {
    let ma = null, mb = null;
    try { ma = await a.getMainComponentAsync(); mb = await b.getMainComponentAsync(); } catch (e) { ma = a.mainComponent; mb = b.mainComponent; }
    if ((ma && ma.id) !== (mb && mb.id)) { changedHere = true; changes.push({ section: secName || '(frame)', path: path.join(' / '), id: b.id, prop: 'component', from: ma && ma.name, to: mb && mb.name }); }
  }
  if (changedHere) { touched++; if (secName) sec(secName).changed++; }
  const ka = keyed(a), kb = new Map(keyed(b));
  // the copy's root may be renamed; its sections may not
  for (const [k, ca] of ka) {
    const cb = kb.get(k);
    if (!cb) { removed.push({ section: secName || ca.name, path: [...path, ca.name].join(' / '), id: ca.id }); if (secName || depth === depthA) sec(secName || ca.name).removed++; continue; }
    kb.delete(k);
    await pair(ca, cb, [...path, ca.name], depth + 1, secName);
  }
  for (const [, cb] of kb) { added.push({ section: secName || cb.name, path: [...path, cb.name].join(' / '), id: cb.id }); if (secName || depth === depthA) sec(secName || cb.name).added++; }
};
await pair(A, B, [], 0, null);

const sections = [...bySection.values()].map(s => ({ ...s, untouched: s.changed + s.added + s.removed === 0 }));
const keepViolations = sections.filter(s => KEEP.includes(s.section) && !s.untouched).map(s => s.section);
const missingKeep = KEEP.filter(k => !bySection.has(k));
const share = total ? r2((touched + added.length + removed.length) / total) : 0;
const overBudget = share > BUDGET;
return {
  verdict: keepViolations.length || missingKeep.length ? 'FAIL' : 'OK',
  share, budget: BUDGET, overBudget,
  totals: { layers: total, changed: touched, added: added.length, removed: removed.length },
  keepViolations, missingKeep,
  sections,
  changes: changes.slice(0, MAX_CHANGES), added: added.slice(0, 60), removed: removed.slice(0, 60),
  truncated: changes.length > MAX_CHANGES,
};
