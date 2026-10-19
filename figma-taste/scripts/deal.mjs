#!/usr/bin/env node
// figma-taste: deal art directions and non-repeating compositions.
// Usage:
//   node deal.mjs --brief "<one line>" --sections intro,work,about,contact --options 3
//   node deal.mjs --brief "<...>" --sections ... --direction <id> [--seed n]
//        [--have photography,items,logos,address,real-figure,real-process,product-ui]
//        [--items work:3,faq:5] [--require hero:hero-full-bleed,clients:s-logo-wall] [--keep type,palette]
//   node deal.mjs --brief "<...>" --sections ... --options-deal 2 [--directions quiet-luxury,editorial-grid]
//        deals N design options in one run: different direction, different hero, different composition per
//        role where needs allow; saved as .figma-taste/deal-A.json, deal-B.json, …
//   node deal.mjs ... --direction <id> --option B --avoid .figma-taste/deal-A.json
//   node deal.mjs --show [A]
//   node deal.mjs --redraw section:<role>[=<compositionId>] | --redraw hero[=<id>]
//   node deal.mjs --alternatives <role>
//   node deal.mjs --list roles|directions|compositions|have
//   node deal.mjs --help
import fs from 'node:fs';
import path from 'node:path';

const HELP = `figma-taste deal

  --brief "<line>"        one line about the subject (also seeds the deal)
  --sections a,b,c        roles in the order of the argument (see --list roles); footer is added
  --options N             print N directions to choose from
  --direction <id>        deal hero + sections for this direction
  --seed N                reproduce or vary a deal (each design option uses its own seed)
  --have a,b              what really exists. When given, composition needs are enforced:
                            photo, photos         photographs (alias: photography, unsplash)
                            items                 a list of real entries (services, rooms, projects…)
                            logos                 client logos (dummy wordmarks count when marked)
                            address               a real address
                            real-figure           one true number from the brief
                            real-process          a real sequence of stages
                            product-ui            a real product interface
                          Without --have the deal is lenient (only product-ui is enforced).
  --items role:n,…        how many entries a role has; enforces minimums
                            (s-catalogue 6, s-index-list 4, s-spec-table 5, s-questions 4,
                             s-gallery-wall 4 photos, s-filmstrip 5 photos, hero-index 3)
  --require slot:id,…     pin compositions a brief or PRD mandates (hero:<id> or <role>:<id>);
                          pinned slots are listed as "Pinned (brief)", not as redraws
  --keep type,palette     the brand or reference sheet fixes these
  --option <name>         name this deal (A, B, …); it is also saved as .figma-taste/deal-<name>.json
  --options-deal N        deal N design options at once (different directions, heroes and, where the
                          content allows, different compositions per role); --directions a,b picks them
  --avoid f.json,…        prefer compositions not used for the same role in these deals (pins exempt)
  hero and footer are dealt automatically; listing them in --sections is ignored
  --show [option] | --redraw … [--option X] | --alternatives <role> | --list roles|directions|compositions|have
`;

const OUT_DIR = path.resolve('.figma-taste');
const STATE = path.join(OUT_DIR, 'deal.json');

