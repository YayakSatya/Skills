// ===== figma-taste manifest =====
// Read-only. Collects this brand's design system into one JSON object that the next run reads first.
// Write the returned `manifest` to .figma-taste/design-system.json (step 5, and at the end of every run).
// Step 1 of a later run: load that file, verify its ids with this script, extend; never build a second set.

const BRAND = 'Brand';                         // same as foundations CONFIG.BRAND; null = no prefix
const BOARD_IDS = {                            // where things live (page or section ids)
  foundations: null,                           // e.g. '2402:10'
  components: null,                            // e.g. '2402:11' — components are read from here
  pages: [],                                   // page wrappers, e.g. ['2402:3']
};
const DECISIONS = {                            // what was decided; fill in from the run
  direction: null, seed: null,                 // per option when there are several: { A: {...}, B: {...} }
  fonts: null,                                 // e.g. { display: 'Switzer Medium', text: 'Switzer Regular' }
  palette: null,                               // e.g. { ground: 'paper', ink: 'ink', accent: 'ochre' }
  radius: null,                                // e.g. 'square' | 'full buttons' | 'image 24'
  chosenOption: null,                          // e.g. 'B' once the user has picked
  mobileGridConfirmed: false,
  tablet: false,
  contentMode: 'dummy-filled',
};

const P = BRAND ? `${BRAND} · ` : '';
const SP = BRAND ? `${BRAND}/` : '';
const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter(c => !BRAND || c.name.startsWith(P));
const vars = await figma.variables.getLocalVariablesAsync();
const collections = {};
for (const c of cols) {
  const key = c.name.slice(P.length);
  collections[key] = {
    id: c.id, name: c.name,
    modes: Object.fromEntries(c.modes.map(m => [m.name, m.modeId])),
    defaultMode: c.modes.find(m => m.modeId === c.defaultModeId)?.name,
    variables: vars.filter(v => v.variableCollectionId === c.id).map(v => v.name).sort(),
  };
}
const pick = (list) => list.filter(s => !BRAND || s.name.startsWith(SP)).map(s => ({ name: s.name, id: s.id, key: s.key }));
const textStyles = pick(await figma.getLocalTextStylesAsync());
const effectStyles = pick(await figma.getLocalEffectStylesAsync());
const gridStyles = pick(await figma.getLocalGridStylesAsync());

// components: sets with variant axes, and TEXT property keys read back AFTER combineAsVariants
const components = [];
const missing = [];
if (BOARD_IDS.components) {
  const board = await figma.getNodeByIdAsync(BOARD_IDS.components);
  if (!board) missing.push(`components board ${BOARD_IDS.components}`);
  else {
    let p = board; while (p.parent && p.type !== 'PAGE') p = p.parent;
    if (p.type === 'PAGE' && p.id !== figma.currentPage.id) await figma.setCurrentPageAsync(p);
    const found = board.type === 'PAGE' ? board.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
      : [board, ...board.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })].filter(n => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT');
    for (const n of found) {
      if (n.type === 'COMPONENT' && n.parent?.type === 'COMPONENT_SET') continue;     // variants are listed under their set
      const defs = n.componentPropertyDefinitions || {};
      components.push({
        name: n.name, id: n.id, key: n.key, type: n.type,
        variants: Object.fromEntries(Object.entries(defs).filter(([, d]) => d.type === 'VARIANT').map(([k, d]) => [k, d.variantOptions])),
        textProps: Object.fromEntries(Object.entries(defs).filter(([, d]) => d.type === 'TEXT').map(([k]) => [k.split('#')[0], k])),
        boolProps: Object.entries(defs).filter(([, d]) => d.type === 'BOOLEAN').map(([k]) => k),
        swapProps: Object.entries(defs).filter(([, d]) => d.type === 'INSTANCE_SWAP').map(([k]) => k),
        description: n.description || '',
      });
    }
  }
}
for (const id of [BOARD_IDS.foundations, ...BOARD_IDS.pages].filter(Boolean)) {
  if (!(await figma.getNodeByIdAsync(id))) missing.push(id);
}

const manifest = {
  schema: 'figma-taste/design-system@1',
  fileKey: figma.fileKey || null,
  brand: BRAND,
  updatedAt: new Date().toISOString(),
  boards: BOARD_IDS,
  collections,
  textStyles, effectStyles, gridStyles,
  components,
  decisions: DECISIONS,
};
return {
  verdict: missing.length ? 'CHECK' : 'OK',
  missing,
  summary: {
    collections: Object.entries(collections).map(([k, c]) => `${k} [${Object.keys(c.modes).join('/')}] ${c.variables.length}`),
    textStyles: textStyles.length, effectStyles: effectStyles.length, gridStyles: gridStyles.length, components: components.length,
  },
  manifest,
};
// ===== end figma-taste manifest =====
