#!/usr/bin/env node
// Regenerates the trimmed preludes from their full sources. Run after every change to
// helpers.figma.js or audit.figma.js:   node build-min.mjs
//   helpers.figma.js → helpers.min.figma.js   (core helpers only, comments stripped)
//   audit.figma.js   → audit.min.figma.js     (same checks, comments/indentation stripped,
//                                               long local names shortened; target < 9k characters)
// No dependencies. The full files stay the documented source; never edit the .min files by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- helpers.min
{
  const src = fs.readFileSync(path.join(dir, 'helpers.figma.js'), 'utf8');
  const KEEP = new Set(['need', 'paint', 'fill', 'bind', 'pad', 'stack', 'add', 'section', 'dummy', 'txt', 'inst', 'spanTo', 'row', 'done']);
  const lines = src.split('\n');
  const chunks = [];
  let cur = null;
  for (const line of lines) {
    const top = /^(async function|function|const|for|let) /.test(line);
    if (top) { cur = { head: line, body: [line] }; chunks.push(cur); }
    else if (cur && line.trim() && !/^\s*\/\//.test(line)) cur.body.push(line);
  }
  const nameOf = c => (c.head.match(/^(?:async )?function (\w+)/) || [])[1];
  const out = ['// figma-taste helpers (min). Generated from helpers.figma.js by build-min.mjs. Do not edit by hand.'];
  for (const c of chunks) {
    const n = nameOf(c);
    if (n && !KEEP.has(n)) continue;
    out.push(c.body.join('\n').replace(/\s+\/\/ [^\n'"`]*$/gm, '').trimEnd());
  }
  const min = out.join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'helpers.min.figma.js'), min);
  console.log(`helpers.min.figma.js: ${min.length} chars (full: ${src.length})`);
}

// ---------------------------------------------------------------- audit.min
// A small, dependency-free minifier for our own audit code: a tokenizer that leaves strings, template
// literals and regex literals untouched, drops comments and indentation, removes spaces that are not
// needed between identifiers, keeps line breaks (so automatic semicolon insertion is unchanged) and
// shortens the audit's own local names (never object keys, never property names, never shorthand).
function minify(code, rename) {
  const isId = c => /[A-Za-z0-9_$]/.test(c);
  let out = '';
  let i = 0;
  let lastSig = '';          // last significant output char, for regex detection
  let lastWord = '';
  const regexAfter = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '\n', '']);
  const regexAfterWords = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'await', 'yield']);
  function emit(t) { out += t; const tr = t.replace(/\s+$/, ''); if (tr) lastSig = tr[tr.length - 1]; }
  function readTemplate() {           // at a backtick; returns the literal with ${} parts minified
    let t = '`'; i++;
    while (i < code.length) {
      const c = code[i];
      if (c === '\\') { t += c + code[i + 1]; i += 2; continue; }
      if (c === '`') { t += c; i++; return t; }
      if (c === '$' && code[i + 1] === '{') {
        let depth = 1, j = i + 2, inner = '';
        while (j < code.length && depth) {
          const d = code[j];
          if (d === '`') { // nested template: copy verbatim (rare in our code)
            let k = j + 1; while (k < code.length && code[k] !== '`') k += code[k] === '\\' ? 2 : 1; inner += code.slice(j, k + 1); j = k + 1; continue;
          }
          if (d === "'" || d === '"') { let k = j + 1; while (k < code.length && code[k] !== d) k += code[k] === '\\' ? 2 : 1; inner += code.slice(j, k + 1); j = k + 1; continue; }
          if (d === '{') depth++;
          if (d === '}') { depth--; if (!depth) break; }
          inner += d; j++;
        }
        t += '${' + minify(inner, rename) + '}'; i = j + 1; continue;
      }
      t += c; i++;
    }
    return t;
  }
  while (i < code.length) {
    const c = code[i];
    // comments
    if (c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2) + 2; continue; }
    // strings
    if (c === "'" || c === '"') { let j = i + 1; while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1; emit(code.slice(i, j + 1)); i = j + 1; lastWord = ''; continue; }
    if (c === '`') { emit(readTemplate()); lastWord = ''; continue; }
    // regex literal
    if (c === '/' && (regexAfter.has(lastSig) || regexAfterWords.has(lastWord))) {
      let j = i + 1, inClass = false;
      while (j < code.length) {
        const d = code[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') inClass = true; else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) break;
        j++;
      }
      j++; while (/[a-z]/i.test(code[j] || '')) j++;
      emit(code.slice(i, j)); i = j; lastWord = ''; continue;
    }
    // whitespace
    if (c === '\n') { if (!out.endsWith('\n') && out.length) { out = out.replace(/ +$/, ''); out += '\n'; } i++; continue; }
    if (/\s/.test(c)) {
      let j = i; while (j < code.length && /[ \t\r]/.test(code[j])) j++;
      const prev = out[out.length - 1] || '', next = code[j] || '';
      if (isId(prev) && isId(next)) out += ' ';
      i = j; continue;
    }
    // identifiers
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < code.length && isId(code[j])) j++;
      const word = code.slice(i, j);
      let k = j; while (/[ \t]/.test(code[k] || '')) k++;
      const prevSig = lastSig;
      const isProp = out.endsWith('.') && !out.endsWith('...');   // a.b is a property; ...b is a spread
      const isKey = code[k] === ':' && code[k + 1] !== ':' && (prevSig === '{' || prevSig === ',');
      emit(rename[word] && !isProp && !isKey ? rename[word] : word);
      lastWord = word; i = j; continue;
    }
    emit(c); lastWord = ''; i++;
  }
  return out.replace(/\n{2,}/g, '\n').trim();
}