// ---------------------------------------------------------------- library
const DIRECTIONS = [
  { id: 'editorial-grid', name: 'Editorial grid',
    idea: 'A magazine spread: strong columns, big captions, photographs cropped like features.',
    type: 'One serif for display and one grotesk for text (e.g. Fraunces/Newsreader + Inter Tight/Instrument Sans), or one serif throughout.',
    palette: 'Paper ground 70%, ink 25%, one restrained accent 5% on the action only.',
    radius: 'radius/none', images: 'Square corners, 3:2 and 4:5, natural colour, one feature image per spread.',
    heroes: ['hero-offset-stack', 'hero-split-7-5', 'hero-poster-type'],
    prefer: ['s-sticky-pair', 's-gallery-wall', 's-statement', 's-columns-text', 's-index-list'] },
  { id: 'swiss-poster', name: 'Swiss poster',
    idea: 'Type is the image: one grotesk, enormous, set flush left on a strict grid.',
    type: 'One neo-grotesk in two weights (e.g. Inter Display, Archivo, Familjen Grotesk). Display ≥ 9vw.',
    palette: 'White or very light ground, black ink, one saturated accent field used once as a full section.',
    radius: 'radius/none', images: 'Few but large, black-and-white or one colour grade, hard crops.',
    heroes: ['hero-poster-type', 'hero-field', 'hero-index'],
    prefer: ['s-big-figure', 's-index-list', 's-field-band', 's-statement', 's-spec-table'] },
  { id: 'catalogue', name: 'Catalogue',
    idea: 'The page as a printed catalogue: objects presented one by one with their facts.',
    type: 'A precise grotesk with tabular figures (e.g. Manrope, Instrument Sans, Satoshi-like).',
    palette: 'Neutral warm-grey ground, ink, the product\'s own material colour as the accent field.',
    radius: 'radius/none', images: 'Objects on calm grounds, 4:5 portrait, consistent light.',
    heroes: ['hero-strip', 'hero-split-7-5', 'hero-offset-stack'],
    prefer: ['s-catalogue', 's-spec-table', 's-filmstrip', 's-split-media', 's-questions'] },
  { id: 'quiet-luxury', name: 'Quiet luxury',
    idea: 'Space and one remarkable photograph per screen; nothing explains itself twice.',
    type: 'A high-contrast serif for display (e.g. Cormorant, Playfair Display, Bodoni Moda) + a quiet sans for text.',
    palette: 'Deep ground (near-black, oxblood or forest) or bone white; ink; no bright accent.',
    radius: 'radius/none', images: 'Full-bleed, low key, slow light; one per screen, large.',
    heroes: ['hero-full-bleed', 'hero-split-7-5', 'hero-field'],
    prefer: ['s-full-image', 's-split-media', 's-statement', 's-place', 's-index-list'] },
  { id: 'brutal-type', name: 'Brutal type',
    idea: 'Loud, compressed type and blocks of flat colour; confidence over polish.',
    type: 'A condensed or extended display face (e.g. Anton, Archivo Black, Bricolage Grotesque) + plain sans.',
    palette: 'Two strong flat colours alternating as section fields, plus black and white.',
    radius: 'radius/none or radius/full (decide once)', images: 'Hard-cropped, high contrast, often duotone-feeling through grading.',
    heroes: ['hero-field', 'hero-poster-type', 'hero-strip'],
    prefer: ['s-field-band', 's-big-figure', 's-index-list', 's-filmstrip', 's-columns-text'] },
  { id: 'warm-craft', name: 'Warm craft',
    idea: 'Material and hands: close-ups of the making, the page paced like a visit to the workshop.',
    type: 'A humanist serif or soft grotesk (e.g. Newsreader, Literata, DM Sans) in one family.',
    palette: 'Taken from the material itself (leather, clay, wood, linen); ink; accent = the material.',
    radius: 'radius/none', images: 'Close-ups, warm daylight, 4:5 and 3:2, textures filling the frame.',
    heroes: ['hero-split-7-5', 'hero-strip', 'hero-full-bleed'],
    prefer: ['s-flow', 's-sticky-pair', 's-gallery-wall', 's-split-media', 's-place'] },
  { id: 'technical-spec', name: 'Technical spec',
    idea: 'Exactness as character: the page reads like a well-made specification sheet.',
    type: 'One grotesk with tabular figures (e.g. IBM Plex Sans, Geologica, Inter); no monospace.',
    palette: 'Light neutral ground, ink, one signal colour on actions and one diagram.',
    radius: 'radius/s', images: 'Product UI fragments and clean product photography; nothing atmospheric.',
    heroes: ['hero-ui', 'hero-offset-stack', 'hero-index'],
    prefer: ['s-spec-table', 's-flow', 's-columns-text', 's-big-figure', 's-questions'] },
  { id: 'gallery-wall', name: 'Gallery wall',
    idea: 'The work is hung, not listed: photographs of different sizes on one wall with captions.',
    type: 'One neutral grotesk at small sizes, one display size for titles (e.g. Neue-like: Inter Tight, Hanken Grotesk).',
    palette: 'White or concrete-grey ground, ink, no accent but the photographs.',
    radius: 'radius/none', images: 'Mixed sizes on a strict grid, captions in Small, one colour grade.',
    heroes: ['hero-strip', 'hero-poster-type', 'hero-offset-stack'],
    prefer: ['s-gallery-wall', 's-filmstrip', 's-index-list', 's-full-image', 's-statement'] },
  { id: 'field-colour', name: 'Field colour',
    idea: 'Whole sections change colour like rooms; each field carries one message.',
    type: 'One confident grotesk or a soft serif (e.g. Plus Jakarta Sans alone, or Gloock + Inter).',
    palette: 'Three fields taken from the subject (sea, sand, stone) cycling by section, plus ink.',
    radius: 'radius/full for buttons only', images: 'Photographs inset inside fields, never full-bleed.',
    heroes: ['hero-field', 'hero-offset-stack', 'hero-split-7-5'],
    prefer: ['s-field-band', 's-split-media', 's-big-figure', 's-place', 's-questions'] },
  { id: 'index-archive', name: 'Index archive',
    idea: 'Everything is a list you can scan; the archive itself is the visual.',
    type: 'One grotesk, two sizes: very large titles and small facts (e.g. Inter Tight, Schibsted Grotesk).',
    palette: 'Off-white ground, ink, tone steps instead of lines, accent on hover/action only.',
    radius: 'radius/none', images: 'One image per entry, small in the list and large in a feature row.',
    heroes: ['hero-index', 'hero-poster-type', 'hero-offset-stack'],
    prefer: ['s-index-list', 's-spec-table', 's-sticky-pair', 's-full-image', 's-questions'] },
];

