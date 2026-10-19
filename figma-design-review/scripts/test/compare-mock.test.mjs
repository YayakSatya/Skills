// Regression test: compare.figma.js on an original and a polished copy, and annotate.figma.js on the copy.
// Usage: node figma-design-review/scripts/test/compare-mock.test.mjs
import { makeFigma, run, report, duplicate, place, solid, T } from './mock.mjs';
import { landing } from './fixture.mjs';

const original = landing('1:1');
const copy = duplicate(original);
copy.id = '2:1'; copy.name = 'Landing/Desktop · polish'; copy.x = 1600;
place(copy, 0, 0);
const figma = makeFigma([original, copy]);
const find = (root, name) => root.findAll(n => n.name === name)[0];
const findAll = (root, name) => root.findAll(n => n.name === name);

// An untouched copy: nothing changed, even though its root is renamed and moved.
const same = await run(figma, 'compare.figma.js', { "'ORIGINAL_ID'": "'1:1'", "'COPY_ID'": "'2:1'" });

// A Polish pass: spacing 23 → 24, caption colour, card 3 radius, the lede pulled back to the edge.
find(copy, 'Features/Cards').itemSpacing = 24;
find(copy, 'Card/Caption').fills = [solid('#666666')];
findAll(copy, 'Card')[2].cornerRadius = 12;
find(copy, 'Features/Lede').x = 80;
const polish = await run(figma, 'compare.figma.js', { "'ORIGINAL_ID'": "'1:1'", "'COPY_ID'": "'2:1'", 'const KEEP = [];': "const KEEP = ['Hero', 'Footer'];" });

// Then someone also edits the footer and adds a layer to the gallery.
find(copy, 'Footer/Link').characters = 'Hubungi kami';
const extra = T('Caption', { name: 'Gallery/Caption', x: 80, y: 500, width: 300, height: 24 });
const gal = find(copy, 'Gallery'); extra.parent = gal; gal.children.push(extra);
figma.reindex();
const broken = await run(figma, 'compare.figma.js', { "'ORIGINAL_ID'": "'1:1'", "'COPY_ID'": "'2:1'", 'const KEEP = [];': "const KEEP = ['Hero', 'Footer', 'Heroo'];" });
const sec = (r, n) => r.sections.find(s => s.section === n);

// annotate: pin two notes, re-run (no duplicates), keep a foreign annotation, then clear ours
const lede = find(copy, 'Features/Lede');
lede.annotations = [{ label: 'Dev: keep this copy' }];
const notes = `const NOTES = [{ id: '${lede.id}', text: 'aligned to the 80 edge' }, { id: '${find(copy, 'Card/Caption').id}', text: 'caption 5.7:1 now' }];`;
const ann = { "'ROOT_ID'": "'2:1'", 'const NOTES = [\n  // { id: \'12:345\', text: \'Lede is 3.1:1 on the photo; darken the scrim or move the text off the bright area\' },\n];': notes };
await run(figma, 'annotate.figma.js', ann);
const a2 = await run(figma, 'annotate.figma.js', ann);
const afterPin = lede.annotations.map(a => a.label);
const cleared = await run(figma, 'annotate.figma.js', { "'ROOT_ID'": "'2:1'", 'const CLEAR = false;': 'const CLEAR = true;' });

console.log('polish:', polish.verdict, polish.share, polish.totals, polish.sections.map(s => `${s.section}:${s.untouched ? 'untouched' : s.changed + '/' + s.added + '/' + s.removed}`).join(' '));
console.log('broken:', broken.verdict, broken.keepViolations, broken.missingKeep);
report([
  ['untouched copy: OK, zero changes (root rename and move ignored)', same.verdict === 'OK' && same.totals.changed === 0 && same.totals.added === 0 && same.totals.removed === 0],
  ['polish: OK with Hero and Footer kept', polish.verdict === 'OK' && polish.keepViolations.length === 0],
  ['polish: four property changes, all in Features', polish.changes.length === 4 && polish.changes.every(c => c.section === 'Features')],
  ['polish: Hero, Gallery and Footer untouched', ['Hero', 'Gallery', 'Footer'].every(n => sec(polish, n).untouched)],
  ['polish: the 23 → 24 change is reported with from/to', polish.changes.some(c => c.prop === 'itemSpacing' && c.from === 23 && c.to === 24)],
  ['polish: share of layers touched is small and under budget', polish.share > 0 && polish.share <= 0.25 && !polish.overBudget],
  ['edited footer: FAIL, Footer is a keep violation', broken.verdict === 'FAIL' && broken.keepViolations.includes('Footer')],
  ['a misspelt keep section is reported, not ignored', broken.missingKeep.includes('Heroo')],
  ['added layer counted in Gallery', sec(broken, 'Gallery').added === 1 && broken.added.some(a => /Gallery\/Caption/.test(a.path))],
  ['annotate: notes pinned once, foreign annotation kept', a2.annotated.length === 2 && afterPin.length === 2 && afterPin.includes('Dev: keep this copy') && afterPin.includes('Review: aligned to the 80 edge')],
  ['annotate CLEAR removes only Review notes', cleared.cleared === 2 && lede.annotations.length === 1 && lede.annotations[0].label === 'Dev: keep this copy'],
  ['compare is read-only on the original', !find(original, 'Features/Lede').annotations.length && find(original, 'Features/Cards').itemSpacing === 23],
]);

// Same-named sections and an empty stacked frame (run 1): labels "sec #1", "sec #2" keep them apart.
{
  const { scaledPage } = await import('./fixture.mjs');
  const orig = scaledPage('R:3');
  const cp = duplicate(orig); cp.id = 'R:4'; place(cp);
  const fg = makeFigma([orig, cp]);
  const secs = cp.findAll(n => n.name === 'sec');
  secs[1].itemSpacing = 85;                                   // edit sec #2 only
  const ok = await run(fg, 'compare.figma.js', { "'ORIGINAL_ID'": "'R:3'", "'COPY_ID'": "'R:4'", 'const KEEP = [];': "const KEEP = ['hero', 'sec #1', 'cta'];" });
  secs[0].paddingTop = 200;                                   // now sec #1 too
  const bad = await run(fg, 'compare.figma.js', { "'ORIGINAL_ID'": "'R:3'", "'COPY_ID'": "'R:4'", 'const KEEP = [];': "const KEEP = ['hero', 'sec #1', 'cta'];" });
  console.log('same-named:', ok.verdict, ok.sections.map(s => `${s.section}:${s.untouched ? 'untouched' : s.changed}`).join(' '), '|', bad.verdict, bad.keepViolations);
  report([
    ['same-named sections are told apart (sec #1 kept, sec #2 changed)', ok.verdict === 'OK' && ok.sections.find(s => s.section === 'sec #2')?.changed === 1 && ok.sections.find(s => s.section === 'sec #1')?.untouched],
    ['editing sec #1 is a keep violation', bad.verdict === 'FAIL' && bad.keepViolations.join() === 'sec #1'],
  ]);
}
