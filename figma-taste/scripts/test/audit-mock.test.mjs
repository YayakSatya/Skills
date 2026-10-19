// Mock Figma environment for running audit.figma.js / audit.min.figma.js in Node.
// Regression test: runs audit.figma.js and audit.min.figma.js on a mock node tree and checks they agree.
// Usage: node scripts/test/audit-mock.test.mjs   (from the skill folder)
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const scripts = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mixed = Symbol('mixed');
let nextId = 1;
const styles = new Map();
function style(name, size) { const id = `S:${nextId++}`; styles.set(id, { id, name, size }); return id; }
const H1 = style('Arunika/Heading/H1', 112);
const ST = style('Arunika/Statement', 40);
const SM = style('Arunika/Small/Default', 15);
const BD = style('Arunika/Body/Default', 20);

function node(type, props = {}, children = []) {
  const n = {
    id: props.id || `${nextId++}:1`, type, name: props.name || type, visible: true,
    fills: [], strokes: [], effects: [], boundVariables: {}, annotations: [],
    layoutMode: 'NONE', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, itemSpacing: 0,
    x: 0, width: 100, height: 100, layoutSizingHorizontal: 'FIXED', ...props, children: [],
  };
  for (const c of children) { c.parent = n; n.children.push(c); }
  n.findAll = (fn = () => true) => { const out = []; const walk = m => { for (const c of m.children || []) { if (fn(c)) out.push(c); walk(c); } }; walk(n); return out; };
  n.findOne = fn => n.findAll(fn)[0] || null;
  if (type === 'TEXT') {
    const st = styles.get(props.textStyleId);
    const size = props.fontSize || st?.size || 16;
    n.getStyledTextSegments = () => [{ fontName: { family: props.family || 'Switzer', style: 'Regular' }, fontSize: size,
      textCase: 'ORIGINAL', letterSpacing: { unit: 'PERCENT', value: 0 }, lineHeight: { unit: 'PERCENT', value: 100 } }];
    n.characters = props.characters || '';
  }
  return n;
}
const bound = { color: { id: 'V:1' } };
const solid = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: bound };
const T = (chars, sid, p = {}) => node('TEXT', { characters: chars, textStyleId: sid, fills: [solid], ...p });
const IMG = { type: 'IMAGE', imageHash: 'h' };

// Root with a column grid, 1920 wide.
const sec = (name, kids, p = {}) => node('FRAME', { name, layoutMode: 'VERTICAL', paddingLeft: 60, paddingRight: 60,
  boundVariables: { paddingLeft: 1, paddingRight: 1, itemSpacing: 1 }, itemSpacing: 64, width: 1920, ...p }, kids);

// Component "Card": heading ABOVE a small label (not an eyebrow). Its instance children are new objects.
const card = node('INSTANCE', { name: 'Card', layoutMode: 'VERTICAL', mainComponent: { name: 'Card' } }, [
  T('Gedung kantor', H1, { height: 112 }), T('Lihat layanan', SM, { height: 18 }),
]);
// Instance quirk: parent.children returns fresh copies (different object identity, same ids)
Object.defineProperty(card, 'children', { get() { return this._kids.map(k => ({ ...k })); }, configurable: true });
card._kids = [];
{
  const kids = [T('Gedung kantor', H1, { height: 112 }), T('Lihat layanan', SM, { height: 18 })];
  for (const k of kids) k.parent = card;
  card._kids = kids;
  card.findAll = (fn = () => true) => kids.filter(fn);
  card.findOne = fn => card.findAll(fn)[0] || null;
}