const COMPOSITIONS = {
  // heroes
  'hero-poster-type': { kind: 'hero', needs: ['photo'] },
  'hero-full-bleed': { kind: 'hero', needs: ['photo'] },
  'hero-split-7-5': { kind: 'hero', needs: ['photo'] },
  'hero-offset-stack': { kind: 'hero', needs: ['photo'] },
  'hero-index': { kind: 'hero', needs: ['items'] },
  'hero-strip': { kind: 'hero', needs: ['photos'] },
  'hero-field': { kind: 'hero', needs: [] },
  'hero-ui': { kind: 'hero', needs: ['product-ui'] },
  // sections
  's-statement': { kind: 'section', needs: [] },
  's-split-media': { kind: 'section', needs: ['photo'] },
  's-index-list': { kind: 'section', needs: ['items'] },
  's-gallery-wall': { kind: 'section', needs: ['photos'] },
  's-filmstrip': { kind: 'section', needs: ['photos'] },
  's-big-figure': { kind: 'section', needs: ['real-figure'] },
  's-columns-text': { kind: 'section', needs: [] },
  's-field-band': { kind: 'section', needs: [] },
  's-sticky-pair': { kind: 'section', needs: [] },
  's-catalogue': { kind: 'section', needs: ['items', 'photos'] },
  's-flow': { kind: 'section', needs: ['real-process'] },
  's-place': { kind: 'section', needs: ['address', 'photo'] },
  's-spec-table': { kind: 'section', needs: ['items'] },
  's-full-image': { kind: 'section', needs: ['photo'] },
  's-questions': { kind: 'section', needs: ['items'] },
  's-logo-wall': { kind: 'section', needs: ['logos'] },
  's-close-name': { kind: 'footer', needs: [] },
  's-closing-simple': { kind: 'footer', needs: [] },
};

