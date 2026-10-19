// ===== figma-taste helpers =====
// Paste this whole block at the top of a use_figma build call, then write the section code below it.
// It loads local variables and text styles once, and gives small functions that keep every value
// bound to a token and every container in auto layout. End the call with `return done({...})`.
// A trimmed copy without comments lives in helpers.min.figma.js; keep both in sync.
//
// Conventions: variable names are full paths ("bg/canvas", "layout/margin"); text styles by name
// ("Heading/H1"). A missing token throws, which is what you want: add it to the system first.

// In a shared file that also holds other brands' systems, set these so lookups only see this
// client's tokens. Collections are matched by name prefix; styles have the prefix stripped from
// their keys, so txt(..., 'Heading/H1') keeps working.
const COLLECTION_PREFIX = null;   // e.g. 'Arunika ·'
const STYLE_PREFIX = null;        // e.g. 'Arunika/'
// When text styles bind fontFamily to variables (design options), list the fonts of EVERY mode here,
// so text can be created and wrapper modes switched without "unloaded font" errors.
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

// Resolve a FLOAT variable's numeric value in a mode (default mode if none), following aliases.
async function num(name, modeId) {
  let v = need(V, name, 'variable');
  for (let i = 0; i < 6; i++) {
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    const val = v.valuesByMode[modeId && v.valuesByMode[modeId] !== undefined ? modeId : col.defaultModeId];
    if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') { v = await figma.variables.getVariableByIdAsync(val.id); continue; }
    return val;
  }
  throw new Error(`figma-taste: alias chain too deep for ${name}`);
}

// ---- paint and binding
// Opacity goes on the paint before binding; spreading it onto a bound paint was seen to drop it.
// For a scrim prefer the layer's own opacity (see scrim()).
function paint(varName, opacity) {
  const base = { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: opacity ?? 1 };
  return figma.variables.setBoundVariableForPaint(base, 'color', need(V, varName, 'variable'));
}
function fill(node, varName, opacity) { node.fills = varName ? [paint(varName, opacity)] : []; return node; }
function stroke(node, varName, weight = 1) { node.strokes = [paint(varName)]; node.strokeWeight = weight; return node; }
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
function radius(node, token) {
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(node, f, token);
  return node;
}

