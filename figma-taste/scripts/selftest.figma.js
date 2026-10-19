// ===== figma-taste self-test =====
// Checks the Figma-side fixes in a scratch area of ANY design file, without touching its own tokens.
//
// Phase 1 (one use_figma call): paste helpers.figma.js, then this file below it. It creates a
//   temporary collection "figma-taste selftest", two text styles, two components and a fixture frame,
//   runs the helper checks, and returns { checks, fixtureId, cleanup }.
// Phase 2 (one use_figma call): paste audit.figma.js with ROOT_IDS = [fixtureId].
//   Expected in its result: exactly ONE `eyebrow` fail (on the instance of Selftest/Above, not on
//   Selftest/Below) and exactly ONE `emoji` fail (the "🚀" text, not "© 2026").
// Phase 3 (one use_figma call): paste the returned `cleanup` code. It removes everything created here.
//
// Every check reports { name, ok, got, want }. A failing check means the helper needs fixing before
// it is used in a real build.

const checks = [];
const ck = (name, ok, got, want) => checks.push({ name, ok: !!ok, got, want });
const madeIds = { collection: null, styles: [], nodes: [] };

// ---- temporary tokens (registered into V and S so the helpers can use them)
const col = figma.variables.createVariableCollection('figma-taste selftest');
madeIds.collection = col.id;
const mode = col.modes[0].modeId;
function mkFloat(name, value, scopes) { const v = figma.variables.createVariable(name, col, 'FLOAT'); v.setValueForMode(mode, value); v.scopes = scopes; V[name] = v; return v; }
function mkColor(name, rgb, scopes) { const v = figma.variables.createVariable(name, col, 'COLOR'); v.setValueForMode(mode, { ...rgb, a: 1 }); v.scopes = scopes; V[name] = v; return v; }
mkFloat('layout/measure-text', 640, ['WIDTH_HEIGHT']);
mkFloat('layout/margin', 60, ['GAP']);
mkFloat('layout/gutter', 30, ['GAP']);
mkFloat('grid/columns', 12, []);
mkFloat('layout/stack-m', 32, ['GAP']);
mkFloat('layout/stack-l', 64, ['GAP']);
mkFloat('layout/section-pad', 120, ['GAP']);
mkColor('bg/inverse', { r: 0.08, g: 0.08, b: 0.08 }, ['FRAME_FILL', 'SHAPE_FILL']);
mkColor('fg/default', { r: 0.08, g: 0.08, b: 0.08 }, ['TEXT_FILL']);
mkColor('image/placeholder', { r: 0.85, g: 0.85, b: 0.85 }, ['FRAME_FILL', 'SHAPE_FILL']);
mkColor('scrim/base', { r: 0.05, g: 0.05, b: 0.05 }, ['FRAME_FILL', 'SHAPE_FILL']);
{ const v = figma.variables.createVariable('opacity/scrim', col, 'FLOAT'); v.setValueForMode(mode, 50); v.scopes = ['OPACITY']; V['opacity/scrim'] = v; }
for (const [n, w] of [[5, 732.5], [6, 885], [7, 1037.5], [8, 1190]]) mkFloat(`span/${n}`, w, ['WIDTH_HEIGHT']);

await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
function mkStyle(key, size) {
  const s = figma.createTextStyle();
  s.name = `figma-taste selftest/${key}`;
  s.fontName = { family: 'Inter', style: 'Regular' };
  s.fontSize = size;
  s.lineHeight = { unit: 'PERCENT', value: 110 };
  madeIds.styles.push(s.id);
  S[key] = s;
  return s;
}
mkStyle('T/Heading', 48);
mkStyle('T/Small', 14);

// ---- fixture wrapper, placed clear of existing content
let maxX = 0;
for (const c of figma.currentPage.children) maxX = Math.max(maxX, c.x + c.width);
const wrap = stack('V', 'figma-taste selftest/fixture', { gap: 'layout/stack-m', pad: 'layout/stack-m' });
wrap.x = maxX + 400; wrap.y = 0;
wrap.resize(1920, 100); wrap.primaryAxisSizingMode = 'AUTO';
madeIds.nodes.push(wrap.id);