const ROLES = {
  intro: ['s-statement', 's-big-figure', 's-columns-text', 's-split-media'],
  about: ['s-split-media', 's-sticky-pair', 's-statement', 's-columns-text', 's-full-image'],
  story: ['s-sticky-pair', 's-split-media', 's-full-image', 's-statement'],
  work: ['s-index-list', 's-gallery-wall', 's-filmstrip', 's-catalogue', 's-sticky-pair'],
  projects: ['s-index-list', 's-gallery-wall', 's-filmstrip', 's-sticky-pair'],
  gallery: ['s-gallery-wall', 's-filmstrip', 's-full-image'],
  services: ['s-index-list', 's-columns-text', 's-sticky-pair', 's-spec-table'],
  features: ['s-columns-text', 's-sticky-pair', 's-split-media', 's-spec-table'],
  process: ['s-flow', 's-sticky-pair', 's-columns-text'],
  products: ['s-catalogue', 's-filmstrip', 's-gallery-wall', 's-split-media'],
  collection: ['s-catalogue', 's-filmstrip', 's-gallery-wall'],
  menu: ['s-index-list', 's-spec-table', 's-catalogue'],
  rooms: ['s-index-list', 's-catalogue', 's-split-media', 's-filmstrip'],
  programme: ['s-index-list', 's-spec-table', 's-sticky-pair'],
  team: ['s-gallery-wall', 's-index-list', 's-filmstrip'],
  stats: ['s-big-figure'],
  pricing: ['s-spec-table', 's-index-list'],
  faq: ['s-questions'],
  testimonial: ['s-statement'],
  proof: ['s-statement', 's-big-figure'],
  clients: ['s-logo-wall', 's-columns-text'],
  logos: ['s-logo-wall', 's-columns-text'],
  location: ['s-place', 's-full-image'],
  contact: ['s-place', 's-field-band', 's-spec-table'],
  cta: ['s-field-band', 's-statement'],
  rest: ['s-full-image'],
  footer: ['s-close-name', 's-closing-simple'],
};
// s-logo-wall is only dealt to roles that ask for it, never as a generic filler.
const ANY_SECTION = Object.keys(COMPOSITIONS).filter(k => COMPOSITIONS[k].kind === 'section' && k !== 's-logo-wall');

// Minimum entries (or photographs) a composition needs when --items gives a count for the role.
const MIN_ITEMS = {
  's-catalogue': 6, 's-index-list': 4, 's-spec-table': 5, 's-questions': 4,
  's-gallery-wall': 4, 's-filmstrip': 5, 'hero-index': 3, 'hero-strip': 3, 's-logo-wall': 4,
};
const HAVE_VALUES = ['photo', 'photos', 'items', 'logos', 'address', 'real-figure', 'real-process', 'product-ui'];
const HAVE_ALIASES = { photography: ['photo', 'photos'], unsplash: ['photo', 'photos'], 'product-photo': ['photo', 'photos'], illustration: [], video: [] };
function normaliseHave(list) {
  const out = new Set(); const unknown = [];
  for (const h of list) {
    if (HAVE_ALIASES[h]) HAVE_ALIASES[h].forEach(x => out.add(x));
    else if (HAVE_VALUES.includes(h)) out.add(h);
    else unknown.push(h);
  }
  return { have: [...out], unknown };
}

// ---------------------------------------------------------------- utils
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; }
    } else a._.push(t);
  }
  return a;
}
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function pickWeighted(r, items, weight) {
  const ws = items.map(weight); const total = ws.reduce((x, y) => x + y, 0);
  if (!items.length || total <= 0) return null;
  let x = r() * total; for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
}
function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fileFor = option => option ? path.join(OUT_DIR, `deal-${option}.json`) : STATE;
function load(option) { try { return JSON.parse(fs.readFileSync(fileFor(option), 'utf8')); } catch { return null; } }
function save(s) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
  if (s.option) fs.writeFileSync(fileFor(s.option), JSON.stringify(s, null, 2));
}
// ctx = { have: [...normalised], strict: bool (true when --have was given), items: { role: n } }
// Old deal.json files stored `have` as a plain array; ctxOf() reads both.
function ctxOf(s) {
  if (s.ctx) return s.ctx;
  return { have: Array.isArray(s.have) ? s.have : [], strict: false, items: {} };
}
function available(id, ctx, role) {
  const c = COMPOSITIONS[id]; if (!c) return false;
  const have = ctx.have || [];
  const count = role ? ctx.items?.[role] : (c.kind === 'hero' ? ctx.items?.hero : undefined);
  if (c.needs.includes('product-ui') && !have.includes('product-ui')) return false;
  if (ctx.strict) {
    for (const n of c.needs) {
      if (n === 'items' && count != null) continue;      // the count decides below
      if (!have.includes(n)) return false;
    }
  }
  if (count != null && MIN_ITEMS[id] && count < MIN_ITEMS[id]) return false;
  return true;
}
function die(msg) { console.error(msg); process.exit(1); }