// ---- containers
// stack('V'|'H', name, { gap, padX, padY, pad, justify, align, wrap, rowGap, fill, clip })
function stack(dir, name, o = {}) {
  const f = figma.createAutoLayout(dir === 'H' || dir === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL');
  f.name = name;
  f.fills = [];
  f.clipsContent = !!o.clip;
  if (o.gap != null) bind(f, 'itemSpacing', o.gap);
  if (o.pad != null) pad(f, o.pad);
  if (o.padX != null) { bind(f, 'paddingLeft', o.padX); bind(f, 'paddingRight', o.padX); }
  if (o.padY != null) { bind(f, 'paddingTop', o.padY); bind(f, 'paddingBottom', o.padY); }
  if (o.justify) f.primaryAxisAlignItems = o.justify;    // MIN | CENTER | MAX | SPACE_BETWEEN
  if (o.align) f.counterAxisAlignItems = o.align;        // MIN | CENTER | MAX | BASELINE
  if (o.wrap) { f.layoutWrap = 'WRAP'; if (o.rowGap != null) bind(f, 'counterAxisSpacing', o.rowGap); }
  if (o.fill) fill(f, o.fill);
  return track(f);
}

// add(parent, child, { w: 'FILL'|'HUG'|'FIXED'|number, h: ..., grow })
// Appends first, then sizes (the order Figma requires). `grow` sets a flex weight after FILL.
function add(parent, child, o = {}) {
  parent.appendChild(child);
  if (typeof o.w === 'number') { child.resize(o.w, child.height); child.layoutSizingHorizontal = 'FIXED'; }
  else if (o.w) child.layoutSizingHorizontal = o.w;
  if (typeof o.h === 'number') { child.resize(child.width, o.h); child.layoutSizingVertical = 'FIXED'; }
  else if (o.h) child.layoutSizingVertical = o.h;
  if (o.grow != null) child.layoutGrow = o.grow;
  return child;
}

// A page section with the page's margins and rhythm. Options as stack(), plus dir.
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

// ---- dummy content marking (see SKILL.md step 4)
// Marks a layer as dummy with a Figma annotation; falls back to a ' · dummy' name suffix.
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

// ---- text
// t = await txt(parent, 'Copy', 'Heading/H1', 'fg/default', { w: 'FILL'|number|'HUG', maxW: 'layout/measure-text' | 'span/8', grow, name, dummy })
// maxW sets a FIXED width bound to the token (text nodes cannot take maxWidth); the height grows with the copy.
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

// ---- image slots (filled later through upload_assets)
// imageSlot(parent, 'hero', { ratio: 16 / 9, h: number | 'token', w: 'FILL'|number|'span/7', grow, radius, vfill })
function imageSlot(parent, slot, o = {}) {
  const r = figma.createRectangle();
  r.name = `image/${slot}`;
  fill(r, 'image/placeholder');
  parent.appendChild(r);
  if (typeof o.w === 'number') { r.resize(o.w, r.height); r.layoutSizingHorizontal = 'FIXED'; }
  else if (typeof o.w === 'string' && o.w !== 'FILL') { r.layoutSizingHorizontal = 'FIXED'; bind(r, 'width', o.w); }
  else r.layoutSizingHorizontal = 'FILL';
  if (o.grow != null) r.layoutGrow = o.grow;
  if (typeof o.h === 'string') { r.layoutSizingVertical = 'FIXED'; bind(r, 'height', o.h); }
  else if (typeof o.h === 'number') { r.resize(r.width, o.h); r.layoutSizingVertical = 'FIXED'; }
  else if (o.ratio) { r.resize(r.width, Math.round(r.width / o.ratio)); r.layoutSizingVertical = 'FIXED'; }
  else if (o.vfill) r.layoutSizingVertical = 'FILL';
  if (o.radius) radius(r, o.radius);
  return track(r);
}

// A neutral scrim over a photo-filled frame. Uses the LAYER's opacity (tested), not the paint's.
// colorVar defaults to scrim/base, which is near-black in every theme mode (bg/inverse is light in a
// dark direction and would lighten the photo). opacity may be a number or an OPACITY variable name.
function scrim(frame, opacity = 'opacity/scrim', colorVar = 'scrim/base') {
  const r = figma.createRectangle();
  r.name = 'scrim';
  frame.appendChild(r);
  r.layoutPositioning = 'ABSOLUTE';
  r.resize(frame.width, frame.height);
  r.x = 0; r.y = 0;
  r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  fill(r, colorVar);
  if (typeof opacity === 'string' && V[opacity]) r.setBoundVariable('opacity', V[opacity]);
  else r.opacity = typeof opacity === 'number' ? opacity : 0.5;
  frame.insertChild(0, r); // behind the text children
  return track(r);
}

// ---- components
// i = await inst(parent, 'COMPONENT_OR_SET_ID', { Label: 'Book a visit', Kind: 'Primary' }, { w: 'FILL' })
async function inst(parent, id, props = {}, size = {}) {
  const c = await figma.getNodeByIdAsync(id);
  if (!c) throw new Error(`figma-taste: component ${id} not found`);
  let comp = c.type === 'COMPONENT_SET' ? c.defaultVariant : c;
  // pick a variant when variant props are given
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
    if (variantKeys.has(k)) continue;               // variants were chosen above, not set as properties
    const key = Object.keys(defs).find(d => d === k || d.split('#')[0] === k);
    if (key) set[key] = v; else __notes.push(`instance ${comp.name}: no property "${k}"`);
  }
  if (Object.keys(set).length) i.setProperties(set);
  add(parent, i, size);
  return track(i);
}