const eyebrow = sec('Section/Services', [T('Our services', SM, { height: 18, x: 60 }), T('Layanan kami', H1, { height: 112, x: 60 })]);
const hero = sec('Section/Hero', [
  T('Membangun gedung komersial', H1, { height: 224, x: 60 }),                       // 2 lines: ok
  T('A large statement set at forty pixels runs three lines here.', ST, { height: 120, x: 60 }),   // 3 lines, Statement: exempt (4.1)
  node('FRAME', { name: 'Hero/Actions', layoutMode: 'HORIZONTAL', layoutSizingHorizontal: 'HUG', x: 60, width: 423, itemSpacing: 16, boundVariables: { itemSpacing: 1 } }, []),
  node('RECTANGLE', { name: 'image/hero', fills: [IMG], x: 60, width: 1800 }),
], { fills: [IMG] });
const split = sec('Section/Stats', [
  node('FRAME', { name: 'Stats/Row', layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'MIN', x: 60, width: 1800, itemSpacing: 30, boundVariables: { itemSpacing: 1 } }, [
    node('RECTANGLE', { name: 'image/a', fills: [IMG], x: 60, width: 1037.5 }),
    node('RECTANGLE', { name: 'image/b', fills: [IMG], x: 1127.5, width: 732.5 }),
  ]),
  T('© 2026 Arunika™', SM, { height: 18, x: 60 }),
  T('🚀 Launch', SM, { height: 18, x: 60 }),
  T('Body text', BD, { height: 30, x: 60 }),
]);
const badHead = sec('Section/Bad', [T('Unstyled headline that wraps over three lines', null, { fontSize: 56, height: 168, x: 60 }), card]);
const root = node('FRAME', { id: '1:1', name: 'Page/Desktop', layoutMode: 'VERTICAL', width: 1920, height: 4000,
  fills: [solid], layoutGrids: [{ pattern: 'COLUMNS', alignment: 'STRETCH', count: 12, gutterSize: 30, offset: 60, visible: true }] },
  [hero, eyebrow, split, badHead]);
const page = node('PAGE', { id: '0:1', name: 'Page' }, [root]);
// absolute x: children already carry page-absolute x; give everything an absoluteTransform
const setAbs = n => { n.absoluteTransform = [[1, 0, n.x || 0], [0, 1, 0]]; for (const c of (n._kids || n.children || [])) setAbs(c); };
setAbs(root);
const byId = new Map(); const index = n => { byId.set(n.id, n); for (const c of (n._kids || n.children || [])) index(c); }; index(page);

const figma = {
  mixed, currentPage: page,
  async getNodeByIdAsync(id) { return byId.get(id) || null; },
  async getStyleByIdAsync(id) { return styles.get(id) || null; },
  async setCurrentPageAsync(p) { figma.currentPage = p; },
};

async function run(file) {
  let code = fs.readFileSync(path.join(scripts, file), 'utf8').replace("['ROOT_ID']", "['1:1']");
  const fn = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code);
  return fn(figma);
}
const full = await run('audit.figma.js');
const min = await run('audit.min.figma.js');
const label = f => { const n = byId.get(f.id); return n && n.type === 'TEXT' ? n.characters : f.name; };
const rules = r => r.results[0].fails.map(f => `${f.rule}:${label(f)}`).sort();
const wrules = r => r.results[0].warns.map(f => `${f.rule}:${label(f)}`).sort();
const same = JSON.stringify(full) === JSON.stringify(min);
console.log('full == min (whole result):', same);
if (!same) { console.log('FULL', JSON.stringify(full).slice(0, 1500)); console.log('MIN ', JSON.stringify(min).slice(0, 1500)); }
console.log('fails:', rules(full));
console.log('warns:', wrules(full));
const has = (r, x) => rules(full).includes(`${r}:${x}`) || wrules(full).includes(`${r}:${x}`);
const expect = [
  ['eyebrow on "Our services" (label above heading)', has('eyebrow', 'Our services')],
  ['no eyebrow inside the instance (label below heading, 2.1)', !rules(full).some(x => x === 'eyebrow:Lihat layanan')],
  ['Statement 3 lines is NOT a headline fail (4.1)', !rules(full).some(x => x.startsWith('headline-lines:A large statement'))],
  ['unstyled 56px 3-line text IS a headline fail', rules(full).some(x => x.startsWith('headline-lines:Unstyled'))],
  ['hug-width Hero/Actions: no right-edge off-grid (4.3)', !wrules(full).some(x => x === 'off-grid:Hero/Actions')],
  ['7+5 split on grid: no off-grid for image/a, image/b', !wrules(full).some(x => /off-grid:image\/(a|b)/.test(x))],
  ['© ™ pass, 🚀 fails (2.2)', has('emoji', '🚀 Launch') && !has('emoji', '© 2026 Arunika™')],
];
for (const [label, ok] of expect) console.log(ok ? 'PASS' : 'FAIL', label);
process.exitCode = expect.every(e => e[1]) && same ? 0 : 1;
