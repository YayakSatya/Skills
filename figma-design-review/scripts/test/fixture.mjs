// A 1440 landing page with typical hand-made slips, used by the inspect and compare tests.
// Grid: 12 columns, stretch, margin 80, gutter 24 → column 84.67, starts every 108.67 from 80.
import { node, T, solid, image, style, variable, place } from './mock.mjs';

export const H2 = style('Heading/H2');
export const H4 = style('Heading/H4');
export const ACCENT = variable('color/accent');

export function landing(id = '1:1') {
  const ink = '#333333';
  const hero = node('FRAME', { name: 'Hero', x: 0, y: 0, width: 1440, height: 800 }, [
    node('RECTANGLE', { name: 'image/hero', x: 0, y: 0, width: 1440, height: 800, fills: [image('hero')] }),
    T('Rumah yang tumbuh bersama keluarga', { name: 'Hero/Title', x: 80, y: 300, width: 900, height: 192, fontSize: 64, fills: [solid('#FFFFFF')] }),
    node('INSTANCE', { name: 'Button', x: 80, y: 520, width: 180, height: 56, fills: [solid('#C2410C', { boundVariables: { color: { id: ACCENT } } })] }),
  ]);
  const card = (i, extra = []) => node('FRAME', {
    name: 'Card', x: i * (411.33 + 23), y: 0, width: 411.33, height: 360, layoutMode: 'VERTICAL',
    paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, itemSpacing: 8,
    fills: [solid('#FFFFFF')], strokes: [solid('#E5E5E5')], cornerRadius: i === 2 ? 13 : 12,
  }, [
    T(`Keunggulan ${i + 1}`, { name: 'Card/Title', x: 24, y: 24, width: 363, height: 30, fontSize: 20, textStyleId: H4, fills: [solid(ink)] }),
    T('Penjelasan singkat tentang keunggulan ini dalam dua kalimat.', { name: 'Card/Body', x: 24, y: 62, width: 363, height: 48,
      fontSize: i === 1 ? 15 : 16, fills: [solid(i === 2 ? '#343434' : ink)] }),
    ...extra,
  ]);
  const features = node('FRAME', { name: 'Features', x: 0, y: 800, width: 1440, height: 700, layoutMode: 'VERTICAL',
    paddingLeft: 80, paddingRight: 80, paddingTop: 96, itemSpacing: 24, fills: [solid('#FFFFFF')] }, [
    T('Kenapa memilih kami', { name: 'Features/Title', x: 80, y: 96, width: 600, height: 60, fontSize: 40, textStyleId: H2, fills: [solid(ink)] }),
    T('Paragraf pengantar yang sangat panjang dan membentang hampir selebar halaman sehingga sulit dibaca dengan nyaman oleh pengunjung.',
      { name: 'Features/Lede', x: 83, y: 180, width: 1280, height: 48, fontSize: 16, fills: [solid(ink)] }),
    node('FRAME', { name: 'Features/Cards', x: 80, y: 260, width: 1280, height: 360, layoutMode: 'HORIZONTAL', itemSpacing: 23 }, [
      card(0), card(1),
      card(2, [T('Berlaku untuk proyek baru', { name: 'Card/Caption', x: 24, y: 118, width: 363, height: 21, fontSize: 14, fills: [solid('#BBBBBB')] })]),
    ]),
  ]);
  const gallery = node('FRAME', { name: 'Gallery', x: 0, y: 1500, width: 1440, height: 600, fills: [solid('#FFFFFF')] }, [
    node('RECTANGLE', { name: 'image/gallery', x: 150, y: 80, width: 600, height: 400, fills: [solid('#EEEEEE')] }),
    node('FRAME', { name: 'Quote', x: 800, y: 100, width: 400, height: 100, clipsContent: true }, [
      T('Kutipan pelanggan yang lebih panjang dari kotaknya sehingga terpotong di bawah.', { name: 'Quote/Text', x: 0, y: 0, width: 400, height: 200, fontSize: 24, fills: [solid(ink)] }),
    ]),
  ]);
  const footer = node('FRAME', { name: 'Footer', x: 0, y: 2100, width: 1440, height: 300, fills: [solid('#111111')] }, [
    T('PT Contoh Rumah · Jakarta', { name: 'Footer/Address', x: 80, y: 80, width: 400, height: 24, fontSize: 16, fills: [solid('#FFFFFF')] }),
    T('Kontak', { name: 'Footer/Link', x: 80, y: 120, width: 100, height: 24, fontSize: 16, fills: [solid('#FFFFFF')] }),
  ]);
  const root = node('FRAME', { id, name: 'Landing/Desktop', x: 0, y: 0, width: 1440, height: 2400, layoutMode: 'VERTICAL',
    fills: [solid('#FFFFFF')], layoutGrids: [{ pattern: 'COLUMNS', alignment: 'STRETCH', count: 12, gutterSize: 24, offset: 80, visible: true }] },
    [hero, features, gallery, footer]);
  place(root);
  return root;
}