// 1.1 txt() with maxW binds width, no crash
{
  let t = null, err = null;
  try { t = await txt(wrap, 'Measure test', 'T/Small', 'fg/default', { maxW: 'layout/measure-text' }); } catch (e) { err = String(e); }
  ck('1.1 txt maxW → width bound to token', t && Math.abs(t.width - 640) < 0.5 && !err, err || (t && t.width), 640);
}

// 1.2 paint opacity survives binding
{
  const r = figma.createRectangle(); r.name = 'selftest/opacity'; wrap.appendChild(r);
  fill(r, 'bg/inverse', 0.4);
  const op = r.fills[0]?.opacity;
  ck('1.2 fill(…, 0.4) keeps paint opacity', Math.abs((op ?? 1) - 0.4) < 0.001, op, 0.4);
  ck('1.2 paint still bound to variable', !!r.fills[0]?.boundVariables?.color, !!r.fills[0]?.boundVariables?.color, true);
}

// 1.4 component(): resize first, then hug
const holder = figma.createFrame(); holder.name = 'figma-taste selftest/components'; holder.x = wrap.x; holder.y = -800;
holder.resize(1200, 600); holder.fills = [];
madeIds.nodes.push(holder.id);
function mkCard(name) {
  const c = component(name, 'V', { width: 400, gap: 'layout/stack-m' });
  holder.appendChild(c);
  return c;
}
const below = mkCard('Selftest/Below');
const above = mkCard('Selftest/Above');
{
  // set a text style whichever API this file exposes
  async function styledText(parent, key, chars) {
    const t = figma.createText();
    if (typeof t.setTextStyleIdAsync === 'function') await t.setTextStyleIdAsync(S[key].id); else t.textStyleId = S[key].id;
    t.characters = chars;
    parent.appendChild(t);
    return t;
  }
  // Below: heading first, small label after (must NOT be an eyebrow)
  const h1 = await styledText(below, 'T/Heading', 'A heading set large');
  await styledText(below, 'T/Small', 'Lihat layanan');
  // Above: small label first, heading after (IS an eyebrow)
  await styledText(above, 'T/Small', 'Our services');
  await styledText(above, 'T/Heading', 'A heading set large');
  const key = textProp(below, 'Title', h1, 'A heading set large');
  ck('1.4 textProp returns a property key', typeof key === 'string' && key.startsWith('Title'), key, 'Title#…');
}
ck('1.4 component hugs its main axis', below.primaryAxisSizingMode === 'AUTO', below.primaryAxisSizingMode, 'AUTO');
ck('1.4 component height follows content (not the 100px resize)', Math.abs(below.height - 100) > 1, Math.round(below.height), '≠ 100');
const iBelow = below.createInstance(); wrap.appendChild(iBelow);
const iAbove = above.createInstance(); wrap.appendChild(iAbove);

// 2.2 emoji fixtures (checked by the audit in phase 2)
await txt(wrap, '© 2026 Selftest™', 'T/Small', 'fg/default', { name: 'selftest/copyright' });
await txt(wrap, '🚀 Launch', 'T/Small', 'fg/default', { name: 'selftest/emoji' });

// 1.4 toColumn(): one frame, hugs afterwards
{
  const row = stack('H', 'selftest/row', { gap: 'layout/stack-m' });
  wrap.appendChild(row); row.layoutSizingHorizontal = 'FILL';
  const a = figma.createRectangle(); a.name = 'selftest/a'; row.appendChild(a); a.layoutSizingHorizontal = 'FILL';
  const b = figma.createRectangle(); b.name = 'selftest/b'; row.appendChild(b); b.layoutSizingHorizontal = 'FILL';
  toColumn(row, 'layout/stack-m');
  ck('1.4 toColumn → VERTICAL', row.layoutMode === 'VERTICAL', row.layoutMode, 'VERTICAL');
  ck('1.4 toColumn → hugs', row.primaryAxisSizingMode === 'AUTO', row.primaryAxisSizingMode, 'AUTO');
  ck('1.4 toColumn → children FILL', a.layoutSizingHorizontal === 'FILL' && b.layoutSizingHorizontal === 'FILL', [a.layoutSizingHorizontal, b.layoutSizingHorizontal], 'FILL');
  let threw = false; try { toColumn(iBelow); } catch { threw = true; }
  ck('1.4 toColumn refuses instances', threw, threw, true);
}