// ---------------------------------------------------------------- dealing
function dealHero(r, dir, ctx, exclude = []) {
  const pool = dir.heroes.filter(h => available(h, ctx) && !exclude.includes(h));
  const fallback = Object.keys(COMPOSITIONS).filter(k => COMPOSITIONS[k].kind === 'hero' && available(k, ctx) && !exclude.includes(k));
  return pickWeighted(r, pool.length ? pool : fallback, () => 1);
}
// avoid: Map role → Set of compositions other design options already use for that role.
function candidatesFor(role, dir, ctx, used, prev, next, avoid) {
  const base = (ROLES[role] || ANY_SECTION);
  const ok = id => available(id, ctx, role) && !used.has(id) && id !== prev && id !== next;
  const taken = avoid?.get(role);
  // Avoid only chooses among the role's OWN fitting compositions. When all of them are taken by other
  // options, share one rather than falling back to a general composition that fits the content worse.
  const preferFresh = list => {
    if (!taken || !list.length) return list;
    const fresh = list.filter(id => !taken.has(id));
    if (fresh.length) return fresh;
    candidatesFor.shared = (candidatesFor.shared || new Set()).add(role);
    return list;
  };
  let c = base.filter(ok);
  if (c.length) return preferFresh(c);
  if (role !== 'footer' && ROLES[role]) {
    c = ANY_SECTION.filter(ok);
    if (c.length) candidatesFor.fellBack = (candidatesFor.fellBack || new Set()).add(role);
  } else if (role !== 'footer') c = ANY_SECTION.filter(ok);
  return preferFresh(c);
}
function dealSections(r, dir, ctx, roles, fixed = {}, avoid) {
  const used = new Set(Object.values(fixed));
  const out = [];
  const warnings = [];
  // Lookahead: a composition that is the ONLY fitting one for a later role is reserved for it, so an
  // earlier role does not take it while it has other choices (e.g. three projects fit only s-sticky-pair).
  const onlyFit = roles.map(role => {
    if (fixed[role] || !ROLES[role]) return null;
    const own = ROLES[role].filter(id => available(id, ctx, role));
    return own.length === 1 ? own[0] : null;
  });
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    if (fixed[role]) { out.push({ role, id: fixed[role] }); continue; }
    const prev = out[i - 1]?.id;
    const next = fixed[roles[i + 1]];
    let c = candidatesFor(role, dir, ctx, used, prev, next, avoid);
    const reserved = new Set(onlyFit.slice(i + 1).filter(Boolean));
    if (onlyFit[i]) reserved.delete(onlyFit[i]);
    const unreserved = c.filter(id => !reserved.has(id));
    if (unreserved.length) c = unreserved;
    if (!c.length) {
      c = (ROLES[role] || ANY_SECTION).filter(id => available(id, ctx, role) && id !== prev && id !== next);
      if (c.length) warnings.push(`${role}: every fitting composition was already used; allowed a repeat (not adjacent).`);
    }
    if (!c.length) {
      c = (ROLES[role] || ANY_SECTION).filter(id => id !== prev && id !== next);
      warnings.push(`${role}: nothing fits what --have/--items say exists; dealt anyway — check the content or use --require.`);
    }
    const id = pickWeighted(r, c, x => (dir.prefer.includes(x) ? 3 : 1) * ((ROLES[role] || [])[0] === x ? 1.3 : 1));
    if (!id) die(`No composition can hold role "${role}".`);
    used.add(id); out.push({ role, id });
  }
  for (const role of candidatesFor.fellBack || []) warnings.push(`${role}: none of its usual compositions fits the content (--have/--items); dealt a general one.`);
  for (const role of candidatesFor.shared || []) warnings.push(`${role}: same composition as another option (nothing else fits the content).`);
  candidatesFor.fellBack = null;
  candidatesFor.shared = null;
  return { sections: out, warnings };
}

