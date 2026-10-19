// Regression test: runs inspect.figma.js on the mock landing page and checks what it finds and what
// it leaves alone. Usage: node figma-design-review/scripts/test/inspect-mock.test.mjs
import { makeFigma, run, report } from './mock.mjs';
import { landing } from './fixture.mjs';

const figma = makeFigma([landing('1:1')]);
const res = await run(figma, 'inspect.figma.js', { "'ROOT_ID'": "'1:1'" });
if (res.error) { console.log(res.error); process.exit(1); }
const f = (rule, name) => res.findings.filter(x => x.rule === rule && (!name || x.name === name));
const sec = name => res.sections.find(s => s.name === name);
const sum = await run(figma, 'inspect.figma.js', { "'ROOT_ID'": "'1:1'", 'const SUMMARY = false': 'const SUMMARY = true' });
console.log('totals:', res.totals, 'sections:', res.sections.map(s => `${s.name}:${s.hint}`).join(' '));

report([
  ['reads the grid: 12 columns, margin 80, gutter 24', res.system.grid?.columns === 12 && res.system.grid.margin === 80 && res.system.grid.gutter === 24],
  ['finds the four sections', res.sections.map(s => s.name).join() === 'Hero,Features,Gallery,Footer'],
  ['spacing base 8', res.system.spacingBase === 8],
  ['near-spacing: 23 next to 24', f('near-spacing').some(x => x.name === 'Features/Cards' && /23px on 1 layer\(s\) next to 24px/.test(x.msg))],
  ['near-radius: 13 next to 12', f('near-radius', 'Card').length === 1],
  ['near-colour: #343434 next to #333333', f('near-colour').some(x => /#343434 on 1 layer\(s\) next to #333333/.test(x.msg) && x.sev === 'minor')],
  ['near-size: 15px next to 16px', f('near-size', 'Card/Body').length === 1],
  ['14px is not a near-size of 16px', !f('near-size').some(x => /^14px/.test(x.msg))],
  ['near-edge: lede at 83 vs 80', f('near-edge', 'Features/Lede').length === 1],
  ['contrast major: #BBBBBB caption on white card', f('contrast', 'Card/Caption').some(x => x.sev === 'major')],
  ['white footer text on #111111 passes', !f('contrast').some(x => /^Footer/.test(x.name))],
  ['hero title on the photograph is a check, not a contrast fail', f('text-on-image', 'Hero/Title').length === 1 && !f('contrast', 'Hero/Title').length],
  ['empty image slot', f('empty-image', 'image/gallery').length === 1],
  ['off-grid: gallery image at 150', f('off-grid', 'image/gallery').length === 1],
  ['clipped quote text', f('clipped', 'Quote/Text').length === 1],
  ['measure: lede ≈160 characters per line', f('measure', 'Features/Lede').length === 1],
  ['text and button right edges are not grid-checked', !f('off-grid').some(x => /^ends/.test(x.msg) && /Title|Button|Footer/.test(x.name))],
  ['cards inside the row are on the grid', !f('off-grid', 'Card').length],
  ['text inside cards is not checked for edges', !f('near-edge', 'Card/Title').length && !f('off-grid', 'Card/Body').length],
  ['the variable name is resolved', res.system.variables.some(v => v.name === 'color/accent')],
  ['text styles in use are listed', res.system.textStyles.used.some(s => s.style === 'Heading/H4' && s.uses === 3)],
  ['Footer measured as keep', sec('Footer').hint === 'keep'],
  ['Hero measured as keep (a check is not a fault)', sec('Hero').hint === 'keep'],
  ['Gallery not keep', sec('Gallery').hint !== 'keep'],
  ['summary mode returns top findings per section', !!sum.top && Array.isArray(sum.top.Features) && !sum.findings],
  ['read-only: no annotation or name changed', [...figma.byId.values()].every(n => !n.annotations?.length && !/review/i.test(n.name))],
]);
