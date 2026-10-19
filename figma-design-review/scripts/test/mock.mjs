// A small mock of the Figma Plugin API for running the *.figma.js scripts in Node.
// Node x/y are relative to the parent, as in Figma; absoluteBoundingBox is derived by place().
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const mixed = Symbol('mixed');
let nextId = 1;
export const styles = new Map();
export const variables = new Map();
export function style(name) { const id = `S:${nextId++}`; styles.set(id, { id, name }); return id; }
export function variable(name) { const id = `VariableID:${nextId++}`; variables.set(id, { id, name }); return id; }

export const rgb = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
export const solid = (h, p = {}) => ({ type: 'SOLID', color: rgb(h), visible: true, ...p });
export const image = (hash = 'h') => ({ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL', visible: true });

export function node(type, props = {}, children = []) {
  const n = {
    id: props.id || `${nextId++}:1`, type, name: props.name || type, visible: true,
    fills: [], strokes: [], effects: [], annotations: [], opacity: 1,
    layoutMode: 'NONE', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, itemSpacing: 0,
    x: 0, y: 0, width: 100, height: 100, clipsContent: false, ...props, children: [],
  };
  for (const c of children) { c.parent = n; n.children.push(c); }
  n.findAll = (fn = () => true) => { const out = []; const walk = m => { for (const c of m.children || []) { if (fn(c)) out.push(c); walk(c); } }; walk(n); return out; };
  n.findOne = fn => n.findAll(fn)[0] || null;
  if (type === 'TEXT') {
    n.textStyleId = props.textStyleId || '';
    n.characters = props.characters || '';
    n.textAlignHorizontal = props.textAlignHorizontal || 'LEFT';
    n.fontSize = props.fontSize || 16;
    n.getStyledTextSegments = () => [{
      characters: n.characters, fontName: { family: props.family || 'Inter', style: props.weight || 'Regular' },
      fontSize: n.fontSize, fills: n.fills, lineHeight: { unit: 'PERCENT', value: props.lh || 150 },
    }];
  }
  if (type === 'INSTANCE') n.getMainComponentAsync = async () => props.main || { id: 'C:1', name: n.name };
  return n;
}
export const T = (characters, p = {}) => node('TEXT', { characters, fills: [solid('#111111')], ...p });

// absoluteBoundingBox from relative x/y
export function place(n, ox = 0, oy = 0) {
  const ax = ox + (n.x || 0), ay = oy + (n.y || 0);
  n.absoluteBoundingBox = { x: ax, y: ay, width: n.width, height: n.height };
  for (const c of n.children || []) place(c, ax, ay);
}

// deep copy with fresh ids (what Duplicate does), placed at dx
export function duplicate(n, parent = null) {
  const skip = new Set(['id', 'children', 'parent', 'absoluteBoundingBox', 'findAll', 'findOne', 'getStyledTextSegments', 'getMainComponentAsync']);
  const props = Object.fromEntries(Object.entries(n).filter(([k]) => !skip.has(k)));
  props.fills = JSON.parse(JSON.stringify(n.fills));
  props.strokes = JSON.parse(JSON.stringify(n.strokes));
  props.annotations = [];
  const c = node(n.type, props, (n.children || []).map(k => duplicate(k)));
  if (n.getStyledTextSegments) {
    const seg0 = n.getStyledTextSegments()[0];
    c.getStyledTextSegments = () => [{ ...seg0, characters: c.characters, fontSize: c.fontSize, fills: c.fills }];
  }
  if (n.getMainComponentAsync) c.getMainComponentAsync = n.getMainComponentAsync;
  if (parent) c.parent = parent;
  return c;
}

export function makeFigma(roots) {
  const page = node('PAGE', { id: '0:1', name: 'Page' }, roots);
  const byId = new Map();
  const index = n => { byId.set(n.id, n); for (const c of n.children || []) index(c); };
  const figma = {
    mixed, currentPage: page, byId,
    reindex() { byId.clear(); index(page); },
    async getNodeByIdAsync(id) { return byId.get(id) || null; },
    async getStyleByIdAsync(id) { return styles.get(id) || null; },
    async setCurrentPageAsync(p) { figma.currentPage = p; },
    variables: { async getVariableByIdAsync(id) { return variables.get(id) || null; } },
  };
  figma.reindex();
  return figma;
}

export async function run(figma, file, replace = {}) {
  let code = fs.readFileSync(path.join(scripts, file), 'utf8');
  for (const [a, b] of Object.entries(replace)) {
    if (!code.includes(a)) throw new Error(`${file}: "${a}" not found`);
    code = code.replace(a, b);
  }
  const fn = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code);
  return fn(figma);
}

export function report(checks) {
  for (const [label, ok] of checks) console.log(ok ? 'PASS' : 'FAIL', label);
  process.exitCode = checks.every(c => c[1]) ? 0 : 1;
}