// ---------------------------------------------------------------- printing
function printDirection(d, i) {
  console.log(`\n${i != null ? `[${i + 1}] ` : ''}${d.name}  (id: ${d.id})`);
  console.log(`    idea     ${d.idea}`);
  console.log(`    type     ${d.type}`);
  console.log(`    palette  ${d.palette}`);
  console.log(`    radius   ${d.radius}   images: ${d.images}`);
}
function printSheet(s) {
  const d = DIRECTIONS.find(x => x.id === s.direction);
  console.log('='.repeat(72));
  console.log(`DIRECTION SHEET${s.option ? `   option ${s.option}` : ''}   seed ${s.seed}   brief: ${s.brief}`);
  console.log('='.repeat(72));
  printDirection(d);
  if (s.keep.length) console.log(`    keep     ${s.keep.join(', ')} from the reference sheet / brand (direction's values are ignored for these)`);
  const ctx = ctxOf(s);
  if (ctx.strict || Object.keys(ctx.items || {}).length) console.log(`    have     ${ctx.have.join(', ') || '—'}${Object.keys(ctx.items || {}).length ? `   items: ${Object.entries(ctx.items).map(([k, v]) => `${k}:${v}`).join(', ')}` : ''}${ctx.strict ? '' : '   (lenient: needs not enforced)'}`);
  const pin = s.pinned || {};
  console.log(`\nHero:  ${s.hero}${pin.hero ? '   [pinned by brief]' : ''}`);
  console.log('Sections (in order, recipes in references/compositions.md):');
  s.sections.forEach((x, i) => console.log(`  ${String(i + 1).padStart(2)}. ${x.role.padEnd(12)} → ${x.id}   needs: ${COMPOSITIONS[x.id].needs.join(', ') || '—'}${pin[x.role] ? '   [pinned by brief]' : ''}`));
  if (Object.keys(pin).length) { console.log('\nPinned (brief):'); Object.entries(pin).forEach(([k, v]) => console.log(`  - ${k}: ${v}`)); }
  if (s.redraws?.length) { console.log('\nRedraws:'); s.redraws.forEach(x => console.log(`  - ${x}`)); }
  if (s.warnings?.length) { console.log('\nWarnings:'); s.warnings.forEach(x => console.log(`  ! ${x}`)); }
  console.log('\nAdopt this sheet. Redraw only with a stated reason: --redraw section:<role> | hero');
}

// ---------------------------------------------------------------- main
const a = parseArgs(process.argv.slice(2));

if (a.help || a.h) { console.log(HELP); process.exit(0); }

if (a.list) {
  if (a.list === 'roles') console.log(Object.keys(ROLES).join('\n'));
  else if (a.list === 'have') console.log([...HAVE_VALUES, ...Object.keys(HAVE_ALIASES).map(k => `${k} (alias: ${HAVE_ALIASES[k].join(', ') || 'no effect'})`)].join('\n'));
  else if (a.list === 'directions') DIRECTIONS.forEach((d, i) => printDirection(d, i));
  else console.log(Object.entries(COMPOSITIONS).map(([k, v]) => `${k.padEnd(18)} ${v.kind.padEnd(8)} needs: ${v.needs.join(', ') || '—'}`).join('\n'));
  process.exit(0);
}

if (a.show) { const opt = a.show === true ? a.option : a.show; const s = load(opt); if (!s) die(`No deal yet${opt ? ` for option ${opt}` : ''}.`); printSheet(s); process.exit(0); }

if (a.alternatives) {
  const s = load(); const role = a.alternatives;
  const ctx = s ? ctxOf(s) : { have: [], strict: false, items: {} };
  const list = (ROLES[role] || ANY_SECTION).filter(id => available(id, ctx, role));
  console.log(`Compositions that can hold "${role}":`);
  list.forEach(id => console.log(`  ${id.padEnd(18)} needs: ${COMPOSITIONS[id].needs.join(', ') || '—'}`));
  console.log('Take one with --redraw section:' + role + '=<id>');
  process.exit(0);
}

