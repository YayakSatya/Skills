// ===== figma-design-review selftest =====
// Run in a scratch file only. Builds the test page of scripts/test/fixture.mjs with real nodes (a 1440
// landing page with planted slips) and a polished copy of it, then returns their ids. Then:
//   1. inspect.figma.js with ROOT_ID = rootId. Expect these and only these confirmed findings:
//      major: contrast Card/Caption, clipped Quote/Text, empty-image image/gallery
//      minor: near-colour Card/Body (#343434), near-spacing Features/Cards (23), near-radius Card (13),
//             near-size Card/Body (15px), measure Features/Lede, near-edge Features/Lede (83 vs 80),
//             off-grid image/gallery (150), off-grid Quote/Text (800)
//      check: text-on-image Hero/Title.  Sections: Hero keep, Features polish, Gallery look closer, Footer keep.
//   2. compare.figma.js with ORIGINAL_ID = rootId, COPY_ID = copyId, KEEP = ['Hero', 'Gallery', 'Footer'].
//      Expect verdict OK, four changes, all in Features (itemSpacing, fills, cornerRadius, x).
//   3. inspect.figma.js on copyId: the four fixed findings are gone, no new major.
// Delete the two frames, the Button component, the two text styles and the "Selftest" collection after.
const X0 = Math.max(0, ...figma.currentPage.children.map(n => n.x + n.width)) + 400;
await Promise.all([['Inter', 'Regular'], ['Inter', 'Semi Bold'], ['Inter', 'Bold']].map(([family, style]) => figma.loadFontAsync({ family, style })));
const rgb = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = h => [{ type: 'SOLID', color: rgb(h) }];
const ids = [];

// styles, a colour variable, a Button component
const textStyle = (name, size, style) => { const s = figma.createTextStyle(); s.name = name; s.fontName = { family: 'Inter', style }; s.fontSize = size; s.lineHeight = { unit: 'PERCENT', value: 150 }; return s; };
const H2 = textStyle('Selftest/Heading/H2', 40, 'Bold'), H4 = textStyle('Selftest/Heading/H4', 20, 'Semi Bold');
const coll = figma.variables.createVariableCollection('Selftest');
const accent = figma.variables.createVariable('color/accent', coll, 'COLOR');
accent.setValueForMode(coll.modes[0].modeId, rgb('#C2410C'));
accent.scopes = ['FRAME_FILL', 'SHAPE_FILL'];
const btn = figma.createComponent(); btn.name = 'Button'; btn.resize(180, 56);
btn.fills = [figma.variables.setBoundVariableForPaint(solid('#C2410C')[0], 'color', accent)];
btn.x = X0; btn.y = -200; ids.push(btn.id);

const frame = (name, x, y, w, h, p = {}) => { const f = figma.createFrame(); f.name = name; f.resize(w, h); f.x = x; f.y = y; f.fills = p.fill ? solid(p.fill) : []; f.clipsContent = !!p.clip; return f; };
const styled = [];   // text styles are applied after the build (setTextStyleIdAsync is async)
const text = (parent, name, chars, x, y, w, size, p = {}) => {
  const t = figma.createText(); t.name = name; parent.appendChild(t);
  t.fontName = { family: 'Inter', style: 'Regular' }; t.characters = chars; t.fontSize = size;
  t.lineHeight = { unit: 'PERCENT', value: 150 };
  if (p.style) styled.push([t, p.style]);
  t.textAutoResize = 'HEIGHT'; t.resize(w, t.height); t.x = x; t.y = y; t.fills = solid(p.fill || '#333333');
  return t;
};
const root = frame('Selftest/Landing', X0, 0, 1440, 2400, { fill: '#FFFFFF' });
root.layoutGrids = [{ pattern: 'COLUMNS', alignment: 'STRETCH', count: 12, gutterSize: 24, offset: 80, visible: true, color: { r: 1, g: 0, b: 0, a: 0.1 } }];