// 6.3 columnGrid(): bound layout grid
{
  let err = null;
  try { await columnGrid(wrap); } catch (e) { err = String(e); }
  const g = wrap.layoutGrids?.[0];
  ck('6.3 columnGrid creates a 12-col stretch grid', g && g.pattern === 'COLUMNS' && g.alignment === 'STRETCH' && g.count === 12 && !err, err || g && { count: g.count, gutter: g.gutterSize, offset: g.offset }, { count: 12, gutter: 30, offset: 60 });
  ck('6.3 grid fields bound to tokens', !!(g?.boundVariables?.offset && g?.boundVariables?.gutterSize && g?.boundVariables?.count), g?.boundVariables ? Object.keys(g.boundVariables) : null, ['offset', 'gutterSize', 'count']);
}

// grid auto layout probe + cell spans land on the 1920 grid
{
  const sec = section(wrap, 'Selftest');
  const g = await grid(sec, 'selftest/grid', 12, 1, { gap: 'layout/gutter' });
  const r1 = figma.createRectangle(); r1.name = 'selftest/span7';
  await cell(g, r1, 0, 0, 7);
  const r2 = figma.createRectangle(); r2.name = 'selftest/span5';
  await cell(g, r2, 0, 7, 5);
  ck('grid() mode', g.mode === 'GRID', g.mode + (g.error ? ` (${g.error})` : ''), 'GRID');
  ck('span 7 width ≈ 1037.5', Math.abs(r1.width - 1037.5) <= 1, r1.width, 1037.5);
  ck('span 5 width ≈ 732.5', Math.abs(r2.width - 732.5) <= 1, r2.width, 732.5);
  ck('spanWidth(7, 1920, 12, 60, 30)', spanWidth(7, 1920, 12, 60, 30) === 1037.5, spanWidth(7, 1920, 12, 60, 30), 1037.5);
}

// row(): flex row on the layout guide (note 1 Verify: Stats 7+5 and Services/Head 6+5 with column 7 empty)
{
  const sec2 = section(wrap, 'SelftestRows');
  const W = 1920, colW = 122.5, gut = 30, mar = 60;
  const starts = Array.from({ length: 12 }, (_, k) => mar + k * (colW + gut));
  const ends = starts.map(x => x + colW);
  const onGrid = (n, right = true) => {
    const x = n.absoluteTransform[0][2] - wrap.absoluteTransform[0][2];
    const okL = starts.some(a => Math.abs(a - x) <= 1);
    const okR = !right || ends.some(a => Math.abs(a - (x + n.width)) <= 1);
    return okL && okR;
  };
  const stats = row(sec2, 'Stats/Row', [7, 5]);
  const fig = await txt(stats.node, '350+ proyek', 'T/Heading'); stats(fig);
  const note = await txt(stats.node, 'Dummy note text for the right column.', 'T/Small'); stats(note);
  ck('row [7,5]: MIN alignment, gap bound', stats.node.primaryAxisAlignItems === 'MIN' && !!stats.node.boundVariables?.itemSpacing, stats.node.primaryAxisAlignItems, 'MIN');
  ck('row [7,5]: both blocks on column lines', onGrid(fig) && onGrid(note), [fig.width, note.width], [1037.5, 732.5]);
  const head = row(sec2, 'Services/Head', [6, 5]);
  const h = await txt(head.node, 'Layanan', 'T/Heading'); head(h);
  const p2 = await txt(head.node, 'Dummy intro for services.', 'T/Small'); head(p2);
  ck('row [6,5]: SPACE_BETWEEN', head.node.primaryAxisAlignItems === 'SPACE_BETWEEN', head.node.primaryAxisAlignItems, 'SPACE_BETWEEN');
  ck('row [6,5]: starts col 1, ends col 12 (col 7 empty)', onGrid(h) && onGrid(p2) && Math.abs((p2.absoluteTransform[0][2] - wrap.absoluteTransform[0][2]) - starts[7]) <= 1, null, 'on grid');
}