// c = component('Row/List', 'H', { gap: 'layout/stack-s', padY: 'layout/stack-s', width: 1200 })
// c = component('Nav/Bar', 'H', { width: 1920, fixedMain: true })   // fixed-width bar, height hugs
// Creates an auto-layout component. resize() FIRST, then hug: resize() resets sizing modes to FIXED,
// which is why components built the other way round came out with fixed heights and overflow.
//   main axis    : hugs, unless o.fixedMain
//   counter axis : FIXED when its size is given (width for 'V', height for 'H'), unless o.hugCounter
//   (o.hugWidth is the old name of o.hugCounter and still works)
function component(name, dir = 'V', o = {}) {
  const c = figma.createComponent();
  const horizontal = dir === 'H' || dir === 'HORIZONTAL';
  c.name = name;
  c.fills = [];
  c.layoutMode = horizontal ? 'HORIZONTAL' : 'VERTICAL';
  c.resize(o.width || 400, o.height || 100);
  const hugCounter = o.hugCounter ?? o.hugWidth;
  const counterGiven = horizontal ? !!o.height : !!o.width;
  c.primaryAxisSizingMode = o.fixedMain ? 'FIXED' : 'AUTO';
  c.counterAxisSizingMode = counterGiven && !hugCounter ? 'FIXED' : 'AUTO';
  if (o.gap != null) bind(c, 'itemSpacing', o.gap);
  if (o.pad != null) pad(c, o.pad);
  if (o.padX != null) { bind(c, 'paddingLeft', o.padX); bind(c, 'paddingRight', o.padX); }
  if (o.padY != null) { bind(c, 'paddingTop', o.padY); bind(c, 'paddingBottom', o.padY); }
  if (o.justify) c.primaryAxisAlignItems = o.justify;
  if (o.align) c.counterAxisAlignItems = o.align;
  if (o.fill) fill(c, o.fill);
  if (o.description) c.description = o.description;
  return track(c);
}

// key = textProp(component, 'Title', textNode, 'Default title')
// Adds a TEXT component property and links it to the node. Returns the property key.
// After combineAsVariants the keys are re-generated: read them back from the set.
function textProp(comp, name, textNode, def) {
  const key = comp.addComponentProperty(name, 'TEXT', def ?? textNode.characters);
  textNode.componentPropertyReferences = { ...(textNode.componentPropertyReferences || {}), characters: key };
  return key;
}

// toColumn(frame, 'layout/stack-m')  — for the Mobile copy only.
// Turns ONE row into a hugging column. Changes only this frame and its direct children; never loop
// it over "every FIXED frame" (that breaks token-sized frames such as Logo/Slot). Works on frames,
// not on instances: for a component use its Layout=Stack variant instead.
function toColumn(frame, gapToken) {
  if (frame.type === 'INSTANCE') throw new Error(`figma-taste: toColumn on instance ${frame.name}; swap to its Layout=Stack variant`);
  frame.layoutMode = 'VERTICAL';
  frame.counterAxisAlignItems = 'MIN';
  for (const c of frame.children) {
    if (c.visible === false || c.layoutPositioning === 'ABSOLUTE') continue;
    c.layoutGrow = 0;
    c.layoutSizingHorizontal = 'FILL';
  }
  frame.primaryAxisSizingMode = 'AUTO';
  if (gapToken) bind(frame, 'itemSpacing', gapToken);
  return frame;
}

// ---- row: the default for columns (flex, on the layout grid)
// const r = row(section, 'Stats/Row', [7, 5]);         // HORIZONTAL, FILL, gap layout/gutter
// const a = await txt(r.node, 'Big figure', 'Display'); r(a);   // width bound to span/7
// const b = imageSlot(r.node, 'stats'); r(b);                    // width bound to span/5
// spans that add up to 12 sit side by side (gap = gutter). Spans that add up to less than 12 use
// SPACE_BETWEEN, so the first block starts on column 1 and the last ends on column 12 (e.g. [6, 5]
// leaves column 7 empty). With three or more blocks and empty columns, use grid() instead: space-between
// would spread them off the column lines. Mobile: toColumn(r.node, gap).
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