const hero = frame('Hero', 0, 0, 1440, 800); root.appendChild(hero);
const img = figma.createRectangle(); img.name = 'image/hero'; hero.appendChild(img); img.resize(1440, 800);
const png = figma.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
img.fills = [{ type: 'IMAGE', imageHash: figma.createImage(png).hash, scaleMode: 'FILL' }];
text(hero, 'Hero/Title', 'Rumah yang tumbuh bersama keluarga', 80, 300, 900, 64, { fill: '#FFFFFF' });
const b = btn.createInstance(); hero.appendChild(b); b.x = 80; b.y = 520;

const features = frame('Features', 0, 800, 1440, 700, { fill: '#FFFFFF' }); root.appendChild(features);
text(features, 'Features/Title', 'Kenapa memilih kami', 80, 96, 600, 40, { style: H2 });
text(features, 'Features/Lede', 'Paragraf pengantar yang sangat panjang dan membentang hampir selebar halaman sehingga sulit dibaca dengan nyaman oleh pengunjung yang datang.', 83, 180, 1280, 16);
const row = figma.createAutoLayout('HORIZONTAL', { name: 'Features/Cards', itemSpacing: 23 });
features.appendChild(row); row.x = 80; row.y = 260;
for (let i = 0; i < 3; i++) {
  const c = figma.createAutoLayout('VERTICAL', { name: 'Card', itemSpacing: 8, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 });
  row.appendChild(c);
  c.resize(411.33, 360); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED';
  c.fills = solid('#FFFFFF'); c.strokes = solid('#E5E5E5'); c.cornerRadius = i === 2 ? 13 : 12;
  text(c, 'Card/Title', `Keunggulan ${i + 1}`, 0, 0, 363, 20, { style: H4 });
  text(c, 'Card/Body', 'Penjelasan singkat tentang keunggulan ini dalam dua kalimat yang jelas.', 0, 0, 363, i === 1 ? 15 : 16, { fill: i === 2 ? '#343434' : '#333333' });
  if (i === 2) text(c, 'Card/Caption', 'Berlaku untuk proyek baru', 0, 0, 363, 14, { fill: '#BBBBBB' });
}

const gallery = frame('Gallery', 0, 1500, 1440, 600, { fill: '#FFFFFF' }); root.appendChild(gallery);
const gi = figma.createRectangle(); gi.name = 'image/gallery'; gallery.appendChild(gi); gi.resize(600, 400); gi.x = 150; gi.y = 80; gi.fills = solid('#EEEEEE');
const quote = frame('Quote', 800, 100, 400, 100, { clip: true }); gallery.appendChild(quote);
text(quote, 'Quote/Text', 'Kutipan pelanggan yang lebih panjang dari kotaknya sehingga terpotong di bawah dan tidak terbaca utuh.', 0, 0, 400, 24);

const footer = frame('Footer', 0, 2100, 1440, 300, { fill: '#111111' }); root.appendChild(footer);
text(footer, 'Footer/Address', 'PT Contoh Rumah · Jakarta', 80, 80, 400, 16, { fill: '#FFFFFF' });
text(footer, 'Footer/Link', 'Kontak', 80, 120, 100, 16, { fill: '#FFFFFF' });

for (const [t, s] of styled) await t.setTextStyleIdAsync(s.id);

// the polished copy: the four Polish fixes, nothing else
const copy = root.clone(); copy.name = 'Selftest/Landing · polish'; copy.x = X0 + 1640; copy.y = 0;
const q = n => copy.findOne(m => m.name === n);
q('Features/Cards').itemSpacing = 24;
q('Card/Caption').fills = solid('#666666');
copy.findAll(m => m.name === 'Card')[2].cornerRadius = 12;
q('Features/Lede').x = 80;

ids.push(root.id, copy.id);
return { rootId: root.id, copyId: copy.id, buttonId: btn.id, textStyles: [H2.id, H4.id], collectionId: coll.id, createdNodeIds: ids };