{
  const src = fs.readFileSync(path.join(dir, 'audit.figma.js'), 'utf8');
  // Local names of the audit only. Names used as object shorthand in the returned stats
  // (hidden, frames, instances, realImages, dummyLayers, offGrid) are deliberately not renamed.
  const RENAME = {
    visiblePaints: 'vP', insideInstance: 'iI', inAncestor: 'iA', hasLayout: 'hL', hasImage: 'hI',
    defaultName: 'dN', nextSibling: 'nS', isDummy: 'iD', textInfo: 'TI', styleCache: 'SC',
    unboundFill: 'uF', unboundSpace: 'uS', unboundRadius: 'uR', unstyledText: 'uT', defaultNamed: 'dX',
    autoFrames: 'aF', families: 'fm', sizeOf: 'sz', isFree: 'iF', isUI: 'iU', isCode: 'iC',
    stopId: 'sI', fullBleed: 'fB', compName: 'cN', iconLike: 'iL', sections: 'sc', isSplit: 'iS',
    isHeadline: 'iH', auditRoot: 'aR', ROOT_ID_VALUE: 'RV', maxSize: 'mS', tracked: 'tk', textInfoMap: 'tm',
    visible: 'visible', smallText: 'sT', carded: 'cd', checkRight: 'cR', rootX: 'rX', starts: 'st', ends: 'en',
    near: 'nr', check: 'ck', unknown: 'unknown', styleName: 'sN', results: 'results',
  };
  const header = '// figma-taste audit (min). Generated from audit.figma.js by build-min.mjs. Same checks as the full file.\n// Edit ROOT_IDS, MIN_IMAGES and SUMMARY on the next lines.\n';
  // Never rename a name that the source uses as object shorthand ({ a, b }): that would change the key.
  for (const n of Object.keys(RENAME)) {
    if (new RegExp(`[{,]\\s*${n}\\s*[,}]`).test(src)) delete RENAME[n];
  }
  const min = header + minify(src, RENAME) + '\n';
  fs.writeFileSync(path.join(dir, 'audit.min.figma.js'), min);
  console.log(`audit.min.figma.js: ${min.length} chars (full: ${src.length})`);
}
