#!/usr/bin/env node
// figma-taste: Unsplash search, placement into Figma upload URLs, and credits.
//
//   node unsplash.mjs search "<query>" [--orientation landscape|portrait|squarish] [--per 12] [--color <c>] [--page 1]
//   node unsplash.mjs place --plan .figma-taste/plan.json [--dry]
//   node unsplash.mjs place --intake --plan .figma-taste/plan.json [--intake-frame <id>]
//        for slots inside component instances (upload_assets only accepts plain ids like 12:34):
//        upload to plain intake rectangles, then paste the printed use_figma snippet that copies each
//        imageHash to its target (instance sublayers allowed) and removes the intake frame.
//   node unsplash.mjs credits [--md]
//   node unsplash.mjs info <photo id or url>
//   node unsplash.mjs preview <url|id> [<url|id> ...] [--out .figma-taste/previews] [--w 480] [--timeout 20]
//        small JPEGs for looking at candidates (works without a key; never downloads the full file)
//
// UNSPLASH_ACCESS_KEY (free at https://unsplash.com/developers) enables search, photographer
// credits and download tracking. Without it, `place` still works with photo ids or photo page URLs
// through Unsplash's public download redirect.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('.figma-taste');
const CREDITS = path.join(DIR, 'credits.json');
const LAST = path.join(DIR, 'unsplash-last.json');
const KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const API = 'https://api.unsplash.com';
const MAX_EDGE = 2400;
const MAX_BYTES = 10 * 1024 * 1024;

function args(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) a[t.slice(2)] = true; else { a[t.slice(2)] = n; i++; } }
    else a._.push(t);
  }
  return a;
}
const die = m => { console.error(m); process.exit(1); };
const ensureDir = () => fs.mkdirSync(DIR, { recursive: true });
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

