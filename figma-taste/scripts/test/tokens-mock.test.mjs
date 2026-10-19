// Regression test: tokens.figma.js on a mock of the run-2 variables (every row of design-system.md table 15.2).
// Usage: node scripts/test/tokens-mock.test.mjs   (from the skill folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = fs.readFileSync(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens.figma.js'), 'utf8').replace("const COLLECTION_PREFIX = null;", "const COLLECTION_PREFIX = 'Arunika ·';").replace("['ROOT_ID']", "['1:1']");
let id = 0; const nid = () => `VariableID:${++id}`;
const C = (name, modes) => ({ id: `C:${name}`, name, modes: modes.map((m, i) => ({ modeId: `${name}-${i}`, name: m })) });
const prim = C('Arunika · primitives', ['Value']), theme = C('Arunika · theme', ['Option A', 'Option B']), layout = C('Arunika · layout', ['Desktop', 'Mobile']), other = C('Essential', ['Mode 1']);
const vars = [];
function V(col, name, vals, opts = {}) { const v = { id: nid(), name, variableCollectionId: col.id, resolvedType: opts.type || 'FLOAT', scopes: opts.scopes || ['GAP'], codeSyntax: opts.web === false ? {} : { WEB: `var(--${name.replaceAll('/', '-')})` }, valuesByMode: Object.fromEntries(col.modes.map((m, i) => [m.modeId, vals[i] ?? vals[0]])) }; vars.push(v); return v; }
const rgb = (r, g, b, a = 1) => ({ r, g, b, a });
// primitives with one-off steps (15.2 last row)
for (const s of [50, 100, 300, 600, 950]) V(prim, `ink/${s}`, [rgb(0.1, 0.1, 0.1)], { type: 'COLOR', web: false, scopes: [] });
V(prim, 'paper/25', [rgb(1, 1, 1)], { type: 'COLOR', web: false, scopes: [] });
V(prim, 'paper/400', [rgb(0.9, 0.9, 0.9)], { type: 'COLOR', web: false, scopes: [] });
const ink = vars[0];
// theme
const fg = V(theme, 'fg/default', [{ type: 'VARIABLE_ALIAS', id: ink.id }, rgb(0, 0, 0)], { type: 'COLOR', scopes: ['TEXT_FILL'] });
const fds = V(theme, 'font/display-style', ['Medium'], { type: 'STRING', scopes: ['FONT_STYLE'] });       // constant in modes
const fd = V(theme, 'font/display', ['Switzer', 'Newsreader'], { type: 'STRING', scopes: ['FONT_FAMILY'] });
const sh = V(theme, 'shadow/overlay', [{ type: 'VARIABLE_ALIAS', id: ink.id }], { type: 'COLOR', scopes: ['EFFECT_COLOR'] });   // same alias every mode
// layout
const lh = V(layout, 'type/lh-h1', [107, 38]);
const mw = V(layout, 'layout/measure-wide', [1190, 350], { scopes: ['WIDTH_HEIGHT'] });
const sp8 = V(layout, 'span/8', [1190, 350], { scopes: ['WIDTH_HEIGHT'] });      // duplicate of measure-wide + helper with code syntax
const gap = V(layout, 'layout/section-gap', [240, 96]);                           // unused
const all = V(layout, 'size/logo', [56, 40], { scopes: ['ALL_SCOPES'] });         // all scopes, unused
const margin = V(layout, 'layout/margin', [60, 20]);
V(other, 'Brand Color', [rgb(1, 1, 1)], { type: 'COLOR' });                       // other brand: ignored
// node tree: one text bound to fg/default, frame padding bound to margin
const text = { type: 'TEXT', boundVariables: {}, fills: [{ type: 'SOLID', boundVariables: { color: { type: 'VARIABLE_ALIAS', id: fg.id } } }] };
const root = { id: '1:1', type: 'FRAME', name: 'Page/Desktop', boundVariables: { paddingLeft: { type: 'VARIABLE_ALIAS', id: margin.id } }, fills: [], strokes: [], effects: [], layoutGrids: [], parent: null, findAll: () => [text] };
const page = { type: 'PAGE', id: '0:1' }; root.parent = page;
const figma = {
  currentPage: page, async setCurrentPageAsync() {},
  async getNodeByIdAsync(x) { return x === '1:1' ? root : null; },
  variables: { async getLocalVariableCollectionsAsync() { return [prim, theme, layout, other]; }, async getLocalVariablesAsync() { return vars; } },
  async getLocalTextStylesAsync() { return [{ name: 'Arunika/Heading/H1', boundVariables: { fontSize: { id: 'x' }, lineHeight: { type: 'VARIABLE_ALIAS', id: lh.id }, fontFamily: { type: 'VARIABLE_ALIAS', id: fd.id }, fontStyle: { type: 'VARIABLE_ALIAS', id: fds.id } } }]; },
  async getLocalEffectStylesAsync() { return [{ effects: [{ boundVariables: { color: { type: 'VARIABLE_ALIAS', id: sh.id } } }] }]; },
  async getLocalGridStylesAsync() { return []; }, async getLocalPaintStylesAsync() { return []; },
};
const r = await new (Object.getPrototypeOf(async function () {}).constructor)('figma', src)(figma);
console.log(r.verdict, JSON.stringify(r.counts));
for (const p of r.problems) console.log(`  ${p.rule.padEnd(20)} ${p.name}`);
const has = (rule, name) => r.problems.some(p => p.rule === rule && p.name.includes(name));
const expect = [
  ['15.2 type/lh-* bound on a style', has('bound-metrics', 'Heading/H1')],
  ['15.2 font/display-style constant across modes', has('constant-in-modes', 'font/display-style')],
  ['15.2 shadow/overlay constant across modes', has('constant-in-modes', 'shadow/overlay')],
  ['15.2 measure-wide duplicates span/8', has('duplicate', 'span/8') || has('duplicate', 'layout/measure-wide')],
  ['15.2 section-gap unused', has('unused', 'layout/section-gap')],
  ['15.2 span/* with WEB code syntax', has('helper-code-syntax', 'span/8')],
  ['15.2 one-off primitives (ramp gaps)', has('ramp-gaps', 'ink') && has('ramp-gaps', 'paper')],
  ['ALL_SCOPES flagged', has('all-scopes', 'size/logo')],
  ['other brand ignored', !r.problems.some(p => p.name === 'Brand Color')],
  ['bound tokens not reported unused', !has('unused', 'fg/default') && !has('unused', 'layout/margin') && !has('unused', 'font/display')],
];
for (const [l, ok] of expect) console.log(ok ? 'PASS' : 'FAIL', l);
process.exitCode = expect.every(e => e[1]) ? 0 : 1;
