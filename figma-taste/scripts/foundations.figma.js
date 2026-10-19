// ===== figma-taste foundations =====
// Builds (or extends) the whole site design system in one use_figma call, per
// references/design-system.md §"Target architecture": five collections, 31 colour roles, the full
// type scale (18 text styles), system constants, span helpers, the overlay effect style and grid styles.
// Safe to re-run: collections, variables and styles are found by name and updated, never duplicated.
// Returns ids, counts, contrast checks and missing fonts. Write the result into the manifest
// (.figma-taste/design-system.json) with manifest.figma.js afterwards.
//
// Edit CONFIG only. Colours are base hexes; ramps are generated in OKLCH with the base kept exactly.

const CONFIG = {
  BRAND: 'Brand',                                   // collections "<BRAND> · theme", styles "<BRAND>/Heading/H1"; null = no prefix
  // Hues for primitive ramps. ink = darkest neutral, paper = ground neutral; add the accent and subject hue.
  RAMPS: { ink: '#16171A', paper: '#F3F0E9', accent: '#9C5B2E', subject: '#56655A',
           red: '#C2362F', green: '#2E7D4F', amber: '#9A6A12', blue: '#2B63B0' },
  // Theme modes. One 'Light' mode normally; 'Option A' / 'Option B' while comparing design options.
  // ground / ink / accent name ramps above; dark: true for a dark ground. radiusImage: per-option image corner.
  THEMES: {
    'Light': { ground: 'paper', ink: 'ink', accent: 'accent', dark: false, radiusImage: 0,
               display: 'Inter', text: 'Inter' },
  },
  // Style names per role. They stay constant across theme modes (only the family may change by mode),
  // so every family used must have these styles: the script checks listAvailableFontsAsync().
  STYLES: { display: 'Medium', displayStrong: 'Semi Bold', text: 'Regular', textStrong: 'Medium' },
  LAYOUT_MODES: ['Desktop', 'Mobile'],              // add 'Tablet' when the PRD asks for it
  SPANS: [3, 4, 5, 6, 7, 8],                        // the span/N the layouts use (figma helpers collection)
  STEPS: [50, 100, 200, 300, 400, 600, 800, 900, 950],
};

// Per-breakpoint values. Desktop is the house standard (1920 · 12 · 60 · 30); Mobile is the confirmed or
// proposed house grid; Tablet (768 · 8) only when listed in LAYOUT_MODES.
const LAYOUT = {
  'page-width':          { Desktop: 1920, Tablet: 768, Mobile: 390 },   // used for spans only, not created
  'layout/margin':       { Desktop: 60,  Tablet: 40,  Mobile: 20,  scopes: ['GAP'] },
  'layout/gutter':       { Desktop: 30,  Tablet: 24,  Mobile: 16,  scopes: ['GAP'] },
  'grid/columns':        { Desktop: 12,  Tablet: 8,   Mobile: 4,   scopes: [] },
  'layout/section-pad':  { Desktop: 120, Tablet: 88,  Mobile: 48,  scopes: ['GAP'] },
  'layout/stack-xs':     { Desktop: 8,   Tablet: 8,   Mobile: 6,   scopes: ['GAP'] },
  'layout/stack-s':      { Desktop: 16,  Tablet: 14,  Mobile: 12,  scopes: ['GAP'] },
  'layout/stack-m':      { Desktop: 32,  Tablet: 28,  Mobile: 24,  scopes: ['GAP'] },
  'layout/stack-l':      { Desktop: 64,  Tablet: 52,  Mobile: 40,  scopes: ['GAP'] },
  'layout/stack-xl':     { Desktop: 140, Tablet: 104, Mobile: 64,  scopes: ['GAP'] },
  'layout/measure-text': { Desktop: 640, Tablet: 560, Mobile: 350, scopes: ['WIDTH_HEIGHT'] },
  'type/display':        { Desktop: 184, Tablet: 120, Mobile: 56,  scopes: ['FONT_SIZE'] },
  'type/h1':             { Desktop: 112, Tablet: 80,  Mobile: 40,  scopes: ['FONT_SIZE'] },
  'type/h2':             { Desktop: 56,  Tablet: 44,  Mobile: 30,  scopes: ['FONT_SIZE'] },
  'type/h3':             { Desktop: 36,  Tablet: 30,  Mobile: 24,  scopes: ['FONT_SIZE'] },
  'type/h4':             { Desktop: 28,  Tablet: 24,  Mobile: 20,  scopes: ['FONT_SIZE'] },
  'type/statement':      { Desktop: 36,  Tablet: 30,  Mobile: 22,  scopes: ['FONT_SIZE'] },
  'type/body-l':         { Desktop: 24,  Tablet: 21,  Mobile: 18,  scopes: ['FONT_SIZE'] },
  'type/body':           { Desktop: 20,  Tablet: 18,  Mobile: 16,  scopes: ['FONT_SIZE'] },
  'type/label':          { Desktop: 16,  Tablet: 15,  Mobile: 14,  scopes: ['FONT_SIZE'] },
  'type/small':          { Desktop: 15,  Tablet: 14,  Mobile: 13,  scopes: ['FONT_SIZE'] },
  'type/caption':        { Desktop: 13,  Tablet: 12,  Mobile: 12,  scopes: ['FONT_SIZE'] },
  'size/input-h':        { Desktop: 56,  Tablet: 54,  Mobile: 52,  scopes: ['WIDTH_HEIGHT'] },
};

