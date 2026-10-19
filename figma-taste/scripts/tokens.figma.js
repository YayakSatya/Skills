// ===== figma-taste token check =====
// Paste into a use_figma call at the end of step 5 and again at step 8 (with or after the audit).
// Reports token-hygiene problems (references/design-system.md §"What earns a variable"):
//   - variables with 0 bindings (except RESERVED, each with a reason)
//   - variables with the same value in every mode of a multi-mode collection
//   - pairs of variables with identical values in every mode (duplicates)
//   - helper tokens (span/*, figma helpers collection) that carry a WEB code syntax
//   - semantic tokens that LACK a WEB code syntax
//   - variables left on ALL_SCOPES
//   - text styles whose lineHeight / letterSpacing are bound to variables
//   - primitive ramps with gaps against STEPS
// Bindings are counted on the nodes under SCAN_IDS (page wrappers, Foundations and Components boards),
// on text/effect/grid styles, and as alias targets of other variables.

const COLLECTION_PREFIX = null;              // e.g. 'Arunika ·'  (null = every local collection)
const SCAN_IDS = ['ROOT_ID'];                // wrappers + boards, e.g. ['12:1', '12:900', '40:2']
const STEPS = [50, 100, 200, 300, 400, 600, 800, 900, 950];   // the ramp steps every primitive ramp shares (design-system.md)
const RESERVED = {
  // 'state/warning': 'used by Alert/Warning, built with the Karier page',
};

const cols = (await figma.variables.getLocalVariableCollectionsAsync())
  .filter(c => !COLLECTION_PREFIX || c.name.startsWith(COLLECTION_PREFIX));
const colById = new Map(cols.map(c => [c.id, c]));
const vars = (await figma.variables.getLocalVariablesAsync()).filter(v => colById.has(v.variableCollectionId));
const varById = new Map(vars.map(v => [v.id, v]));
const uses = new Map(vars.map(v => [v.id, 0]));
const hit = id => { if (uses.has(id)) uses.set(id, uses.get(id) + 1); };

// ---- collect bindings from a bound-variables object (values are aliases or arrays of aliases)
function collect(bv) {
  if (!bv) return;
  for (const val of Object.values(bv)) {
    if (Array.isArray(val)) val.forEach(a => a && a.id && hit(a.id));
    else if (val && typeof val === 'object') {
      if (val.id) hit(val.id);
      else collect(val);                       // nested (e.g. componentProperties)
    }
  }
}
function collectPaints(arr) { if (Array.isArray(arr)) for (const p of arr) collect(p.boundVariables); }

// ---- nodes under SCAN_IDS
const scanned = [];
for (const id of SCAN_IDS) {
  const root = await figma.getNodeByIdAsync(id);
  if (!root) { scanned.push({ id, error: 'not found' }); continue; }
  let p = root; while (p.parent && p.type !== 'PAGE') p = p.parent;
  if (p.type === 'PAGE' && p.id !== figma.currentPage.id) await figma.setCurrentPageAsync(p);
  const nodes = [root, ...('findAll' in root ? root.findAll(() => true) : [])];
  for (const n of nodes) {
    collect(n.boundVariables);
    collectPaints(n.fills); collectPaints(n.strokes);
    if (Array.isArray(n.effects)) n.effects.forEach(e => collect(e.boundVariables));
    if (Array.isArray(n.layoutGrids)) n.layoutGrids.forEach(g => collect(g.boundVariables));
  }
  scanned.push({ id, name: root.name, nodes: nodes.length });
}

// ---- styles
const problems = [];
const P = (rule, name, msg) => problems.push({ rule, name, msg });
for (const s of await figma.getLocalTextStylesAsync()) {
  collect(s.boundVariables);
  const bv = s.boundVariables || {};
  if (bv.lineHeight || bv.letterSpacing) P('bound-metrics', s.name, 'lineHeight/letterSpacing bound to a variable: keep them as percent values in the style, bind only fontSize (and fontFamily while options exist)');
}
for (const s of await figma.getLocalEffectStylesAsync()) (s.effects || []).forEach(e => collect(e.boundVariables));
for (const s of await figma.getLocalGridStylesAsync()) (s.layoutGrids || []).forEach(g => collect(g.boundVariables));
for (const s of await figma.getLocalPaintStylesAsync()) collectPaints(s.paints);