// grid(): rows hug their content (note 2.1: no overlap)
{
  const sec3 = section(wrap, 'SelftestGridRows');
  const g = await grid(sec3, 'selftest/grid-rows', 12, 3, { gap: 'layout/gutter' });
  if (g.mode === 'GRID') {
    const a = await txt(g.node, 'A heading that is set large', 'T/Heading'); await cell(g, a, 0, 0, 8);
    const b = await txt(g.node, 'A paragraph under it.', 'T/Small'); await cell(g, b, 1, 0, 6);
    const c = await txt(g.node, 'Button', 'T/Small', 'fg/default', { w: 'HUG' }); await cell(g, c, 2, 0, 2, 1, 'MIN');
    const expect = a.height + b.height + c.height + 2 * 30;
    ck('grid rows hug: frame height = content + gaps', Math.abs(g.node.height - expect) <= 2, Math.round(g.node.height), Math.round(expect));
    ck('grid rows: no overlap', b.absoluteTransform[1][2] >= a.absoluteTransform[1][2] + a.height - 1 && c.absoluteTransform[1][2] >= b.absoluteTransform[1][2] + b.height - 1, null, 'stacked');
  } else ck('grid rows hug (GRID unavailable, skipped)', true, g.error, 'GRID');
}

// component(): fixed-width horizontal bar (note 2.4)
{
  const bar = component('Selftest/NavBar', 'H', { width: 1920, fixedMain: true, gap: 'layout/stack-m' });
  holder.appendChild(bar);
  const t1 = figma.createText(); t1.characters = 'Wordmark'; bar.appendChild(t1);
  ck('component fixedMain: main FIXED 1920, counter hugs', bar.primaryAxisSizingMode === 'FIXED' && bar.counterAxisSizingMode === 'AUTO' && Math.abs(bar.width - 1920) < 1, [bar.primaryAxisSizingMode, bar.counterAxisSizingMode, bar.width], ['FIXED', 'AUTO', 1920]);
}

// scrim(): layer opacity
{
  const hero = stack('V', 'selftest/hero', { pad: 'layout/stack-m' });
  wrap.appendChild(hero); hero.layoutSizingHorizontal = 'FILL'; hero.resize(hero.width, 300);
  const s = scrim(hero);                                   // defaults: scrim/base at opacity/scrim (50)
  ck('scrim uses layer opacity from opacity/scrim', Math.abs(s.opacity - 0.5) < 0.001 && s.layoutPositioning === 'ABSOLUTE', { opacity: s.opacity, pos: s.layoutPositioning }, { opacity: 0.5, pos: 'ABSOLUTE' });
  const bound = s.fills[0]?.boundVariables?.color?.id;
  ck('scrim colour is scrim/base (dark in every theme)', bound === V['scrim/base'].id, bound, V['scrim/base'].id);
  const s2 = scrim(hero, 0.4);
  ck('scrim accepts a number too', Math.abs(s2.opacity - 0.4) < 0.001, s2.opacity, 0.4);
}

// dummy(): annotation or name suffix
{
  const t = await txt(wrap, 'Jl. Raya Darmo No. 12, Surabaya', 'T/Small', 'fg/default', { dummy: 'address' });
  const ann = Array.isArray(t.annotations) && t.annotations.some(a => (a.label || '').startsWith('Dummy'));
  ck('dummy marks name', / · dummy$/.test(t.name), t.name, '… · dummy');
  checks.push({ name: 'dummy annotation (informational)', ok: true, got: ann ? 'annotation added' : 'name suffix only (annotations unavailable)', want: 'annotation' });
}

const cleanup = `// figma-taste self-test cleanup
for (const id of ${JSON.stringify(madeIds.nodes)}) { const n = await figma.getNodeByIdAsync(id); if (n) n.remove(); }
for (const id of ${JSON.stringify(madeIds.styles)}) { const s = await figma.getStyleByIdAsync(id); if (s) s.remove(); }
const c = await figma.variables.getVariableCollectionByIdAsync(${JSON.stringify(madeIds.collection)}); if (c) c.remove();
return { removed: true };`;

const failed = checks.filter(c => !c.ok);
return {
  verdict: failed.length ? 'FAIL' : 'PASS',
  failed: failed.map(c => c.name),
  checks,
  fixtureId: wrap.id,
  nextStep: `Run audit.figma.js with ROOT_IDS = ['${wrap.id}']: expect exactly one 'eyebrow' fail (Selftest/Above) and one 'emoji' fail (🚀).`,
  cleanup,
  ...done(),
};
// ===== end figma-taste self-test =====
