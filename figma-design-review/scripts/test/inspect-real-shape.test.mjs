// Regression test for what the first real run found (run 1): an empty stacked frame hid the sections,
// same-named sections mixed their counts, scaled spacing read as "no base", and text over a photo
// under a shade was only ever a "check". Usage: node figma-design-review/scripts/test/inspect-real-shape.test.mjs
import { makeFigma, run, report } from './mock.mjs';
import { scaledPage } from './fixture.mjs';

const figma = makeFigma([scaledPage('R:2')]);
const res = await run(figma, 'inspect.figma.js', { "'ROOT_ID'": "'R:2'" });
if (res.error) { console.log(res.error); process.exit(1); }
const f = (rule, name) => res.findings.filter(x => x.rule === rule && (!name || x.name === name));
console.log('sections:', res.sections.map(s => `${s.name}:${s.minor}/${s.major}`).join(' '), '| scaled:', JSON.stringify(res.system.scaled));
for (const x of res.findings.filter(x => /contrast|text-on-image|scaled|empty-layer/.test(x.rule))) console.log(' ', x.sev, x.rule, x.name, '—', x.msg);

report([
  ['descends past the empty stacked frame to the real sections', res.sections.map(s => s.name).join() === 'hero,sec #1,sec #2,stats,cta,nav'],
  ['the empty frame is reported', f('empty-layer').length === 1 && f('empty-layer')[0].id !== res.system.frame.id],
  ['same-named sections keep their own counts (ids, not names)', res.sections.filter(s => /^sec/.test(s.name)).every(s => s.id) && new Set(res.sections.map(s => s.id)).size === 6],
  ['findings carry their section id and label', res.findings.some(x => x.sectionId) && res.findings.filter(x => x.sectionId).every(x => res.sections.some(s => s.id === x.sectionId && s.name === x.section))],
  ['scaled examples come from the frame', f('scaled').some(x => /213 = 160×1\.33/.test(x.msg))],
  ['scaled ×1.33 from 1440 detected', res.system.scaled?.factor === 1.33 && res.system.scaled.from === 1440 && f('scaled').length === 1],
  ['no off-scale-spacing noise when the design is scaled', !f('off-scale-spacing').length],
  ['hero lede under a 50% shade: a check with the worst-case ratio', f('text-on-image', 'hero/lede').some(x => /:1 where the picture is light/.test(x.msg))],
  ['171px hero title passes even on the lightest part of the photo', !f('text-on-image', 'hero/title').length && !f('contrast', 'hero/title').length],
  ['dark text under a 90% black shade fails anywhere in the photo', f('contrast', 'cta/lede').some(x => x.sev === 'major' && /at most/.test(x.msg))],
  ['420rb runs into m²: major overlap', f('overlap', '420rb').some(x => x.sev === 'major' && /runs into "unit"/.test(x.msg))],
  ['2009 sticks out with nothing next to it: minor overflow, not overlap', f('overflow', '2009').length === 1 && !f('overlap', '2009').length],
  ['nav links in one row make one left edge, not seven', !f('ragged').some(x => x.section === 'nav')],
  ['near-dupes are one finding per pair, listing every layer', f('near-colour').every(x => Array.isArray(x.ids)) && f('near-colour').length <= 1],
  ['cool surface next to warm ink: a check about roles, not "probably meant"', f('near-colour').some(x => x.sev === 'check' && /different roles/.test(x.msg))],
]);
