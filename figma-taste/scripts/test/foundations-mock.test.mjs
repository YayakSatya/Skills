// Regression test: runs foundations.figma.js against a mock of the Figma variables/styles API.
// Usage: node scripts/test/foundations-mock.test.mjs   (from the skill folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(here, '..', 'foundations.figma.js'), 'utf8');

function makeFigma() {
  let n = 0; const id = p => `${p}:${++n}`;
  const cols = [], vars = [], text = [], effects = [], grids = [];
  const figma = {
    variables: {
      async getLocalVariableCollectionsAsync() { return [...cols]; },   // the real API returns fresh arrays
      async getLocalVariablesAsync() { return [...vars]; },
      createVariableCollection(name) {
        const c = { id: id('C'), name, modes: [{ modeId: id('M'), name: 'Mode 1' }], hiddenFromPublishing: false, get defaultModeId() { return c.modes[0].modeId; }, set defaultModeId(x) {},
          get variableIds() { return vars.filter(v => v.variableCollectionId === c.id).map(v => v.id); },
          renameMode(mid, nm) { c.modes.find(m => m.modeId === mid).name = nm; },
          addMode(nm) { const m = { modeId: id('M'), name: nm }; c.modes.push(m); return m.modeId; } };
        cols.push(c); return c;
      },
      createVariable(name, col, type) {
        const v = { id: id('V'), name, variableCollectionId: col.id, resolvedType: type, scopes: ['ALL_SCOPES'], codeSyntax: {}, valuesByMode: {},
          setValueForMode(m, val) { if (!col.modes.some(x => x.modeId === m)) throw new Error(`bad mode for ${name}`); v.valuesByMode[m] = val; },
          setVariableCodeSyntax(p, s) { v.codeSyntax[p] = s; } };
        vars.push(v); return v;
      },
      createVariableAlias(v) { return { type: 'VARIABLE_ALIAS', id: v.id }; },
      setBoundVariableForEffect(e, f, v) { return { ...e, boundVariables: { [f]: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
    },
    async listAvailableFontsAsync() {
      return ['Inter|Regular', 'Inter|Medium', 'Inter|Semi Bold', 'Switzer|Regular', 'Switzer|Medium', 'Switzer|Semi Bold', 'Newsreader|Regular', 'Newsreader|Medium', 'Newsreader|Semi Bold']
        .map(x => ({ fontName: { family: x.split('|')[0], style: x.split('|')[1] } }));
    },
    async loadFontAsync() {},
    async getLocalTextStylesAsync() { return [...text]; },
    createTextStyle() { const s = { id: id('S'), name: '', boundVariables: {}, setBoundVariable(f, v) { s.boundVariables[f] = { type: 'VARIABLE_ALIAS', id: v.id }; } }; text.push(s); return s; },
    async getLocalEffectStylesAsync() { return [...effects]; },
    createEffectStyle() { const s = { id: id('E'), name: '', effects: [] }; effects.push(s); return s; },
    async getLocalGridStylesAsync() { return [...grids]; },
    createGridStyle() { const s = { id: id('G'), name: '', layoutGrids: [] }; grids.push(s); return s; },
  };
  return { figma, cols, vars, text };
}
const run = async (figma, src) => new (Object.getPrototypeOf(async function () {}).constructor)('figma', src)(figma);
const checks = [];
const ck = (label, ok, got) => checks.push([label, !!ok, got]);

// 1. defaults (one Light theme)
{
  const { figma, cols, vars, text } = makeFigma();
  const r = await run(figma, SRC);
  const names = cols.map(c => c.name);
  ck('five collections', names.length === 5 && ['primitives', 'theme', 'layout', 'system', 'figma helpers'].every(k => names.some(n => n.endsWith(k))), names);
  const theme = cols.find(c => c.name.endsWith('theme'));
  const roles = vars.filter(v => v.variableCollectionId === theme.id && v.resolvedType === 'COLOR');
  ck('31 colour roles', roles.length === 31, roles.length);
  ck('18 text styles', text.length === 18, text.length);
  ck('styles bind fontSize, never lineHeight/letterSpacing', text.every(s => s.boundVariables.fontSize && !s.boundVariables.lineHeight && !s.boundVariables.letterSpacing && s.lineHeight.unit === 'PERCENT'), null);
  ck('no font variables with one theme', r.fontVariables.length === 0, r.fontVariables);
  const helpers = cols.find(c => c.name.endsWith('figma helpers'));
  const spans = vars.filter(v => v.variableCollectionId === helpers.id);
  ck('helper spans have no code syntax', spans.every(v => !v.codeSyntax.WEB), null);
  const d = helpers.modes.find(m => m.name === 'Desktop').modeId, mo = helpers.modes.find(m => m.name === 'Mobile').modeId;
  const s7 = spans.find(v => v.name === 'span/7');
  ck('span/7 = 1037.5 Desktop, 350 Mobile', s7.valuesByMode[d] === 1037.5 && s7.valuesByMode[mo] === 350, s7.valuesByMode);
  ck('no ALL_SCOPES anywhere', vars.every(v => !v.scopes.includes('ALL_SCOPES')), null);
  ck('semantic + layout + system tokens have WEB syntax', vars.filter(v => !/primitives|figma helpers/.test(cols.find(c => c.id === v.variableCollectionId).name)).every(v => v.codeSyntax.WEB), null);
  ck('default palette passes contrast', r.contrastFails.length === 0, r.contrastFails);
  // token check on the fresh system: only "unused" may appear (nothing is bound before components)
  const tsrc = fs.readFileSync(path.join(here, '..', 'tokens.figma.js'), 'utf8').replace("['ROOT_ID']", '[]');
  const tfig = { ...figma, currentPage: { id: 'P' }, async setCurrentPageAsync() {}, async getNodeByIdAsync() { return null; }, async getLocalPaintStylesAsync() { return []; } };
  const tr = await run(tfig, tsrc);
  const other = tr.problems.filter(p => p.rule !== 'unused');
  ck('token check on fresh system: 0 issues besides unused', other.length === 0, other);
  // manifest on the fresh system
  const msrc = fs.readFileSync(path.join(here, '..', 'manifest.figma.js'), 'utf8');
  const mfig = { ...tfig, fileKey: 'TESTKEY' };
  const m = (await run(mfig, msrc)).manifest;
  ck('manifest: 5 collections, 18 text styles, grid + effect styles', Object.keys(m.collections).length === 5 && m.textStyles.length === 18 && m.gridStyles.length === 2 && m.effectStyles.length === 1, Object.keys(m.collections));
  ck('manifest: theme default mode and roles listed', m.collections.theme.defaultMode === 'Light' && m.collections.theme.variables.includes('scrim/base'), m.collections.theme);
  const before = vars.length;
  await run(figma, SRC);                                              // idempotent re-run
  ck('re-run creates nothing new', vars.length === before && cols.length === 5 && text.length === 18, { vars: vars.length, cols: cols.length });
}
// 2. two options: A dark Switzer square, B light Newsreader+Switzer rounded, Tablet on
{
  const { figma, cols, vars, text } = makeFigma();
  const src = SRC.replace(/THEMES: \{[\s\S]*?\n  \},\n/, `THEMES: {
    'Option A': { ground: 'ink', ink: 'paper', accent: 'accent', dark: true, radiusImage: 0, display: 'Switzer', text: 'Switzer' },
    'Option B': { ground: 'paper', ink: 'ink', accent: 'subject', dark: false, radiusImage: 24, display: 'Newsreader', text: 'Switzer' },
  },
`).replace("LAYOUT_MODES: ['Desktop', 'Mobile'],", "LAYOUT_MODES: ['Desktop', 'Tablet', 'Mobile'],");
  const r = await run(figma, src);
  const theme = cols.find(c => c.name.endsWith('theme'));
  ck('options: theme modes Option A / Option B', theme.modes.map(m => m.name).join('/') === 'Option A/Option B', theme.modes.map(m => m.name));
  ck('options: font/display bound on styles, font/text not (same family)', r.fontVariables.join() === 'display' && text.find(s => s.name.endsWith('Heading/H1')).boundVariables.fontFamily && !text.find(s => s.name.endsWith('Body/Default')).boundVariables.fontFamily, r.fontVariables);
  ck('options: shape/image-radius in theme', vars.some(v => v.name === 'shape/image-radius' && v.variableCollectionId === theme.id), null);
  ck('options: Tablet mode in layout', cols.find(c => c.name.endsWith('layout')).modes.map(m => m.name).join('/') === 'Desktop/Tablet/Mobile', null);
  ck('options: contrast reported for both modes', new Set(r.contrast.map(x => x.mode)).size === 2, null);
  ck('options: both option palettes pass contrast', r.contrastFails.length === 0, r.contrastFails);
  console.log('contrast fails with options:', JSON.stringify(r.contrastFails));

  // collapse after the user picks Option B (not the default mode, so values must be swapped)
  const themeVars = vars.filter(v => v.variableCollectionId === theme.id);
  const modeA = theme.modes[0].modeId, modeB = theme.modes[1].modeId;
  const canvasB = JSON.stringify(themeVars.find(v => v.name === 'bg/canvas').valuesByMode[modeB]);
  const canvasA = JSON.stringify(themeVars.find(v => v.name === 'bg/canvas').valuesByMode[modeA]);
  theme.defaultModeId = modeA;
  theme.removeMode = mid => { theme.modes = theme.modes.filter(m => m.modeId !== mid); };
  for (const v of vars) v.remove = () => { vars.splice(vars.indexOf(v), 1); };
  for (const s of text) { s.fontName = s.fontName || { family: 'Switzer', style: 'Medium' }; const orig = s.setBoundVariable; s.setBoundVariable = (f, v) => { if (v === null) delete s.boundVariables[f]; else orig(f, v); }; }
  const frames = { '9:1': { id: '9:1', explicit: modeB, setExplicitVariableModeForCollection(c, m) { this.explicit = m; }, clearExplicitVariableModeForCollection() { this.explicit = null; } },
                   '9:2': { id: '9:2', explicit: modeA, setExplicitVariableModeForCollection(c, m) { this.explicit = m; }, clearExplicitVariableModeForCollection() { this.explicit = null; } } };
  const csrc = fs.readFileSync(path.join(here, '..', 'collapse-options.figma.js'), 'utf8')
    .replace("const DRY_RUN = true;", "const DRY_RUN = false;").replace("const CHOSEN_FRAMES = [];", "const CHOSEN_FRAMES = ['9:1'];").replace("const ARCHIVED_FRAMES = [];", "const ARCHIVED_FRAMES = ['9:2'];");
  const cfig = { ...figma, async getNodeByIdAsync(id) { return frames[id] || null; } };
  const dry = await run(cfig, csrc.replace("const DRY_RUN = false;", "const DRY_RUN = true;"));
  ck('collapse: dry run changes nothing', dry.dryRun && theme.modes[0].name === 'Option A', dry.plan);
  const cr = await run(cfig, csrc);
  const canvasNow = v => JSON.stringify(vars.find(x => x.name === 'bg/canvas' && x.variableCollectionId === theme.id).valuesByMode[v]);
  ck('collapse: default mode renamed Light and holds B values', theme.modes[0].name === 'Light' && canvasNow(modeA) === canvasB, theme.modes.map(m => m.name));
  ck('collapse: archived mode keeps A values', theme.modes[1].name === 'Option A (archived)' && canvasNow(modeB) === canvasA, null);
  ck('collapse: chosen frame cleared, archived frame re-pointed', frames['9:1'].explicit === null && frames['9:2'].explicit === modeB, { a: frames['9:1'].explicit, b: frames['9:2'].explicit });
  const h1 = text.find(s => s.name.endsWith('Heading/H1'));
  ck('collapse: font var removed, H1 family = Newsreader (B)', !vars.some(v => v.name === 'font/display') && h1.fontName.family === 'Newsreader' && !h1.boundVariables.fontFamily, h1.fontName);
  ck('collapse: radius/image system constant = 24', vars.some(v => v.name === 'radius/image' && Object.values(v.valuesByMode)[0] === 24), null);
}
for (const [l, ok, got] of checks) console.log(ok ? 'PASS' : 'FAIL', l, ok ? '' : JSON.stringify(got));
process.exitCode = checks.every(c => c[1]) ? 0 : 1;
