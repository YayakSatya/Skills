// ===== figma-design-review annotate =====
// Pins review notes on layers as Figma annotations ("Review: …"), so the designer sees them in Dev
// Mode and the annotation panel. It only touches annotations that start with PREFIX; the design and
// anyone else's annotations stay as they are. CLEAR = true removes this skill's notes from every layer
// under ROOT_ID (run it when the review is settled).
const ROOT_ID = 'ROOT_ID';
const PREFIX = 'Review';
const NOTES = [
  // { id: '12:345', text: 'Lede is 3.1:1 on the photo; darken the scrim or move the text off the bright area' },
];
const CLEAR = false;

const ROOT = await figma.getNodeByIdAsync(ROOT_ID);
if (!ROOT) return { error: `node ${ROOT_ID} not found` };
const mine = a => (a.label || a.labelMarkdown || '').startsWith(`${PREFIX}:`);
const done = [], failed = [];
if (CLEAR) {
  for (const n of [ROOT, ...ROOT.findAll(() => true)]) {
    if (!Array.isArray(n.annotations) || !n.annotations.some(mine)) continue;
    try { n.annotations = n.annotations.filter(a => !mine(a)); done.push(n.id); } catch (e) { failed.push({ id: n.id, error: String(e) }); }
  }
  return { cleared: done.length, failed };
}
for (const { id, text } of NOTES) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { failed.push({ id, error: 'not found' }); continue; }
  try {
    const prev = Array.isArray(n.annotations) ? n.annotations : [];
    const label = `${PREFIX}: ${text}`;
    if (!prev.some(a => a.label === label)) n.annotations = [...prev, { label }];
    done.push(id);
  } catch (e) { failed.push({ id, error: String(e) }); }
}
return { annotated: done, failed };