if (a.redraw) {
  const s = load(a.option); if (!s) die(`Nothing to redraw${a.option ? ` for option ${a.option}` : ''}: deal first.`);
  const dir = DIRECTIONS.find(x => x.id === s.direction);
  const [what, forced] = String(a.redraw).split('=');
  const r = rng(hash(`${s.seed}:${a.redraw}:${(s.redraws || []).length}`));
  if (what === 'hero') {
    const old = s.hero;
    if (forced && !COMPOSITIONS[forced]) die(`Unknown hero ${forced}`);
    if (s.pinned?.hero && !forced) console.error(`Note: the hero was pinned by the brief (${s.pinned.hero}); redrawing it overrides the brief.`);
    s.hero = forced || dealHero(r, dir, ctxOf(s), [old]);
    s.redraws = [...(s.redraws || []), `hero: ${old} → ${s.hero}${a.reason ? ` (${a.reason})` : ''}`];
  } else if (what.startsWith('section:')) {
    const role = what.slice(8);
    const idx = s.sections.findIndex(x => x.role === role);
    if (idx < 0) die(`No section with role ${role}`);
    const old = s.sections[idx].id;
    if (s.pinned?.[role] && !forced) console.error(`Note: ${role} was pinned by the brief (${s.pinned[role]}); redrawing it overrides the brief.`);
    let id = forced;
    if (id) {
      if (!COMPOSITIONS[id]) die(`Unknown composition ${id}`);
      if (s.sections[idx - 1]?.id === id || s.sections[idx + 1]?.id === id) die(`${id} would sit next to the same composition.`);
    } else {
      const used = new Set(s.sections.map(x => x.id));
      const c = candidatesFor(role, dir, ctxOf(s), used, s.sections[idx - 1]?.id, s.sections[idx + 1]?.id);
      id = pickWeighted(r, c, x => dir.prefer.includes(x) ? 3 : 1);
      if (!id) die(`No unused composition left for ${role}; use --alternatives ${role}.`);
    }
    s.sections[idx].id = id;
    s.redraws = [...(s.redraws || []), `${role}: ${old} → ${id}${a.reason ? ` (${a.reason})` : ''}`];
  } else die('Use --redraw hero[=id] or --redraw section:<role>[=id]');
  save(s); printSheet(s); process.exit(0);
}

const brief = a.brief; if (!brief) die('Pass --brief "<one line about the subject>".');
const seed = a.seed ? Number(a.seed) : hash(brief);
const list = v => (v && v !== true ? String(v).split(',').map(x => x.trim()).filter(Boolean) : []);
const { have, unknown: unknownHave } = normaliseHave(list(a.have));
if (unknownHave.length) console.error(`Note: unknown --have values ignored: ${unknownHave.join(', ')} (see --list have)`);
const items = {};
for (const pair of list(a.items)) { const [k, n] = pair.split(':'); if (k && !Number.isNaN(Number(n))) items[k] = Number(n); else console.error(`Note: bad --items entry "${pair}" (use role:count)`); }
const ctx = { have, strict: !!a.have, items };
const pinned = {};
for (const pair of list(a.require)) {
  const [slot, id] = pair.split(':');
  if (!slot || !id || !COMPOSITIONS[id]) die(`Bad --require "${pair}": use hero:<id> or <role>:<id> with a known composition (see --list compositions).`);
  if (slot === 'hero' && COMPOSITIONS[id].kind !== 'hero') die(`--require hero:${id}: ${id} is not a hero.`);
  if (slot !== 'hero' && COMPOSITIONS[id].kind === 'hero') die(`--require ${slot}:${id}: a hero cannot fill a section.`);
  pinned[slot] = id;
}
const keep = a.keep ? String(a.keep).split(',').map(x => x.trim()) : [];
let roles = a.sections ? String(a.sections).split(',').map(x => x.trim()).filter(Boolean) : ['intro', 'work', 'about', 'contact'];
if (roles.some(x => x === 'hero' || x === 'footer')) console.error('Note: hero and footer are dealt automatically; removed from --sections.');
roles = roles.filter(x => x !== 'hero' && x !== 'footer');
roles.push('footer');
for (const k of Object.keys(pinned)) if (k !== 'hero' && !roles.includes(k)) die(`--require ${k}:… names a role that is not in --sections.`);
const unknown = roles.filter(x => !ROLES[x]);
if (unknown.length) console.error(`Note: unknown roles (${unknown.join(', ')}) will be dealt from any section composition.`);
const r = rng(seed);