async function api(pathname, params = {}) {
  if (!KEY) throw new Error('UNSPLASH_ACCESS_KEY is not set.');
  const u = new URL(API + pathname);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${KEY}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error(`Unsplash API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Accepts: bare id, https://unsplash.com/photos/<slug>-<id>, https://unsplash.com/photos/<id>,
// https://images.unsplash.com/photo-... (used as-is).
const CDN_ID = /^(?:photo-)?(\d{10,14}-[0-9a-f]{8,14})$/;   // e.g. 1508450859948-4e04fabaa4ea (not the page/API id)
function parsePhoto(ref) {
  const s = String(ref).trim();
  if (/^https?:\/\/images\.unsplash\.com\//.test(s)) return { directUrl: s };
  const cdn = s.match(CDN_ID);
  if (cdn) return { directUrl: `https://images.unsplash.com/photo-${cdn[1]}`, cdnOnly: true };
  const m = s.match(/unsplash\.com\/(?:[a-z-]+\/)?photos\/([^/?#]+)/i);
  if (m) {
    const slug = m[1];
    // Unsplash ids are 11 characters from [A-Za-z0-9_-] and may themselves contain '-' (e.g. Pk-KuizxQv8),
    // so take the last 11 characters of the slug instead of splitting on the last hyphen.
    const id = /^[A-Za-z0-9_-]{11}$/.test(slug) ? slug : slug.slice(-11);
    return { id, page: `https://unsplash.com/photos/${slug}` };
  }
  if (/^[A-Za-z0-9_-]{8,14}$/.test(s)) return { id: s, page: `https://unsplash.com/photos/${s}` };
  throw new Error(`Cannot read an Unsplash photo from "${s}"`);
}

function sized(url, w, h) {
  const u = new URL(url);
  const scale = Math.min(1, MAX_EDGE / Math.max(w || MAX_EDGE, h || 1));
  const W = Math.round((w || MAX_EDGE) * scale);
  const H = h ? Math.round(h * scale) : null;
  u.searchParams.set('w', String(W));
  if (H) { u.searchParams.set('h', String(H)); u.searchParams.set('fit', 'crop'); u.searchParams.set('crop', 'entropy'); }
  u.searchParams.set('fm', 'jpg');
  u.searchParams.set('q', '80');
  u.searchParams.delete('force');
  return u.toString();
}

async function resolve(ref) {
  const p = parsePhoto(ref);
  if (p.directUrl) return { base: p.directUrl, credit: { source: p.directUrl, tracking: 'not sent (CDN id only; the page/API id is unknown)' } };
  if (KEY) {
    const ph = await api(`/photos/${p.id}`);
    return {
      base: ph.urls.raw,
      track: ph.links.download_location,
      credit: { id: ph.id, photographer: ph.user?.name, profile: ph.user?.links?.html, page: ph.links?.html, description: ph.alt_description || ph.description || '', tracking: 'pending' },
    };
  }
  // Public download redirect: unsplash.com/photos/<id>/download → images.unsplash.com/photo-...
  const res = await fetch(`https://unsplash.com/photos/${p.id}/download`, { redirect: 'manual' });
  const loc = res.headers.get('location');
  if (!loc) throw new Error(`No redirect for photo ${p.id} (status ${res.status}). Check the id, or set UNSPLASH_ACCESS_KEY.`);
  return { base: new URL(loc, 'https://unsplash.com').toString(), credit: { id: p.id, page: p.page, tracking: 'not sent (no UNSPLASH_ACCESS_KEY)' } };
}

async function cmdSearch(a) {
  const q = a._.slice(1).join(' ');
  if (!q) die('search needs a query.');
  if (!KEY) {
    const q2 = encodeURIComponent(q.trim().replace(/\s+/g, '-'));
    console.log(`No UNSPLASH_ACCESS_KEY, so the API search is unavailable (the public napi endpoint redirects).
Fallback that worked in testing:
  1. WebFetch https://unsplash.com/s/photos/${q2}${a.orientation ? `?orientation=${a.orientation}` : ''}
     and read the photo page links (https://unsplash.com/photos/<slug>-<id>) from the result.
  2. Look at each candidate before choosing (WebFetch the photo page or its preview).
  3. Put the chosen page URLs in plan.json → "photo". place resolves them without a key.
Credits will record the page link; tracking is recorded as "not sent".
A free key (https://unsplash.com/developers) gives search, photographer names and download tracking.`);
    return;
  }
  const data = await api('/search/photos', {
    query: q, per_page: a.per || 12, page: a.page || 1,
    orientation: a.orientation, color: a.color, content_filter: 'high', order_by: a.order || 'relevant',
  });
  const rows = data.results.map(p => ({
    id: p.id, w: p.width, h: p.height, ratio: (p.width / p.height).toFixed(2), color: p.color,
    description: (p.alt_description || p.description || '').slice(0, 90),
    photographer: p.user?.name, page: p.links?.html, preview: `${p.urls.raw}&w=480&q=60&fm=jpg`,
  }));
  ensureDir(); fs.writeFileSync(LAST, JSON.stringify({ query: q, results: rows }, null, 2));
  console.log(`${data.total} results for "${q}" (showing ${rows.length}); saved to ${path.relative(process.cwd(), LAST)}\n`);
  for (const r of rows) {
    console.log(`${r.id}  ${r.w}×${r.h} (${r.ratio})  ${r.color}  ${r.photographer}`);
    console.log(`   ${r.description}`);
    console.log(`   preview ${r.preview}\n`);
  }
  console.log('Look at the previews before choosing. Pass chosen ids in plan.json → "photo".');
}

async function cmdPlace(a) {
  const planPath = a.plan || path.join(DIR, 'plan.json');
  const plan = readJSON(planPath, null);
  if (!Array.isArray(plan) || !plan.length) die(`Plan not found or empty: ${planPath}`);
  const credits = readJSON(CREDITS, []);
  const results = [];
  for (const item of plan) {
    const label = item.slot || item.nodeId || '?';
    try {
      if (!item.uploadUrl) throw new Error('missing uploadUrl (call the Figma upload_assets tool first)');
      if (!item.photo) throw new Error('missing photo');
      const r = await resolve(item.photo);
      const url = sized(r.base, Number(item.w) || 0, Number(item.h) || 0);
      if (a.dry) { results.push({ slot: label, ok: true, dry: true, url }); console.log(`DRY ${label} ← ${url}`); continue; }
      const img = await fetch(url);
      if (!img.ok) throw new Error(`download ${img.status}`);
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error(`image is ${(buf.length / 1048576).toFixed(1)}MB, over the 10MB upload limit; lower w/h`);
      const type = img.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
      const up = await fetch(item.uploadUrl, { method: 'POST', headers: { 'Content-Type': type }, body: buf });
      const text = await up.text();
      if (!up.ok) throw new Error(`upload ${up.status}: ${text.slice(0, 200)}`);
      let tracking = r.credit.tracking || 'not sent';
      if (r.track && KEY) {
        try { const t = await fetch(r.track, { headers: { Authorization: `Client-ID ${KEY}` } }); tracking = t.ok ? 'sent' : `failed (${t.status})`; }
        catch (e) { tracking = `failed (${e.message || e})`; }
      }
      const credit = { slot: label, nodeId: item.nodeId || null, target: item.target || null, ...r.credit, tracking, placedAt: new Date().toISOString() };
      const i = credits.findIndex(c => c.slot === label);
      if (i >= 0) credits[i] = credit; else credits.push(credit);
      results.push({ slot: label, ok: true, bytes: buf.length });
      console.log(`OK  ${label} ← ${r.credit.id || r.credit.source} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      results.push({ slot: label, ok: false, error: String(e.message || e) });
      console.log(`ERR ${label}: ${e.message || e}`);
    }
  }
  ensureDir(); fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
  const bad = results.filter(r => !r.ok);
  if (a.intake) printIntake(plan, results, a['intake-frame']);
  console.log(`\n${results.length - bad.length}/${results.length} placed. Credits: ${path.relative(process.cwd(), CREDITS)}`);
  if (bad.length) {
    console.log('Upload URLs are single-use: request fresh ones from upload_assets for the failed slots only.');
    process.exitCode = 1;
  }
}

// Intake mode: each plan item has nodeId (a plain intake rectangle that received the upload) and
// target (the real slot, which may be an instance sublayer such as I4591:50;4588:22).
function printIntake(plan, results, intakeFrame) {
  const okSlots = new Set(results.filter(r => r.ok && !r.dry).map(r => r.slot));
  // target may be one id or an array of ids (one upload filling several slots, e.g. two design options)
  const pairs = plan.filter(i => okSlots.has(i.slot || i.nodeId || '?') && i.nodeId && i.target)
    .flatMap(i => (Array.isArray(i.target) ? i.target : [i.target]).map(t => [i.nodeId, t, i.filters || null]));
  const missing = plan.filter(i => !i.target || !i.nodeId).map(i => i.slot || i.nodeId);
  if (missing.length) console.log(`\nIntake: these plan items lack nodeId (intake) or target and were skipped: ${missing.join(', ')}`);
  if (!pairs.length) { console.log('\nIntake: nothing to transfer.'); return; }
  const snippet = `// figma-taste intake transfer: copy each uploaded imageHash to its target, then remove the intake frame.
const pairs = ${JSON.stringify(pairs)};
const INTAKE_FRAME_ID = ${intakeFrame ? JSON.stringify(String(intakeFrame)) : 'null'};
const results = [];
for (const [from, to, filters] of pairs) {
  const a = await figma.getNodeByIdAsync(from);
  const b = await figma.getNodeByIdAsync(to);
  const img = a && Array.isArray(a.fills) ? a.fills.find(p => p.type === 'IMAGE') : null;
  if (!img || !b) { results.push({ from, to, ok: false, why: !img ? 'no image on intake yet' : 'target not found' }); continue; }
  const keep = Array.isArray(b.fills) ? b.fills.find(p => p.type === 'IMAGE') : null;
  // keep the slot's scale mode and grade (image filters); a plan item's "filters" sets a new grade
  const paint = { type: 'IMAGE', imageHash: img.imageHash, scaleMode: keep?.scaleMode || 'FILL' };
  const grade = filters || keep?.filters;
  if (grade) paint.filters = grade;
  b.fills = [paint];
  results.push({ from, to, ok: true });
}
let removed = false;
if (INTAKE_FRAME_ID && results.every(r => r.ok)) { const f = await figma.getNodeByIdAsync(INTAKE_FRAME_ID); if (f) { f.remove(); removed = true; } }
return { results, intakeRemoved: removed, mutatedNodeIds: results.filter(r => r.ok).map(r => r.to) };
`;
  const out = path.join(DIR, 'intake-transfer.figma.js');
  fs.writeFileSync(out, snippet);
  console.log(`\nIntake: paste ${path.relative(process.cwd(), out)} into a use_figma call to copy ${new Set(pairs.map(p => p[0])).size} upload(s) onto ${pairs.length} target(s).${intakeFrame ? '' : ' Pass --intake-frame <id> to have it remove the intake frame too.'}`);
}

function cmdCredits(a) {
  const credits = readJSON(CREDITS, []);
  if (!credits.length) die('No credits recorded yet.');
  const names = [...new Set(credits.map(c => c.photographer).filter(Boolean))];
  console.log(`Footer line: Photographs: ${names.length ? names.join(', ') : 'various photographers'} via Unsplash\n`);
  for (const c of credits) {
    const who = c.photographer ? `${c.photographer}${c.profile ? ` (${c.profile})` : ''}` : 'photographer: see page';
    const tr = c.tracking ? ` (tracking: ${c.tracking})` : '';
    console.log(a.md ? `- **${c.slot}**: ${who}, [${c.page || c.source}](${c.page || c.source})${tr}` : `${c.slot}: ${who} — ${c.page || c.source}${tr}`);
  }
}

async function cmdPreview(a) {
  const refs = a._.slice(1);
  if (!refs.length) die('preview needs one or more photo urls or ids.');
  const outDir = path.resolve(a.out || path.join(DIR, 'previews'));
  fs.mkdirSync(outDir, { recursive: true });
  const w = Number(a.w) || 480;
  const timeout = (Number(a.timeout) || 20) * 1000;
  let ok = 0;
  for (const ref of refs) {                       // one by one, each with its own timeout
    const label = String(ref).split('/').pop();
    try {
      const r = await resolve(ref);               // keyless: follows only the redirect, not the full file
      const u = new URL(r.base);
      u.searchParams.set('w', String(w)); u.searchParams.set('q', '60'); u.searchParams.set('fm', 'jpg');
      u.searchParams.delete('force'); u.searchParams.delete('h'); u.searchParams.delete('fit');
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
      const res = await fetch(u, { signal: ctl.signal }); clearTimeout(t);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const name = `${(r.credit.id || label).replace(/[^A-Za-z0-9_-]/g, '_')}.jpg`;
      fs.writeFileSync(path.join(outDir, name), buf);
      ok++;
      console.log(`OK  ${path.relative(process.cwd(), path.join(outDir, name))}  (${(buf.length / 1024).toFixed(0)} KB)  ← ${ref}`);
    } catch (e) {
      console.log(`ERR ${ref}: ${e.name === 'AbortError' ? `timed out after ${timeout / 1000}s` : e.message || e}`);
    }
  }
  console.log(`\n${ok}/${refs.length} previews saved. Read them (image viewer or the Read tool) before choosing.`);
  if (ok < refs.length) process.exitCode = 1;
}

async function cmdInfo(a) {
  const ref = a._[1]; if (!ref) die('info needs a photo id or url.');
  const r = await resolve(ref);
  console.log(JSON.stringify({ imageBase: r.base, ...r.credit }, null, 2));
}

const a = args(process.argv.slice(2));
const cmd = a._[0];
const run = { search: cmdSearch, place: cmdPlace, credits: cmdCredits, info: cmdInfo, preview: cmdPreview }[cmd];
if (!run) die('Commands: search "<query>" | preview <url|id>… [--out dir] | place --plan <file> [--dry] [--intake --intake-frame <id>] | credits [--md] | info <id|url>');
Promise.resolve(run(a)).catch(e => die(`Error: ${e.message || e}`));