// ---- grid (CSS grid auto layout, with a flex-wrap fallback)
// const g = await grid(parent, 'Work/Grid', 12, 2, { gap: 'layout/gutter' });  // appended + FILL
// await cell(g, child, row, col, colSpan, rowSpan, valign);
// Use it for 2D layouts only: items that span rows, gallery walls, magazine spreads. Plain column
// splits are row() (flex + span tokens), which developers read as flexbox.
async function grid(parent, name, cols, rows, o = {}) {
  const f = figma.createFrame();
  f.name = name; f.fills = []; f.clipsContent = false;
  let mode = 'GRID', error = null;
  try {
    f.layoutMode = 'GRID';
    f.gridColumnCount = cols;
    f.gridRowCount = rows;
    if (o.gap) { bind(f, 'gridColumnGap', o.gap); bind(f, 'gridRowGap', o.rowGap || o.gap); }
  } catch (e) {
    mode = 'WRAP'; error = String(e);
    f.layoutMode = 'HORIZONTAL';
    f.layoutWrap = 'WRAP';
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'AUTO';
    if (o.gap) { bind(f, 'itemSpacing', o.gap); bind(f, 'counterAxisSpacing', o.rowGap || o.gap); }
    __notes.push(`grid ${name}: GRID unavailable (${error}); built as wrap. Row spans are approximated.`);
  }
  parent.appendChild(f);
  f.layoutSizingHorizontal = 'FILL';
  if (mode === 'GRID') {
    // New GRID frames get FLEX 1 row tracks, so a hugging grid shares its height equally and rows
    // overlap. Make the frame hug and every row track hug its content (CSS: fit-content(100%)).
    try {
      f.layoutSizingVertical = 'HUG';
      f.gridRowSizes = f.gridRowSizes.map(() => ({ type: 'HUG' }));
    } catch (e) { __notes.push(`grid ${name}: could not set HUG row tracks (${e}); check rows for overlap`); }
  }
  track(f);
  return { node: f, mode, cols, gap: o.gap ? await num(o.gap) : 0, error };
}
// valign: 'MIN' | 'CENTER' | 'MAX' | 'AUTO' (vertical alignment of the child inside its cell)
async function cell(g, child, row, col, colSpan = 1, rowSpan = 1, valign) {
  g.node.appendChild(child);
  if (g.mode === 'GRID') {
    child.setGridChildPosition(row, col);
    child.gridColumnSpan = colSpan;
    child.gridRowSpan = rowSpan;
    child.layoutSizingHorizontal = 'FILL';
    if (rowSpan > 1 || child.type === 'RECTANGLE') child.layoutSizingVertical = 'FILL';
    if (valign) { try { child.gridChildVerticalAlign = valign; } catch (e) { __notes.push(`cell valign on ${child.name}: ${e}`); } }
  } else {
    const W = g.node.width;
    const colW = (W - g.gap * (g.cols - 1)) / g.cols;
    child.resize(Math.floor(colW * colSpan + g.gap * (colSpan - 1)), child.height);
    child.layoutSizingHorizontal = 'FIXED';
  }
  return child;
}

// Width of an n-column span. Fallback for when GRID cannot be used: bind the result to a `span/<n>`
// variable per mode, or pass a variable name to spanTo().
// spanWidth(7, 1920, 12, 60, 30) === 1037.5
function spanWidth(n, pageWidth, cols, margin, gutter) {
  const col = (pageWidth - 2 * margin - (cols - 1) * gutter) / cols;
  return n * col + (n - 1) * gutter;
}
// spanTo(node, 7): binds node width to `span/7` when that variable exists, else errors clearly.
function spanTo(node, n) {
  node.layoutSizingHorizontal = 'FIXED';
  bind(node, 'width', `span/${n}`);
  node.layoutGrow = 0;
  return node;
}

// ---- layout grid on a page wrapper, bound to the layout tokens (tested: grids bind like paints)
// await columnGrid(frame)  → 12 columns, stretch, margin/gutter/count from layout/margin, layout/gutter, grid/columns
async function columnGrid(frame, o = {}) {
  let g = {
    pattern: 'COLUMNS', alignment: 'STRETCH', visible: o.visible ?? true,
    count: o.count ?? 12, gutterSize: o.gutter ?? 30, offset: o.margin ?? 60,
    color: o.color ?? { r: 1, g: 0, b: 0, a: 0.1 },
  };
  g = figma.variables.setBoundVariableForLayoutGrid(g, 'offset', need(V, 'layout/margin', 'variable'));
  g = figma.variables.setBoundVariableForLayoutGrid(g, 'gutterSize', need(V, 'layout/gutter', 'variable'));
  g = figma.variables.setBoundVariableForLayoutGrid(g, 'count', need(V, 'grid/columns', 'variable'));
  frame.layoutGrids = [g];
  return frame;
}

// ---- finish
function done(extra = {}) {
  return { createdNodeIds: __created, notes: __notes, ...extra };
}
// ===== end figma-taste helpers =====
