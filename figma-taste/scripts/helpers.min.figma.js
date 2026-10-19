// figma-taste helpers (min). Generated from helpers.figma.js by build-min.mjs. Do not edit by hand.
const COLLECTION_PREFIX = null;   // e.g. 'Arunika ·'
const STYLE_PREFIX = null;        // e.g. 'Arunika/'
const FONTS = [];                 // e.g. [['Switzer', 'Regular'], ['Switzer', 'Medium'], ['Newsreader', 'Regular']]
for (const [family, style] of FONTS) await figma.loadFontAsync({ family, style });
const __cols = await figma.variables.getLocalVariableCollectionsAsync();
const __allowed = new Set(__cols.filter(c => !COLLECTION_PREFIX || c.name.startsWith(COLLECTION_PREFIX)).map(c => c.id));
const __vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of __vars) { if (__allowed.has(v.variableCollectionId) && !V[v.name]) V[v.name] = v; }
const __styles = await figma.getLocalTextStylesAsync();
const S = {};
for (const s of __styles) {
  if (STYLE_PREFIX && !s.name.startsWith(STYLE_PREFIX)) continue;
  const key = STYLE_PREFIX ? s.name.slice(STYLE_PREFIX.length) : s.name;
  if (!S[key]) S[key] = s;
}
const __created = [];
const __notes = [];
const track = n => { __created.push(n.id); return n; };
function need(map, name, kind) {
  const x = map[name];
  if (!x) throw new Error(`figma-taste: missing ${kind} "${name}". Add it to the design system first.`);
  return x;
}
function paint(varName, opacity) {
  const base = { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: opacity ?? 1 };
  return figma.variables.setBoundVariableForPaint(base, 'color', need(V, varName, 'variable'));
}
function fill(node, varName, opacity) { node.fills = varName ? [paint(varName, opacity)] : []; return node; }
function bind(node, field, token) {
  if (token == null) return node;
  if (typeof token === 'number') { if (token !== 0) __notes.push(`raw ${field}=${token} on ${node.name}`); node[field] = token; return node; }
  node.setBoundVariable(field, need(V, token, 'variable'));
  return node;
}
function pad(node, y, x = y) {
  bind(node, 'paddingTop', y); bind(node, 'paddingBottom', y);
  bind(node, 'paddingLeft', x); bind(node, 'paddingRight', x);
  return node;
}
function stack(dir, name, o = {}) {
  const f = figma.createAutoLayout(dir === 'H' || dir === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL');
  f.name = name;
  f.fills = [];
  f.clipsContent = !!o.clip;
  if (o.gap != null) bind(f, 'itemSpacing', o.gap);
  if (o.pad != null) pad(f, o.pad);
  if (o.padX != null) { bind(f, 'paddingLeft', o.padX); bind(f, 'paddingRight', o.padX); }
  if (o.padY != null) { bind(f, 'paddingTop', o.padY); bind(f, 'paddingBottom', o.padY); }
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.wrap) { f.layoutWrap = 'WRAP'; if (o.rowGap != null) bind(f, 'counterAxisSpacing', o.rowGap); }
  if (o.fill) fill(f, o.fill);
  return track(f);
}
function add(parent, child, o = {}) {
  parent.appendChild(child);
  if (typeof o.w === 'number') { child.resize(o.w, child.height); child.layoutSizingHorizontal = 'FIXED'; }
  else if (o.w) child.layoutSizingHorizontal = o.w;
  if (typeof o.h === 'number') { child.resize(child.width, o.h); child.layoutSizingVertical = 'FIXED'; }
  else if (o.h) child.layoutSizingVertical = o.h;
  if (o.grow != null) child.layoutGrow = o.grow;
  return child;
}
function section(page, name, o = {}) {
  const s = stack(o.dir || 'V', `Section/${name}`, {
    gap: o.gap ?? 'layout/stack-l',
    padX: o.padX ?? 'layout/margin',
    padY: o.padY ?? 'layout/section-pad',
    justify: o.justify, align: o.align, fill: o.fill, clip: o.clip,
  });
  add(page, s, { w: 'FILL' });
  return s;
}
function dummy(node, what) {
  let ok = false;
  try {
    const prev = Array.isArray(node.annotations) ? node.annotations : [];
    if (!prev.some(a => a.label && a.label.startsWith('Dummy'))) node.annotations = [...prev, { label: what ? `Dummy: ${what}` : 'Dummy' }];
    ok = true;
  } catch (e) { /* annotations unavailable on this node type or API version */ }
  if (!/ · dummy$/.test(node.name)) node.name = `${node.name} · dummy`;
  if (!ok) __notes.push(`dummy marked by name only: ${node.name}`);
  return node;
}
async function txt(parent, str, styleName, colorVar = 'fg/default', o = {}) {
  const st = need(S, styleName, 'text style');
  await figma.loadFontAsync(st.fontName);
  const t = figma.createText();
  if (typeof t.setTextStyleIdAsync === 'function') await t.setTextStyleIdAsync(st.id); else t.textStyleId = st.id;
  t.characters = str;
  fill(t, colorVar);
  t.name = o.name || str.replace(/\s+/g, ' ').slice(0, 40);
  parent.appendChild(t);
  const w = o.w ?? 'FILL';
  if (o.maxW) {
    t.layoutSizingHorizontal = 'FIXED';
    bind(t, 'width', o.maxW);
    t.textAutoResize = 'HEIGHT';
  } else if (w === 'HUG') { t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.layoutSizingHorizontal = 'HUG'; }
  else if (typeof w === 'number') { t.resize(w, t.height); t.textAutoResize = 'HEIGHT'; }
  else { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; }
  if (o.grow != null) t.layoutGrow = o.grow;
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.dummy) dummy(t, typeof o.dummy === 'string' ? o.dummy : undefined);
  return track(t);
}
async function inst(parent, id, props = {}, size = {}) {
  const c = await figma.getNodeByIdAsync(id);
  if (!c) throw new Error(`figma-taste: component ${id} not found`);
  let comp = c.type === 'COMPONENT_SET' ? c.defaultVariant : c;
  if (c.type === 'COMPONENT_SET') {
    const want = Object.entries(props).filter(([k]) => c.componentPropertyDefinitions?.[k]?.type === 'VARIANT');
    if (want.length) {
      const match = c.children.find(v => want.every(([k, val]) => v.name.split(', ').includes(`${k}=${val}`)));
      if (match) comp = match;
    }
  }
  const i = comp.createInstance();
  for (const t of i.findAllWithCriteria({ types: ['TEXT'] })) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName);
    else for (const seg of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName);
  }
  const defs = i.componentProperties;
  const variantKeys = new Set(c.type === 'COMPONENT_SET'
    ? Object.entries(c.componentPropertyDefinitions || {}).filter(([, d]) => d.type === 'VARIANT').map(([k]) => k) : []);
  const set = {};
  for (const [k, v] of Object.entries(props)) {
    if (variantKeys.has(k)) continue;
    const key = Object.keys(defs).find(d => d === k || d.split('#')[0] === k);
    if (key) set[key] = v; else __notes.push(`instance ${comp.name}: no property "${k}"`);
  }
  if (Object.keys(set).length) i.setProperties(set);
  add(parent, i, size);
  return track(i);
}
function row(parent, name, spans, o = {}) {
  const total = spans.reduce((a, b) => a + b, 0);
  const cols = o.cols ?? 12;
  if (total > cols) throw new Error(`figma-taste: row ${name} spans ${total} > ${cols} columns`);
  if (total < cols && spans.length > 2) __notes.push(`row ${name}: ${spans.length} blocks with empty columns; space-between may land off the grid, consider grid()`);
  const f = stack('H', name, { gap: o.gap ?? 'layout/gutter', align: o.align });
  f.primaryAxisAlignItems = total < cols ? 'SPACE_BETWEEN' : 'MIN';
  add(parent, f, { w: 'FILL' });
  let i = 0;
  const put = (child, span) => {
    const n = span ?? spans[i++];
    if (n == null) throw new Error(`figma-taste: row ${name} has more children than spans`);
    if (child.parent?.id !== f.id) f.appendChild(child);
    spanTo(child, n);
    if (child.type === 'TEXT') child.textAutoResize = 'HEIGHT';
    return child;
  };
  put.node = f;
  put.spans = spans;
  return put;
}
function spanTo(node, n) {
  node.layoutSizingHorizontal = 'FIXED';
  bind(node, 'width', `span/${n}`);
  node.layoutGrow = 0;
  return node;
}
function done(extra = {}) {
  return { createdNodeIds: __created, notes: __notes, ...extra };
}
