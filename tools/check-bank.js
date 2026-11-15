#!/usr/bin/env node
/* Bank checks (2026-11-14): node tools/check-bank.js
   - no two questions are the same for the student (same mode, wording, answer, choices and picture)
   - one constants set: NA, EV, H, C are defined once and no item hard-codes a different value
   - every numeric answer is a finite number; every choice answer is among its choices */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { load } = require('./load-bank');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let fails = 0; const bad = m => { fails++; if (fails < 25) console.log('FAIL ' + m); };
const G = load(), b = G.bank;
const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const pic = q => { let d; try { d = G.diagramFor(q); } catch (e) { return 'THROW'; } return d ? crypto.createHash('sha1').update(String(d.svg || '') + String(d.html || '')).digest('hex').slice(0, 12) : 'none'; };
const seen = new Map();
b.forEach((q, i) => {
  const k = JSON.stringify([q.mode, q.type, strip(q.q), q.value ?? null, q.answer ?? null, q.answers ?? null, (q.choices || []).map(strip).sort(), q.tuple ?? null, q.diagramOrbital ?? null, q.hwVisual ? strip(q.hwVisual.svg).length + ':' + crypto.createHash('sha1').update(String(q.hwVisual.svg)).digest('hex').slice(0, 8) : null, pic(q)]);
  if (seen.has(k)) bad(`items ${seen.get(k)} and ${i} are the same question: ${strip(q.q).slice(0, 80)}`); else seen.set(k, i);
  if (q.type === 'number' && !Number.isFinite(q.value)) bad(`item ${i}: numeric answer ${q.value}`);
  if (q.type === 'choice' && q.choices && !q.choices.includes(q.answer)) bad(`item ${i}: answer not among choices`);
});
/* typed-answer questions (no choices) and block questions: the same wording and answer may appear only once, whatever the picture */
const typed=new Map();b.forEach((q,i)=>{if(!(q.type==='number'||/^Which periodic-table block contains/.test(q.q)))return;const k=q.mode+'|'+strip(q.q)+'|'+String(q.value??q.answer).replace(/-block$/,'');if(typed.has(k))bad(`items ${typed.get(k)} and ${i} ask the same thing: ${strip(q.q).slice(0,80)}`);else typed.set(k,i);});
/* constants: defined once; no stray literals with other precision */
const want = { NA: '6.0221e23', EV: '1.602e-19', H: '6.626e-34', C: '2.998e8' };
const defs = (html.match(/\b(?:NA|EV)=[\d.e+-]+/g) || []);
if (!defs.includes('NA=' + want.NA)) bad('NA is not 6.0221e23 (Yellow Sheet)'); if (!defs.includes('EV=' + want.EV)) bad('EV is not 1.602e-19');
for (const lit of ['6.02214076e23', '6.022e23', '1.602176634e-19', '6.02214076 ×', '6.62607015e-34', '2.99792458e8']) if (html.includes(lit)) bad('stray constant literal ' + lit);
if (/QE_NA = 6/.test(html)) bad('answer diagnosis uses its own NA');
console.log(`${b.length} items, ${seen.size} distinct questions`);
console.log(fails ? fails + ' problem(s)' : 'all checks pass'); process.exit(fails ? 1 : 0);