if (a.options) {
  const n = Math.max(1, Math.min(DIRECTIONS.length, Number(a.options) || 3));
  const opts = shuffle(r, DIRECTIONS).slice(0, n);
  console.log(`${n} directions for: ${brief}   (seed ${seed})`);
  opts.forEach((d, i) => printDirection(d, i));
  console.log(`\nChoose the one that can carry something only this client has, then run again with --direction <id>.`);
  process.exit(0);
}

const fixed = Object.fromEntries(Object.entries(pinned).filter(([k]) => k !== 'hero'));
for (let i = 1; i < roles.length; i++) if (fixed[roles[i]] && fixed[roles[i]] === fixed[roles[i - 1]]) die(`Pinned ${roles[i - 1]} and ${roles[i]} share ${fixed[roles[i]]}; neighbours cannot repeat.`);

// compositions other options already use (from --avoid files, and from earlier options in this run)
const avoid = new Map();
const avoidHeroes = new Set();
function remember(st) {
  if (st.hero && !st.pinned?.hero) avoidHeroes.add(st.hero);
  for (const x of st.sections || []) {
    if (st.pinned?.[x.role]) continue;
    if (!avoid.has(x.role)) avoid.set(x.role, new Set());
    avoid.get(x.role).add(x.id);
  }
}
for (const f of list(a.avoid)) { try { remember(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { die(`--avoid: cannot read ${f}`); } }

function dealOne(dir, seedN, option) {
  const rr = rng(seedN);
  const hero = pinned.hero || dealHero(rr, dir, ctx, [...Object.values(pinned), ...avoidHeroes]);
  const { sections, warnings } = dealSections(rr, dir, ctx, roles, fixed, avoid);
  if (!pinned.hero && avoidHeroes.has(hero)) warnings.push(`hero: same as another option (no other hero fits).`);
  const st = { brief, seed: seedN, option: option || null, direction: dir.id, ctx, have, keep, pinned, hero, sections, warnings, redraws: [], dealtAt: new Date().toISOString() };
  save(st);
  remember(st);
  return st;
}

if (a['options-deal']) {
  const n = Math.max(2, Math.min(DIRECTIONS.length, Number(a['options-deal']) || 2));
  const named = list(a.directions).map(id => DIRECTIONS.find(d => d.id === id) || die(`Unknown direction ${id}`));
  const dirs = named.length >= n ? named.slice(0, n) : [...named, ...shuffle(r, DIRECTIONS.filter(d => !named.includes(d)))].slice(0, n);
  const letters = 'ABCDEFGH';
  const done = [];
  for (let i = 0; i < n; i++) done.push(dealOne(dirs[i], seed + i * 7919, letters[i]));
  for (const st of done) printSheet(st);
  console.log(`\nSaved ${done.map(st => `deal-${st.option}.json`).join(', ')} in .figma-taste/. Options differ in:`);
  for (const role of ['hero', ...roles]) {
    const ids = done.map(st => role === 'hero' ? st.hero : st.sections.find(x => x.role === role)?.id);
    const same = ids.every(x => x === ids[0]);
    console.log(`  ${role.padEnd(12)} ${ids.map((x, i) => `${letters[i]}: ${x}`).join('   ')}${same ? (pinned[role] ? '   (pinned)' : '   (same: content allows nothing else)') : ''}`);
  }
  process.exit(0);
}

const dir = a.direction ? DIRECTIONS.find(x => x.id === a.direction) : pickWeighted(r, DIRECTIONS, () => 1);
if (!dir) die(`Unknown direction ${a.direction}. See --list directions.`);
// keep the original single-deal randomness: same seed → same deal as before
const state = dealOne(dir, seed, a.option && a.option !== true ? String(a.option) : null);
printSheet(state);