// ---- aliases between variables
for (const v of vars) for (const val of Object.values(v.valuesByMode)) if (val && val.type === 'VARIABLE_ALIAS') hit(val.id);

// ---- rules on variables
const key = val => (val && typeof val === 'object' && 'r' in val)
  ? `rgba(${[val.r, val.g, val.b].map(x => Math.round(x * 255)).join(',')},${(val.a ?? 1).toFixed(2)})`
  : (val && val.type === 'VARIABLE_ALIAS' ? `alias:${val.id}` : JSON.stringify(val));
const isHelper = (v, c) => /figma helpers/i.test(c.name) || /^span\//.test(v.name);
const isPrimitive = c => /primitives/i.test(c.name);
const signature = new Map();

for (const v of vars) {
  const c = colById.get(v.variableCollectionId);
  const modeVals = c.modes.map(m => key(v.valuesByMode[m.modeId]));
  if (uses.get(v.id) === 0 && !RESERVED[v.name] && !isPrimitive(c)) P('unused', v.name, '0 bindings: bind it in a component or page, add it to RESERVED with a reason, or delete it');
  if (c.modes.length > 1 && modeVals.every(x => x === modeVals[0])) P('constant-in-modes', v.name, `same value in every mode of ${c.name}: move it to the system collection or into the style/component`);
  // duplicates: raw values only. Two semantic roles aliasing the same primitive is normal.
  if (!modeVals.some(x => x.startsWith('alias:'))) {
    const sig = `${v.resolvedType}|${c.id}|${modeVals.join('|')}`;
    if (signature.has(sig)) P('duplicate', v.name, `identical to ${signature.get(sig)} in every mode`); else signature.set(sig, v.name);
  }
  const web = v.codeSyntax && v.codeSyntax.WEB;
  if (isHelper(v, c) && web) P('helper-code-syntax', v.name, 'Figma-only helper carries a WEB code syntax (in CSS this is grid-column): remove it');
  if (!isHelper(v, c) && !isPrimitive(c) && !web) P('missing-code-syntax', v.name, 'semantic token without a WEB code syntax');
  if (Array.isArray(v.scopes) && v.scopes.includes('ALL_SCOPES')) P('all-scopes', v.name, 'scope is ALL_SCOPES: set explicit scopes');
}

// ---- primitive ramps with gaps
for (const c of cols.filter(isPrimitive)) {
  const ramps = new Map();
  for (const v of vars.filter(v => v.variableCollectionId === c.id)) {
    const m = v.name.match(/^(.*)\/(\d+)$/); if (!m) continue;
    if (!ramps.has(m[1])) ramps.set(m[1], new Set());
    ramps.get(m[1]).add(Number(m[2]));
  }
  for (const [hue, steps] of ramps) {
    const have = [...steps].sort((a, b) => a - b);
    const lo = have[0], hi = have[have.length - 1];
    const missing = STEPS.filter(s => s >= lo && s <= hi && !steps.has(s));
    const odd = have.filter(s => !STEPS.includes(s));
    if (missing.length || odd.length) P('ramp-gaps', `${c.name}: ${hue}`, `${missing.length ? `missing ${missing.join(', ')}` : ''}${missing.length && odd.length ? '; ' : ''}${odd.length ? `off-scale ${odd.join(', ')}` : ''}`);
  }
}

const counts = problems.reduce((m, p) => (m[p.rule] = (m[p.rule] || 0) + 1, m), {});
return {
  verdict: problems.length ? 'ISSUES' : 'CLEAN',
  counts,
  problems: problems.slice(0, 120),
  stats: { collections: cols.map(c => `${c.name} [${c.modes.map(m => m.name).join('/')}]`), variables: vars.length, scanned },
};
// ===== end figma-taste token check =====