// Shaped like a real run (run 1 of this skill): an empty frame stacked over the page, the sections
// inside a same-named wrapper, sections that share the name "sec", spacing scaled ×1.33 from 1440,
// and text over photographs under a translucent shade.
export function scaledPage(id = 'R:2') {
  const shade = (a, h = '#0D0E13') => node('FRAME', { name: 'hero-shade', x: 0, y: 0, width: 1920, height: 1200, fills: [solid(h, { opacity: a })] });
  const hero = node('FRAME', { name: 'hero', x: 0, y: 0, width: 1920, height: 1200, fills: [solid('#0D0E13')] }, [
    node('RECTANGLE', { name: 'Rectangle', x: 0, y: 0, width: 1920, height: 1200, fills: [image('city')] }),
    shade(0.5),
    T('Membangun ruang yang bekerja.', { name: 'hero/title', x: 64, y: 333, width: 1600, height: 342, fontSize: 171, fills: [solid('#FFFFFF')] }),
    T('Kontraktor gedung dan interior komersial di Surabaya sejak 2009.', { name: 'hero/lede', x: 64, y: 928, width: 700, height: 54, fontSize: 18, fills: [solid('#FFFFFF')] }),
  ]);
  const cta = node('FRAME', { name: 'cta', x: 0, y: 3200, width: 1920, height: 1013 }, [
    node('RECTANGLE', { name: 'Rectangle', x: 0, y: 0, width: 1920, height: 1013, fills: [image('site')] }),
    shade(0.9, '#000000'),
    T('Ceritakan proyek Anda.', { name: 'cta/lede', x: 64, y: 300, width: 700, height: 27, fontSize: 18, fills: [solid('#333333')] }),
  ]);
  // spacing at 1920, scaled from 10, 14, 20, 22, 32, 48, 160 at 1440
  const sec = (y, gaps) => node('FRAME', { name: 'sec', x: 0, y, width: 1920, height: 1000, layoutMode: 'VERTICAL',
    paddingTop: 213, paddingBottom: 213, paddingLeft: 64, paddingRight: 64, itemSpacing: gaps[0], fills: [solid('#F2EDE4')] }, [
    node('FRAME', { name: 'row', x: 64, y: 213, width: 1792, height: 200, layoutMode: 'HORIZONTAL', itemSpacing: gaps[1] }, [
      T('Empat layanan', { name: 'row/title', x: 0, y: 0, width: 900, height: 96, fontSize: 80, fills: [solid('#16140F')] }),
      node('FRAME', { name: 'row/meta', x: 940, y: 0, width: 400, height: 100, layoutMode: 'VERTICAL', itemSpacing: 13, paddingTop: 19, paddingBottom: 29 }, []),
    ]),
  ]);
  const stat = (x, num, w, unit) => node('FRAME', { name: 'stat-num', x, y: 0, width: 573, height: 171, layoutMode: 'HORIZONTAL', itemSpacing: 13 }, [
    node('FRAME', { name: 'num', x: 0, y: 0, width: w, height: 171 }, [T(num, { name: num, x: 0, y: -13, width: num === '420rb' ? 448 : 393, height: 171, fontSize: 171, fills: [solid('#16140F')] })]),
    ...(unit ? [node('FRAME', { name: 'unit', x: w + 13, y: 0, width: 50, height: 75 }, [T(unit, { name: unit, x: 0, y: 24, width: 55, height: 53, fontSize: 43, fills: [solid('#16140F')] })])] : []),
  ]);
  const stats = node('FRAME', { name: 'stats', x: 0, y: 3000, width: 1920, height: 200, layoutMode: 'HORIZONTAL', paddingLeft: 64, itemSpacing: 32, fills: [solid('#F2EDE4')] }, [
    stat(64, '2009', 346), stat(669, '420rb', 404, 'm²'),
  ]);
  const nav = node('FRAME', { name: 'nav', x: 0, y: 4213, width: 1920, height: 200, layoutMode: 'HORIZONTAL', paddingLeft: 64, itemSpacing: 40, fills: [solid('#0D0E13')] },
    ['Beranda', 'Tentang', 'Layanan', 'Portofolio', 'Berita', 'Karier', 'Kontak'].map((w, i) => T(w, { name: w, x: 64 + i * 140, y: 80, width: 100, height: 24, fontSize: 16, fills: [solid('#F2EDE4')] })));
  const wrapper = node('FRAME', { name: 'Arunika Beranda', x: 0, y: 0, width: 1920, height: 4413 },
    [hero, sec(1200, [43, 27]), sec(2200, [64, 27]), stats, cta, nav]);
  const empty = node('FRAME', { name: 'Arunika Beranda', x: 0, y: 0, width: 1920, height: 4100 });
  const root = node('FRAME', { id, name: 'Slide 16:9 - 1', x: 0, y: 0, width: 1920, height: 4213, fills: [solid('#FFFFFF')] }, [empty, wrapper]);
  place(root);
  return root;
}