// Constants developers need as tokens (system collection, one mode).
const SYSTEM = {
  'radius/s': [4, ['CORNER_RADIUS']], 'radius/m': [8, ['CORNER_RADIUS']], 'radius/full': [999, ['CORNER_RADIUS']],
  'border/width-s': [1, ['STROKE_FLOAT']], 'border/width-m': [2, ['STROKE_FLOAT']],
  'opacity/scrim': [50, ['OPACITY']], 'opacity/disabled': [40, ['OPACITY']],       // OPACITY variables hold 0–100
  'size/icon-s': [16, ['WIDTH_HEIGHT']], 'size/icon-m': [20, ['WIDTH_HEIGHT']], 'size/icon-l': [24, ['WIDTH_HEIGHT']],
  'size/tap-min': [44, ['WIDTH_HEIGHT']],
  'font/weight-light': [300, ['FONT_WEIGHT']], 'font/weight-regular': [400, ['FONT_WEIGHT']], 'font/weight-medium': [500, ['FONT_WEIGHT']],
  'breakpoint/sm': [360, []], 'breakpoint/md': [768, []], 'breakpoint/lg': [1280, []], 'breakpoint/xl': [1920, []],
  'layout/container-max': ['@breakpoint/xl', []],                                   // alias: the container stops at xl
  'motion/duration-fast': [150, []], 'motion/duration-base': [250, []],
};

