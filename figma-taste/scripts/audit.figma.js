// ===== figma-taste audit =====
// Paste into a use_figma call. Put the page wrappers' node ids in ROOT_IDS (Desktop and Mobile in one
// call). Set MIN_IMAGES to 0 for app screens or a component sheet. SUMMARY = true returns only the
// verdict, short fails and key stats per root; false returns the full report.
const ROOT_IDS = ['ROOT_ID'];   // e.g. ['12:345', '12:900']
const MIN_IMAGES = 4;
const SUMMARY = false;

const results = [];
for (const rootId of ROOT_IDS) results.push(await auditRoot(rootId));
const verdict = results.every(r => r.verdict === 'PASS') ? 'PASS' : 'FAIL';
return { verdict, results };

async function auditRoot(ROOT_ID_VALUE) {
  const ROOT = await figma.getNodeByIdAsync(ROOT_ID_VALUE);
  if (!ROOT) return { root: ROOT_ID_VALUE, verdict: 'FAIL', error: `node ${ROOT_ID_VALUE} not found` };
  {
    let p = ROOT; while (p.parent && p.type !== 'PAGE') p = p.parent;
    if (p.type === 'PAGE' && p.id !== figma.currentPage.id) await figma.setCurrentPageAsync(p);
  }

  const fails = [], warns = [];
  const F = (rule, n, msg) => fails.push({ rule, id: n?.id, name: n?.name, msg });
  const W = (rule, n, msg) => warns.push({ rule, id: n?.id, name: n?.name, msg });

  const all = [ROOT, ...ROOT.findAll(() => true)];
  const stopId = ROOT.parent?.id;
  const inAncestor = (n, re) => { for (let p = n; p && p.id !== stopId; p = p.parent) if (re.test(p.name || '')) return true; return false; };
  const insideInstance = n => { for (let p = n.parent; p && p.id !== stopId; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };
  const isFree = n => inAncestor(n, /^free\//i);
  const isUI = n => inAncestor(n, /^ui\//i);
  const isCode = n => inAncestor(n, /^code\//i);
  const hasLayout = n => 'layoutMode' in n && n.layoutMode && n.layoutMode !== 'NONE';
  const visiblePaints = arr => (Array.isArray(arr) ? arr : []).filter(p => p.visible !== false);
  const hasImage = n => visiblePaints(n.fills).some(p => p.type === 'IMAGE');
  const defaultName = /^(Frame|Rectangle|Group|Ellipse|Vector|Text|Line|Polygon|Star|Auto layout|Union|Subtract|Component|Instance)( \d+)?$/;
  // Objects from findAll are not identical to those in parent.children inside instances: match by id.
  const nextSibling = n => {
    const par = n.parent; if (!par || !('children' in par)) return null;
    const idx = par.children.findIndex(c => c.id === n.id);
    return idx >= 0 ? par.children[idx + 1] || null : null;
  };
  const isDummy = n => / · dummy$/.test(n.name || '') || (Array.isArray(n.annotations) && n.annotations.some(a => (a.label || '').startsWith('Dummy')));

  // ---------- text metrics
  const texts = all.filter(n => n.type === 'TEXT');
  const families = new Map();
  const sizes = new Map();
  const textInfo = new Map();
  const styleCache = new Map();
  for (const t of texts) {
    let segs = [];
    try { segs = t.getStyledTextSegments(['fontName', 'fontSize', 'textCase', 'letterSpacing', 'lineHeight']); } catch { segs = []; }
    let maxSize = 0, mono = false, upper = false, tracked = false, lhPx = null;
    for (const s of segs) {
      families.set(s.fontName.family, (families.get(s.fontName.family) || 0) + 1);
      sizes.set(s.fontSize, (sizes.get(s.fontSize) || 0) + 1);
      if (s.fontSize > maxSize) {
        maxSize = s.fontSize;
        lhPx = s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value : s.lineHeight.unit === 'PERCENT' ? s.lineHeight.value * s.fontSize / 100 : s.fontSize * 1.2;
      }
      if (/mono|code|courier|consol/i.test(s.fontName.family)) mono = true;
      if (s.textCase === 'UPPER') upper = true;
      const ls = s.letterSpacing;
      if ((ls.unit === 'PERCENT' && ls.value > 2) || (ls.unit === 'PIXELS' && ls.value > 0.5)) tracked = true;
    }
    const chars = t.characters || '';
    if (!upper && /[A-Za-z]{3}/.test(chars) && chars === chars.toUpperCase()) upper = true;
    // style name, without a brand/option prefix ("Arunika/Heading/H1" → "Heading/H1")
    let styleName = null;
    const sid = t.textStyleId;
    if (sid && sid !== figma.mixed) {
      if (!styleCache.has(sid)) { const st = await figma.getStyleByIdAsync(sid); styleCache.set(sid, st ? st.name : null); }
      styleName = styleCache.get(sid);
    }
    const role = styleName ? (styleName.match(/(?:^|\/)(Display|Heading|Statement|Quote|Body|Label|Small|Caption)\b/) || [])[1] || null : null;
    textInfo.set(t.id, { maxSize, lhPx, mono, upper, tracked, chars, styleName, role });
  }
  const sizeOf = n => textInfo.get(n.id)?.maxSize || 0;

  // ---------- per-node checks
  let frames = 0, autoFrames = 0, loose = 0, instances = 0, realImages = 0, hidden = 0, dummyLayers = 0;
  const unboundFill = [], unboundSpace = [], unboundRadius = [], unstyledText = [], defaultNamed = [];
  for (const n of all) {
    if (n.visible === false) { hidden++; continue; }
    if (isDummy(n)) dummyLayers++;
    const inInst = insideInstance(n);
    if (n.type === 'INSTANCE') instances++;
    if (n.type === 'FRAME' || n.type === 'COMPONENT') {
      frames++;
      if (hasLayout(n)) autoFrames++;
      else if ('children' in n && n.children.length >= 2 && !isFree(n) && !inInst) { loose++; F('loose-frame', n, `${n.children.length} children placed absolutely; use auto layout or name it free/…`); }
      if ('children' in n && n.children.length === 1 && n.id !== ROOT.id && !inInst
          && visiblePaints(n.fills).length === 0 && visiblePaints(n.strokes).length === 0
          && (!n.effects || n.effects.length === 0)
          && ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].every(k => !n[k])
          && !/^(Section|Footer|Nav|image)\b/.test(n.name)) {
        W('useless-wrapper', n, 'one child, no fill, padding or effect; append the child to the parent, and if the wrapper only limited its width, bind the child\'s width to span/N instead');
      }
      if ('children' in n && n.children.length === 0 && visiblePaints(n.fills).length === 0 && !/^image\//.test(n.name)) W('empty-frame', n, 'empty frame');
    }
    if (n.type === 'GROUP' && !isFree(n) && !inInst) W('group', n, 'groups do not reflow; use an auto-layout frame');
    if (n.layoutPositioning === 'ABSOLUTE' && !/^(free\/|scrim)/i.test(n.name)) W('absolute-child', n, 'absolute child inside auto layout; name it free/… if intended');
    if (defaultName.test(n.name) && !inInst) defaultNamed.push(n);

    // tokens
    if (!inInst && !isUI(n)) {
      for (const p of visiblePaints(n.fills)) if (p.type === 'SOLID' && !p.boundVariables?.color) { unboundFill.push(n); break; }
      for (const p of visiblePaints(n.strokes)) if (p.type === 'SOLID' && !p.boundVariables?.color) { unboundFill.push(n); break; }
      if (hasLayout(n)) {
        const bv = n.boundVariables || {};
        const fields = ['itemSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];
        if (n.layoutWrap === 'WRAP') fields.push('counterAxisSpacing');
        if (n.primaryAxisAlignItems === 'SPACE_BETWEEN') fields.splice(fields.indexOf('itemSpacing'), 1);
        if (fields.some(f => typeof n[f] === 'number' && n[f] > 0 && !bv[f])) unboundSpace.push(n);
      }
      if ('cornerRadius' in n) {
        const bv = n.boundVariables || {};
        const r = n.cornerRadius;
        const any = r === figma.mixed ? ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].some(k => n[k] > 0) : r > 0;
        const bound = bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius;
        if (any && !bound) unboundRadius.push(n);
      }
    }
    if (n.type === 'TEXT' && !inInst) {
      const sid = n.textStyleId;
      if (!sid || sid === figma.mixed) unstyledText.push(n);
    }

    // effects and paints
    for (const p of visiblePaints(n.fills)) {
      if (p.type.startsWith('GRADIENT') && !/scrim/i.test(n.name)) F('gradient', n, 'gradient fill (only a neutral scrim named "scrim" is allowed)');
    }
    if (hasImage(n)) realImages++;
    for (const e of (n.effects || []).filter(e => e.visible !== false)) {
      if (e.type === 'BACKGROUND_BLUR') F('glass', n, 'background blur (glass)');
      else if ((e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && !/menu|dialog|popover|overlay|modal/i.test(n.name) && !isUI(n)) W('shadow', n, 'shadow on something at rest');
      else if (e.type === 'LAYER_BLUR') W('blur', n, 'layer blur');
    }
    const sw = typeof n.strokeWeight === 'number' ? n.strokeWeight : 1;
    if (!inInst && !isUI(n) && visiblePaints(n.strokes).length && sw <= 1.5 && n.type !== 'TEXT' && !/^field\//i.test(n.name) && !inAncestor(n, /^field\//i)) W('hairline', n, 'thin outline or divider; use space or a tone step');
    if (n.type === 'LINE' && !isUI(n)) W('hairline', n, 'divider line');

    // text rules
    if (n.type === 'TEXT') {
      const ti = textInfo.get(n.id);
      const chars = ti.chars.trim();
      if (ti.mono && !isCode(n)) F('monospace', n, 'monospace outside code');
      if (/^\(?0\d{1,2}\)?[.:/]?$/.test(chars) || /^(step|langkah|tahap)\s*\d+/i.test(chars)) F('index-number', n, `index numbering "${chars}"`);
      if (ti.maxSize <= 14 && ti.upper && ti.tracked) F('tiny-caps', n, 'tiny uppercase letter-spaced label');
      // © ® ™ are Extended_Pictographic but not emoji: strip them before testing.
      if (/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(chars.replace(/[©®™]/g, ''))) F('emoji', n, 'emoji in UI text');
      // Only headlines get the two-line rule: text styled Display or Heading, or unstyled text ≥ 48px.
    // Statement and Quote are paragraphs set large (≤ 25 words, about three lines) and are exempt.
    const isHeadline = ti.role ? (ti.role === 'Display' || ti.role === 'Heading') : ti.maxSize >= 48;
    if (isHeadline && ti.maxSize >= 28 && ti.lhPx) {
        const lines = Math.round(n.height / ti.lhPx);
        if (lines > 2) F('headline-lines', n, `headline runs ${lines} lines at ${ti.maxSize}px`);
      }
      // eyebrow: small short text directly above much larger text in a vertical stack
      const par = n.parent;
      if (par && 'children' in par && par.layoutMode === 'VERTICAL' && ti.maxSize <= 16 && chars.length > 0 && chars.length <= 40) {
        const next = nextSibling(n);
        if (next && next.type === 'TEXT' && sizeOf(next) >= Math.max(32, ti.maxSize * 1.8)) F('eyebrow', n, `label "${chars}" above a heading`);
      }
    }
    // pill badge above a heading
    if ((n.type === 'FRAME' || n.type === 'INSTANCE') && n.parent?.layoutMode === 'VERTICAL' && n.height <= 40) {
      const r = typeof n.cornerRadius === 'number' ? n.cornerRadius : 0;
      const smallText = 'children' in n && n.children.some(c => c.type === 'TEXT' && sizeOf(c) <= 14);
      const next = nextSibling(n);
      if (r >= n.height / 2 - 1 && smallText && next && next.type === 'TEXT' && sizeOf(next) >= 32) F('pill-badge', n, 'pill badge above a heading');
    }
    // empty image slot
    if (/^image\//i.test(n.name) && !hasImage(n)) F('empty-image-slot', n, 'image slot without a photograph');
  }

  // ---------- aggregated token rules
  const list = arr => arr.slice(0, 12).map(n => `${n.name} (${n.id})`).join(', ');
  if (unboundFill.length) F('unbound-colour', unboundFill[0], `${unboundFill.length} nodes with raw colours: ${list(unboundFill)}`);
  if (unboundSpace.length) F('unbound-spacing', unboundSpace[0], `${unboundSpace.length} auto-layout frames with raw gap/padding: ${list(unboundSpace)}`);
  if (unboundRadius.length) W('unbound-radius', unboundRadius[0], `${unboundRadius.length} nodes with raw radius: ${list(unboundRadius)}`);
  if (unstyledText.length) F('unstyled-text', unstyledText[0], `${unstyledText.length} text layers without a text style: ${list(unstyledText)}`);
  if (defaultNamed.length) W('default-names', defaultNamed[0], `${defaultNamed.length} default layer names: ${list(defaultNamed)}`);
  if (families.size > 2) F('type-families', ROOT, `${families.size} typefaces: ${[...families.keys()].join(', ')}`);
  if (sizes.size > 7) W('type-sizes', ROOT, `${sizes.size} font sizes: ${[...sizes.keys()].sort((a, b) => b - a).join(', ')}`);

  // ---------- composition
  function sig(n, depth = 0) {
    if (depth > 3) return '';
    const bucket = k => (k >= 4 ? '4+' : String(k));
    if (n.type === 'TEXT') return sizeOf(n) >= 28 ? 'H' : 't';
    if (n.type === 'RECTANGLE') return hasImage(n) || /^image\//.test(n.name) ? 'img' : 'r';
    if (n.type === 'INSTANCE') return `I:${n.mainComponent?.parent?.type === 'COMPONENT_SET' ? n.mainComponent.parent.name : n.mainComponent?.name}`;
    if (!('children' in n)) return n.type[0];
    const kids = n.children.filter(c => c.visible !== false && !/^scrim/i.test(c.name));
    const parts = [];
    for (const k of kids) { const s = sig(k, depth + 1); if (parts[parts.length - 1]?.s === s) parts[parts.length - 1].c++; else parts.push({ s, c: 1 }); }
    const mode = n.layoutMode || 'NONE';
    const g = mode === 'GRID' ? `${n.gridColumnCount}x${n.gridRowCount}` : '';
    return `${mode[0]}${n.layoutWrap === 'WRAP' ? 'w' : ''}${g}${hasImage(n) ? '*' : ''}(${parts.map(p => p.c > 1 ? `${p.s}x${bucket(p.c)}` : p.s).join(',')})`;
  }
  const sections = ROOT.children.filter(c => c.visible !== false && !/^nav/i.test(c.name));
  const sigs = sections.map(s => ({ s, sig: sig(s) }));
  for (let i = 1; i < sigs.length; i++) {
    if (sigs[i].sig === sigs[i - 1].sig) F('repeat-adjacent', sigs[i].s, `same composition as the section above (${sigs[i - 1].s.name})`);
  }
  const seen = new Map();
  for (const x of sigs) { if (seen.has(x.sig)) W('repeat', x.s, `same composition as ${seen.get(x.sig).name}`); else seen.set(x.sig, x.s); }

  // identical card rows / icon cards (a logo wall is uniform by design and exempt)
  const compName = k => k.type === 'INSTANCE' ? (k.mainComponent?.parent?.type === 'COMPONENT_SET' ? k.mainComponent.parent.name : k.mainComponent?.name) || '' : '';
  for (const n of all) {
    if (!hasLayout(n) || !('children' in n) || isUI(n) || insideInstance(n)) continue;
    if (/^(Clients|Logos)\//i.test(n.name)) continue;
    const kids = n.children.filter(c => c.visible !== false && (c.type === 'FRAME' || c.type === 'INSTANCE' || c.type === 'COMPONENT'));
    if (kids.length < 3 || kids.length !== n.children.filter(c => c.visible !== false).length) continue;
    if (kids.every(k => /^Logo\//i.test(compName(k)) || /^Logo\//i.test(k.name))) continue;
    const ks = kids.map(k => sig(k, 1));
    if (!ks.every(s => s === ks[0])) continue;
    const iconLike = kids.every(k => {
      const first = k.findOne?.(d => ['VECTOR', 'ELLIPSE', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON'].includes(d.type) || (/icon/i.test(d.name) && d.width <= 72));
      return first && first.width <= 72 && !k.findOne(d => hasImage(d));
    });
    const carded = kids.every(k => visiblePaints(k.fills).length || visiblePaints(k.strokes).length);
    if (iconLike) F('icon-cards', n, `${kids.length} identical cards with icons`);
    else if (carded && !kids.some(k => k.findOne?.(d => hasImage(d) || /^image\//.test(d.name)))) W('card-row', n, `${kids.length} identical filled cards; check the dealt composition`);
  }

  // title and section headings
  const first = sections.find(s => !/^nav/i.test(s.name));
  if (first && !first.findOne?.(d => d.type === 'TEXT' && sizeOf(d) >= 40)) F('no-title', first, 'first screen has no title set large');
  for (const s of sections) {
    if (/footer/i.test(s.name)) continue;
    if (s.type !== 'TEXT' && !s.findOne?.(d => d.type === 'TEXT' && sizeOf(d) >= 28)) W('untitled-section', s, 'section without a heading');
    if (hasLayout(s) && (s.paddingLeft || s.paddingRight) && s.paddingLeft !== s.paddingRight && !/free\//.test(s.name)) F('unequal-margins', s, `padding left ${s.paddingLeft} ≠ right ${s.paddingRight}`);
  }

  // ---------- off-grid: left (and right, for split children) edges must sit on column lines
  const grid = (ROOT.layoutGrids || []).find(g => g.pattern === 'COLUMNS' && g.visible !== false);
  let offGrid = 0;
  if (grid && grid.alignment === 'STRETCH') {
    const Wd = ROOT.width, cols = grid.count, gut = grid.gutterSize, mar = grid.offset;
    const col = (Wd - 2 * mar - (cols - 1) * gut) / cols;
    const starts = Array.from({ length: cols }, (_, k) => mar + k * (col + gut));
    const ends = starts.map(s => s + col);
    const near = (x, arr) => arr.some(a => Math.abs(a - x) <= 1);
    const rootX = ROOT.absoluteTransform[0][2];
    const fullBleed = n => n.width >= Wd - 1;
    const check = (n, checkRight) => {
      if (n.visible === false || isFree(n) || /^scrim/i.test(n.name) || n.layoutPositioning === 'ABSOLUTE' || fullBleed(n)) return;
      const x = n.absoluteTransform[0][2] - rootX;
      const r = x + n.width;
      if (!near(x, starts)) { offGrid++; W('off-grid', n, `left edge at ${x.toFixed(1)} is not on a column start`); }
      // a hug-width child (a button row, a link) ends where its content ends: check only its left edge
      else if (checkRight && n.layoutSizingHorizontal !== 'HUG' && !near(r, ends)) { offGrid++; W('off-grid', n, `right edge at ${r.toFixed(1)} is not on a column end`); }
    };
    for (const s of sections) {
      if (!('children' in s)) continue;
      for (const c of s.children) {
        check(c, false);
        // columns inside a split row: each must start on a column and end on one
        const isSplit = 'children' in c && (c.layoutMode === 'HORIZONTAL' || c.layoutMode === 'GRID')
          && c.layoutWrap !== 'WRAP' && c.primaryAxisAlignItems !== 'SPACE_BETWEEN'
          && c.children.filter(k => k.visible !== false && k.layoutPositioning !== 'ABSOLUTE').length >= 2;
        if (isSplit) for (const k of c.children) check(k, true);
      }
    }
  } else if (!grid) {
    W('no-layout-grid', ROOT, 'page wrapper has no column layout grid; add it with columnGrid()');
  }

  // imagery floor
  if (realImages < MIN_IMAGES) F('image-floor', ROOT, `${realImages} real photographs; at least ${MIN_IMAGES} needed`);

  const stats = {
    nodes: all.length, hidden, frames, autoLayoutFrames: autoFrames,
    autoLayoutRatio: frames ? +(autoFrames / frames).toFixed(2) : 1,
    looseFrames: loose, instances, texts: texts.length, unstyledTexts: unstyledText.length,
    realImages, dummyLayers, offGrid, height: Math.round(ROOT.height),
    sectionHeightSum: Math.round(sections.reduce((a, s) => a + s.height, 0)),
    typefaces: [...families.keys()], fontSizes: [...sizes.keys()].sort((a, b) => b - a),
  };
  const v = fails.length ? 'FAIL' : 'PASS';
  if (SUMMARY) {
    return {
      root: `${ROOT.name} (${ROOT.id})`, verdict: v, fails: fails.length, warns: warns.length,
      failList: fails.slice(0, 30).map(f => `${f.rule} · ${f.name}: ${String(f.msg).slice(0, 90)}`),
      stats: { realImages, dummyLayers, offGrid, autoLayoutRatio: stats.autoLayoutRatio, height: stats.height, typefaces: stats.typefaces },
    };
  }
  return {
    root: `${ROOT.name} (${ROOT.id})`, verdict: v,
    counts: { fails: fails.length, warns: warns.length },
    fails: fails.slice(0, 60), warns: warns.slice(0, 60),
    stats: { ...stats, sections: sigs.map(x => ({ name: x.s.name, height: Math.round(x.s.height), sig: x.sig.slice(0, 80) })) },
  };
}
// ===== end figma-taste audit =====
