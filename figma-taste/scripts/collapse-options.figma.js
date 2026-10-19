// ===== figma-taste collapse options =====
// After the user picks a design option (references/design-system.md §"After the option pick"):
//   1. the chosen option's values move into the collection's DEFAULT mode, which is renamed 'Light',
//      so later pages need no explicit theme mode (Figma's default mode is always the first one);
//   2. the other option keeps its values in its own mode, renamed '<name> (archived)', and the archived
//      frames listed in ARCHIVED_FRAMES are re-pointed to it so they still look the same;
//   3. explicit theme modes are cleared on the chosen frames (CHOSEN_FRAMES): they now use the default;
//   4. font variables become constants: the text styles get the chosen family directly and the
//      font/* variables are deleted (only with DELETE_FONT_VARS);
//   5. shape/image-radius becomes the system constant radius/image (only with MOVE_RADIUS);
//   6. the archived mode is deleted only with DELETE_OTHER (ask the user first).
// DRY_RUN = true (default) returns the plan without changing anything.

const DRY_RUN = true;
const BRAND = 'Brand';                     // same as foundations CONFIG.BRAND
const CHOSEN = 'Option B';                 // the mode name the user picked
const CHOSEN_FRAMES = [];                  // wrappers of the chosen option, e.g. ['2402:3', '2402:900']
const ARCHIVED_FRAMES = [];                // wrappers of the other option(s), e.g. ['2410:1']
const DELETE_FONT_VARS = true;
const MOVE_RADIUS = true;
const DELETE_OTHER = false;                // only after the user said so

const P = BRAND ? `${BRAND} · ` : '';
const plan = [];
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const theme = cols.find(c => c.name === `${P}theme`);
if (!theme) throw new Error(`no collection "${P}theme"`);
const chosen = theme.modes.find(m => m.name === CHOSEN);
if (!chosen) throw new Error(`no mode "${CHOSEN}" in ${theme.name}; modes: ${theme.modes.map(m => m.name).join(', ')}`);
const def = theme.modes.find(m => m.modeId === theme.defaultModeId);
const others = theme.modes.filter(m => m.modeId !== chosen.modeId);
const vars = (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === theme.id);

// 1–2. values into the default mode
const swap = chosen.modeId !== def.modeId;
if (swap) {
  plan.push(`swap values of "${def.name}" and "${CHOSEN}" for ${vars.length} variables`);
  plan.push(`rename "${def.name}" → "Light", "${CHOSEN}" → "${def.name} (archived)"`);
  plan.push(`re-point ${ARCHIVED_FRAMES.length} archived frame(s) to the archived mode`);
} else {
  plan.push(`rename "${def.name}" → "Light"`);
  for (const o of others) plan.push(`rename "${o.name}" → "${o.name} (archived)"`);
}
plan.push(`clear explicit theme mode on ${CHOSEN_FRAMES.length} chosen frame(s)`);

// 4. fonts
const fontVars = vars.filter(v => /^font\/(display|text)$/.test(v.name));
const styles = (await figma.getLocalTextStylesAsync()).filter(s => !BRAND || s.name.startsWith(`${BRAND}/`));
const boundFont = styles.filter(s => s.boundVariables?.fontFamily);
if (fontVars.length) plan.push(`${DELETE_FONT_VARS ? 'set' : 'would set'} the chosen family on ${boundFont.length} text styles and ${DELETE_FONT_VARS ? 'delete' : 'keep'} ${fontVars.map(v => v.name).join(', ')}`);
// 5. radius
const radiusVar = vars.find(v => v.name === 'shape/image-radius');
if (radiusVar) plan.push(`${MOVE_RADIUS ? 'copy' : 'would copy'} shape/image-radius (${radiusVar.valuesByMode[chosen.modeId]}) to system radius/image; delete shape/image-radius after its nodes are re-bound`);
// 6.
if (DELETE_OTHER) plan.push('delete the archived mode(s)');

if (DRY_RUN) return { dryRun: true, plan };

// ---------------------------------------------------------------- apply
const changed = [];
if (swap) {
  for (const v of vars) {
    const a = v.valuesByMode[def.modeId], b = v.valuesByMode[chosen.modeId];
    v.setValueForMode(def.modeId, b);
    v.setValueForMode(chosen.modeId, a);
  }
  theme.renameMode(chosen.modeId, `${def.name} (archived)`);
  theme.renameMode(def.modeId, 'Light');
  for (const id of ARCHIVED_FRAMES) {
    const f = await figma.getNodeByIdAsync(id);
    if (f && 'setExplicitVariableModeForCollection' in f) { f.setExplicitVariableModeForCollection(theme, chosen.modeId); changed.push(id); }
  }
} else {
  theme.renameMode(def.modeId, 'Light');
  for (const o of others) theme.renameMode(o.modeId, `${o.name} (archived)`);
}
for (const id of CHOSEN_FRAMES) {
  const f = await figma.getNodeByIdAsync(id);
  if (f && 'clearExplicitVariableModeForCollection' in f) { f.clearExplicitVariableModeForCollection(theme); changed.push(id); }
}

// fonts: the chosen family, now in the default mode, written straight into each style
if (fontVars.length && DELETE_FONT_VARS) {
  for (const s of boundFont) {
    const v = fontVars.find(x => x.id === s.boundVariables.fontFamily.id);
    const family = v ? v.valuesByMode[theme.defaultModeId] : null;
    if (!family) continue;
    const style = s.fontName.style;
    await figma.loadFontAsync({ family, style });
    s.setBoundVariable('fontFamily', null);
    s.fontName = { family, style };
  }
  for (const v of fontVars) v.remove();
}

// radius: system constant
if (radiusVar && MOVE_RADIUS) {
  const sys = cols.find(c => c.name === `${P}system`);
  const value = radiusVar.valuesByMode[theme.defaultModeId];
  if (sys) {
    const all = await figma.variables.getLocalVariablesAsync();
    let rv = all.find(v => v.variableCollectionId === sys.id && v.name === 'radius/image');
    if (!rv) { rv = figma.variables.createVariable('radius/image', sys, 'FLOAT'); rv.scopes = ['CORNER_RADIUS']; rv.setVariableCodeSyntax('WEB', 'var(--radius-image)'); }
    rv.setValueForMode(sys.defaultModeId, value);
    plan.push(`NOTE: re-bind nodes that used shape/image-radius to radius/image (run tokens.figma.js to find them) before it is deleted`);
  }
}

if (DELETE_OTHER) for (const m of theme.modes.filter(m => m.modeId !== theme.defaultModeId)) theme.removeMode(m.modeId);

return { dryRun: false, plan, changedFrames: changed, modes: theme.modes.map(m => m.name) };
// ===== end figma-taste collapse options =====