// Semantic roles as [ground|ink|accent|light|dark|red|green|amber step] per light and dark theme.
// G = ground hue, K = ink hue, A = accent, L = the theme's light hue, D = its dark hue.
const ROLES = {
  //                     scopes                                           light        dark
  'bg/canvas':          [['FRAME_FILL', 'SHAPE_FILL'],                    'G50',       'G950'],
  'bg/surface':         [['FRAME_FILL', 'SHAPE_FILL'],                    'G100',      'G900'],
  'bg/surface-raised':  [['FRAME_FILL', 'SHAPE_FILL'],                    'G200',      'G800'],
  'bg/inverse':         [['FRAME_FILL', 'SHAPE_FILL'],                    'K950',      'K50'],
  'bg/field':           [['FRAME_FILL'],                                  'A100',      'A900'],
  'bg/input':           [['FRAME_FILL', 'SHAPE_FILL'],                    'L50',       'G900'],
  'bg/disabled':        [['FRAME_FILL', 'SHAPE_FILL'],                    'K100',      'G800'],
  'bg/overlay':         [['FRAME_FILL'],                                  'alpha/D-64', 'alpha/D-64'],
  'fg/default':         [['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],     'K950',      'K50'],
  'fg/muted':           [['TEXT_FILL'],                                   'K600',      'K300'],
  'fg/inverse':         [['TEXT_FILL'],                                   'G50',       'G950'],
  'fg/inverse-muted':   [['TEXT_FILL'],                                   'G300',      'G600'],
  'fg/on-image':        [['TEXT_FILL'],                                   'L50',       'L50'],
  'fg/disabled':        [['TEXT_FILL'],                                   'K400',      'K600'],
  'fg/link-hover':      [['TEXT_FILL'],                                   'A800',      'A300'],
  'accent/default':     [['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'],       'A600',      'A400'],
  'accent/hover':       [['FRAME_FILL', 'SHAPE_FILL'],                    'A800',      'A300'],
  'accent/pressed':     [['FRAME_FILL', 'SHAPE_FILL'],                    'A900',      'A200'],
  'accent/on':          [['TEXT_FILL'],                                   'L50',       'D950'],
  'line/field':         [['STROKE_COLOR'],                                'K600',      'G400'],   // ≥ 3:1 against bg/input
  'line/field-focus':   [['STROKE_COLOR'],                                'A600',      'A400'],
  'line/field-error':   [['STROKE_COLOR'],                                'red600',    'red400'],
  'state/error':        [['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],     'red600',    'red300'],
  'state/success':      [['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],     'green600',  'green300'],
  'state/warning':      [['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],     'amber800',  'amber300'],   // amber needs a darker step for 4.5:1
  'state/error-surface':   [['FRAME_FILL', 'SHAPE_FILL'],                 'red50',     'red950'],
  'state/success-surface': [['FRAME_FILL', 'SHAPE_FILL'],                 'green50',   'green950'],
  'state/warning-surface': [['FRAME_FILL', 'SHAPE_FILL'],                 'amber50',   'amber950'],
  'focus/ring':         [['STROKE_COLOR', 'EFFECT_COLOR'],                'A600',      'A400'],
  'image/placeholder':  [['FRAME_FILL', 'SHAPE_FILL'],                    'G200',      'G800'],
  'scrim/base':         [['FRAME_FILL', 'SHAPE_FILL'],                    'D950',      'D950'],
};

// Text styles: [name, size token, family role, style role, line height %, letter spacing %, extra]
const TEXT_STYLES = [
  ['Display',        'type/display',   'display', 'display',       92, -4],
  ['Heading/H1',     'type/h1',        'display', 'display',       95, -3],
  ['Heading/H2',     'type/h2',        'display', 'display',      100, -2],
  ['Heading/H3',     'type/h3',        'display', 'display',      110, -1.5],
  ['Heading/H4',     'type/h4',        'display', 'displayStrong', 115, -1],
  ['Heading/H5',     'type/body',      'text',    'textStrong',   140, 0],   // no new size: CMS H5 maps here
  ['Heading/H6',     'type/small',     'text',    'textStrong',   140, 0],   // no new size: CMS H6 maps here
  ['Statement',      'type/statement', 'display', 'display',      125, -1],
  ['Quote',          'type/statement', 'display', 'display',      125, -1],
  ['Body/Large',     'type/body-l',    'text',    'text',         145, 0],
  ['Body/Default',   'type/body',      'text',    'text',         155, 0],
  ['Body/Strong',    'type/body',      'text',    'textStrong',   155, 0],
  ['Body/Link',      'type/body',      'text',    'text',         155, 0, 'UNDERLINE'],
  ['Label/Default',  'type/label',     'text',    'text',         120, 0],
  ['Label/Strong',   'type/label',     'text',    'textStrong',   120, 0],
  ['Small/Default',  'type/small',     'text',    'text',         145, 0],
  ['Small/Strong',   'type/small',     'text',    'textStrong',   145, 0],
  ['Caption',        'type/caption',   'text',    'text',         140, 0],
];

// ------------------------------------------------------------------ colour maths (OKLCH ramps)
const hexToRgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const toLin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
function toLab([r, g, b]) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function fromLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(toGam);
}
const L_TARGET = { 50: 0.975, 100: 0.945, 200: 0.885, 300: 0.805, 400: 0.715, 500: 0.63, 600: 0.545, 700: 0.465, 800: 0.385, 900: 0.30, 950: 0.225 };
const C_FACTOR = { 50: 0.18, 100: 0.3, 200: 0.5, 300: 0.72, 400: 0.9, 500: 1, 600: 1, 700: 0.95, 800: 0.85, 900: 0.7, 950: 0.55 };
function ramp(hex, steps) {
  const base = hexToRgb(hex);
  const [L0, a0, b0] = toLab(base);
  const C0 = Math.hypot(a0, b0), h = Math.atan2(b0, a0);
  const nearest = steps.reduce((best, s) => Math.abs(L_TARGET[s] - L0) < Math.abs(L_TARGET[best] - L0) ? s : best, steps[0]);
  const out = {};
  for (const s of steps) {
    if (s === nearest) { out[s] = base; continue; }                 // the brand colour itself stays exact
    let c = C0 * C_FACTOR[s], rgb;
    for (let k = 0; k < 40; k++) {                                    // gamut clip by lowering chroma
      rgb = fromLab([L_TARGET[s], c * Math.cos(h), c * Math.sin(h)]);
      if (rgb.every(x => x >= -0.0005 && x <= 1.0005)) break;
      c *= 0.9;
    }
    out[s] = rgb.map(x => Math.min(1, Math.max(0, x)));
  }
  return { steps: out, baseStep: nearest };
}
const lum = ([r, g, b]) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
const contrast = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };

// ------------------------------------------------------------------ helpers (find or create)
const P = CONFIG.BRAND ? `${CONFIG.BRAND} · ` : '';
const SP = CONFIG.BRAND ? `${CONFIG.BRAND}/` : '';
const report = { created: [], updated: [], contrast: [], contrastFails: [], missingFonts: [], notes: [] };
const allCols = await figma.variables.getLocalVariableCollectionsAsync();
const allVars = await figma.variables.getLocalVariablesAsync();

async function collection(name, modeNames) {
  let c = allCols.find(x => x.name === name);
  if (!c) { c = figma.variables.createVariableCollection(name); report.created.push(`collection ${name}`); c.renameMode(c.modes[0].modeId, modeNames[0]); }
  for (const m of modeNames) if (!c.modes.some(x => x.name === m)) {
    // first run on a fresh collection: rename the default mode; afterwards: add
    const unused = c.modes.find(x => /^Mode \d+$|^Value$/.test(x.name) && !modeNames.includes(x.name));
    if (unused) c.renameMode(unused.modeId, m); else c.addMode(m);
  }
  const ids = Object.fromEntries(c.modes.map(m => [m.name, m.modeId]));
  return { c, ids };
}
function variable(col, name, type, scopes, web) {
  let v = allVars.find(x => x.variableCollectionId === col.id && x.name === name);
  if (!v) { v = figma.variables.createVariable(name, col, type); allVars.push(v); report.created.push(name); }
  v.scopes = scopes;
  if (web) v.setVariableCodeSyntax('WEB', `var(--${name.replaceAll('/', '-')})`);
  return v;
}
const rgbObj = ([r, g, b], a = 1) => ({ r, g, b, a });

// ------------------------------------------------------------------ 1. primitives
const prim = await collection(`${P}primitives`, ['Value']);
prim.c.hiddenFromPublishing = true;
const primVar = {};
const primRgb = {};
for (const [hue, hex] of Object.entries(CONFIG.RAMPS)) {
  const { steps } = ramp(hex, CONFIG.STEPS);
  for (const s of CONFIG.STEPS) {
    const v = variable(prim.c, `${hue}/${s}`, 'COLOR', [], false);
    v.setValueForMode(prim.ids.Value, rgbObj(steps[s]));
    primVar[`${hue}${s}`] = v; primRgb[`${hue}${s}`] = steps[s];
  }
}
// alpha colours for overlays and shadows, one per dark hue actually used
const themeEntries = Object.entries(CONFIG.THEMES);
const darkHues = new Set(themeEntries.map(([, t]) => t.dark ? t.ground : t.ink));
for (const hue of darkHues) {
  for (const a of [24, 64]) {
    const v = variable(prim.c, `alpha/${hue}-${a}`, 'COLOR', [], false);
    v.setValueForMode(prim.ids.Value, rgbObj(primRgb[`${hue}950`], a / 100));
    primVar[`alpha/${hue}-${a}`] = v;
  }
}

// ------------------------------------------------------------------ 2. theme (roles, fonts, image radius)
const themeModes = themeEntries.map(([m]) => m);
const theme = await collection(`${P}theme`, themeModes);
const resolve = (spec, t) => {
  const L = t.dark ? t.ink : t.ground, D = t.dark ? t.ground : t.ink;
  if (spec.startsWith('alpha/')) return `alpha/${D}-${spec.split('-')[1]}`;
  const m = spec.match(/^([A-Za-z]+?)(\d+)$/);
  const map = { G: t.ground, K: t.ink, A: t.accent, L, D };
  const hue = map[m[1]] || m[1];
  return `${hue}${m[2]}`;
};
const roleRgb = {};
for (const [role, [scopes, light, dark]] of Object.entries(ROLES)) {
  const v = variable(theme.c, role, 'COLOR', scopes, true);
  for (const [mode, t] of themeEntries) {
    const key = resolve(t.dark ? dark : light, t);
    const target = primVar[key];
    if (!target) { report.notes.push(`${role} (${mode}): primitive ${key} missing`); continue; }
    v.setValueForMode(theme.ids[mode], figma.variables.createVariableAlias(target));
    if (!roleRgb[mode]) roleRgb[mode] = {};
    roleRgb[mode][role] = primRgb[key] || null;
  }
}
// fonts: variables only while families differ between theme modes
const fontVars = {};
for (const role of ['display', 'text']) {
  const fams = themeEntries.map(([, t]) => t[role]);
  if (new Set(fams).size > 1) {
    const v = variable(theme.c, `font/${role}`, 'STRING', ['FONT_FAMILY'], true);
    themeEntries.forEach(([mode, t]) => v.setValueForMode(theme.ids[mode], t[role]));
    fontVars[role] = v;
  }
}
// per-option image radius: only while it differs between modes; otherwise a system constant
const radii = themeEntries.map(([, t]) => t.radiusImage ?? 0);
let radiusImageVar = null;
if (new Set(radii).size > 1) {
  radiusImageVar = variable(theme.c, 'shape/image-radius', 'FLOAT', ['CORNER_RADIUS'], true);
  themeEntries.forEach(([mode, t]) => radiusImageVar.setValueForMode(theme.ids[mode], t.radiusImage ?? 0));
}

// contrast checks per theme mode
const pairs = [
  ['fg/default', 'bg/canvas', 7], ['fg/muted', 'bg/canvas', 4.5], ['fg/default', 'bg/surface', 4.5],
  ['fg/inverse', 'bg/inverse', 4.5], ['fg/inverse-muted', 'bg/inverse', 4.5], ['accent/on', 'accent/default', 4.5],
  ['accent/default', 'bg/canvas', 3], ['focus/ring', 'bg/canvas', 3], ['line/field', 'bg/input', 3], ['line/field-focus', 'bg/input', 3],
  ['state/error', 'bg/canvas', 4.5], ['state/success', 'bg/canvas', 4.5], ['state/warning', 'bg/canvas', 4.5],
  ['state/error', 'state/error-surface', 4.5], ['state/success', 'state/success-surface', 4.5], ['state/warning', 'state/warning-surface', 4.5],
  ['fg/link-hover', 'bg/canvas', 4.5],
];
for (const mode of themeModes) for (const [fg, bg, min] of pairs) {
  const a = roleRgb[mode]?.[fg], b = roleRgb[mode]?.[bg];
  if (!a || !b) continue;
  const r = +contrast(a, b).toFixed(2);
  const row = { mode, fg, bg, ratio: r, min };
  report.contrast.push(row);
  if (r < min) report.contrastFails.push(row);
}

// ------------------------------------------------------------------ 3. layout (per breakpoint)
const lay = await collection(`${P}layout`, CONFIG.LAYOUT_MODES);
const layVar = {};
for (const [name, vals] of Object.entries(LAYOUT)) {
  if (name === 'page-width') continue;
  const v = variable(lay.c, name, 'FLOAT', vals.scopes, true);
  for (const m of CONFIG.LAYOUT_MODES) v.setValueForMode(lay.ids[m], vals[m]);
  layVar[name] = v;
}

// ------------------------------------------------------------------ 4. system (constants)
const sys = await collection(`${P}system`, ['Value']);
const sysVar = {};
for (const [name, [value, scopes]] of Object.entries(SYSTEM)) {
  const v = variable(sys.c, name, 'FLOAT', scopes, true);
  // '@name' makes an alias to another system token (one source of truth instead of a duplicate)
  v.setValueForMode(sys.ids.Value, typeof value === 'string' && value.startsWith('@') ? figma.variables.createVariableAlias(sysVar[value.slice(1)]) : value);
  sysVar[name] = v;
}
if (!radiusImageVar) variable(sys.c, 'radius/image', 'FLOAT', ['CORNER_RADIUS'], true).setValueForMode(sys.ids.Value, radii[0]);

// ------------------------------------------------------------------ 5. figma helpers (spans, no code syntax)
const help = await collection(`${P}figma helpers`, CONFIG.LAYOUT_MODES);
help.c.hiddenFromPublishing = true;
for (const n of CONFIG.SPANS) {
  const v = variable(help.c, `span/${n}`, 'FLOAT', ['WIDTH_HEIGHT'], false);
  for (const m of CONFIG.LAYOUT_MODES) {
    const W = LAYOUT['page-width'][m], mar = LAYOUT['layout/margin'][m], gut = LAYOUT['layout/gutter'][m], cols = LAYOUT['grid/columns'][m];
    const content = W - 2 * mar;
    const col = (content - (cols - 1) * gut) / cols;
    // Desktop spans n of 12; Tablet maps n/12 onto its columns; Mobile is the full content width
    const k = m === 'Mobile' ? cols : Math.max(1, Math.min(cols, Math.round(n * cols / 12)));
    v.setValueForMode(help.ids[m], +(k * col + (k - 1) * gut).toFixed(2));
  }
}

// ------------------------------------------------------------------ 6. text styles (full scale)
const fonts = await figma.listAvailableFontsAsync();
const hasFont = (family, style) => fonts.some(f => f.fontName.family === family && f.fontName.style === style);
const families = { display: [...new Set(themeEntries.map(([, t]) => t.display))], text: [...new Set(themeEntries.map(([, t]) => t.text))] };
const styleOf = { display: 'display', displayStrong: 'display', text: 'text', textStrong: 'text' };
for (const [role, famRole] of Object.entries(styleOf)) for (const fam of families[famRole]) {
  if (!hasFont(fam, CONFIG.STYLES[role])) report.missingFonts.push(`${fam} ${CONFIG.STYLES[role]}`);
}
const existingText = await figma.getLocalTextStylesAsync();
const textStyleIds = {};
if (!report.missingFonts.length) {
  for (const [fam, st] of [...new Set(Object.entries(styleOf).flatMap(([role, fr]) => families[fr].map(f => `${f}|${CONFIG.STYLES[role]}`)))].map(x => x.split('|'))) {
    await figma.loadFontAsync({ family: fam, style: st });
  }
  const firstTheme = themeEntries[0][1];
  for (const [name, sizeTok, famRole, styleRole, lh, ls, deco] of TEXT_STYLES) {
    const full = `${SP}${name}`;
    let s = existingText.find(x => x.name === full);
    if (!s) { s = figma.createTextStyle(); s.name = full; report.created.push(`style ${full}`); } else report.updated.push(`style ${full}`);
    s.fontName = { family: firstTheme[famRole], style: CONFIG.STYLES[styleRole] };
    s.lineHeight = { unit: 'PERCENT', value: lh };          // percent: scales with the mode's size, never bound
    s.letterSpacing = { unit: 'PERCENT', value: ls };
    s.textDecoration = deco || 'NONE';
    s.setBoundVariable('fontSize', layVar[sizeTok]);
    if (fontVars[famRole]) s.setBoundVariable('fontFamily', fontVars[famRole]);
    textStyleIds[name] = s.id;
  }
} else report.notes.push('text styles not written: install or choose fonts that have every style in CONFIG.STYLES');

// ------------------------------------------------------------------ 7. effect style + grid styles
const darkHue = [...darkHues][0];
const effects = await figma.getLocalEffectStylesAsync();
let elev = effects.find(x => x.name === `${SP}Elevation/Overlay`);
if (!elev) { elev = figma.createEffectStyle(); elev.name = `${SP}Elevation/Overlay`; report.created.push('effect Elevation/Overlay'); }
let shadow = { type: 'DROP_SHADOW', color: rgbObj(primRgb[`${darkHue}950`], 0.24), offset: { x: 0, y: 16 }, radius: 48, spread: -8, visible: true, blendMode: 'NORMAL' };
shadow = figma.variables.setBoundVariableForEffect(shadow, 'color', primVar[`alpha/${darkHue}-24`]);
elev.effects = [shadow];

const grids = await figma.getLocalGridStylesAsync();
const gridIds = {};
for (const m of CONFIG.LAYOUT_MODES) {
  const name = `${SP}Grid/${m}`;
  let g = grids.find(x => x.name === name);
  if (!g) { g = figma.createGridStyle(); g.name = name; report.created.push(`grid ${name}`); }
  g.layoutGrids = [{ pattern: 'COLUMNS', alignment: 'STRETCH', count: LAYOUT['grid/columns'][m], gutterSize: LAYOUT['layout/gutter'][m], offset: LAYOUT['layout/margin'][m], visible: true, color: { r: 1, g: 0, b: 0, a: 0.1 } }];
  gridIds[m] = g.id;
}

// ------------------------------------------------------------------ result
const collections = {};
for (const [k, x] of Object.entries({ primitives: prim, theme, layout: lay, system: sys, helpers: help })) {
  collections[k] = { id: x.c.id, name: x.c.name, modes: x.ids, variables: x.c.variableIds.length };
}
return {
  verdict: report.contrastFails.length || report.missingFonts.length ? 'CHECK' : 'OK',
  collections,
  textStyles: textStyleIds,
  effectStyle: elev.id,
  gridStyles: gridIds,
  fontVariables: Object.keys(fontVars),
  contrastFails: report.contrastFails,
  missingFonts: report.missingFonts,
  notes: report.notes,
  created: report.created.length,
  contrast: report.contrast,
};
// ===== end figma-taste foundations =====
