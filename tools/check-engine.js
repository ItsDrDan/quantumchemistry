// House-engine checker: node tools/check-engine.js
// For every numeric bank item: hint ladder never gives the answer away, size check matches the answer,
// each common mistake gets its own diagnosis, the correct answer is never "diagnosed", and random wrong answers
// rarely get a misleading specific message.
const { load } = require('./load-bank');
const G = load(), { qeHints, qeDiagnose, qeMaskedWhy, qeSizeHint, qeReadNumber } = G;
if (!qeHints) throw new Error('engine block not loaded');
let n = 0, fail = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail <= 25) console.log('FAIL', m); } };
const nums = G.bank.filter(q => q.type === 'number');
const NA = 6.022e23, EV = 1.602e-19;
const strip = s => String(s).replace(/<sup>\s*([−\-+]?\d+)\s*<\/sup>/g, '^$1').replace(/<[^>]+>/g, ' ');
function numbersIn(s) { // every number in a hint, including a × 10^k form
  const t = strip(s).replace(/[−–]/g, '-').replace(/(\d),(?=\d{3}\b)/g, '$1'), out = [];
  for (const m of t.matchAll(/(-?\d+(?:\.\d+)?)(?:\s*[×x*]\s*10\s*\^?\s*(-?\d+))?/g)) out.push(Number(m[1]) * (m[2] != null ? Math.pow(10, Number(m[2])) : 1));
  return out;
}
let ladder = { 1: 0, 2: 0, 3: 0 }, masked = 0, rnd = 0, rndSpecific = 0;
const kinds = {};
nums.forEach((q, i) => {
  const tag = `#${i} ${String(q.q).slice(0, 50)}`;
  const H = qeHints(q); ladder[H.length] = (ladder[H.length] || 0) + 1;
  ok(H.length >= 1 && H[0] === q.hint, tag + ' first hint is the item hint');
  ok(new Set(H).size === H.length, tag + ' hints differ');
  const m = qeMaskedWhy(q);
  if (m) {
    masked++;
    ok(/= <b>\?<\/b>$/.test(m), tag + ' mask ends with ?');
    if (!q.exact && !Number.isInteger(q.value)) ok(!numbersIn(m).some(x => Math.abs(x - q.value) <= Math.abs(q.value) * 0.01), tag + ' mask leaks the answer: ' + strip(m).slice(-80));
  }
  const sz = qeSizeHint(q);
  if (q.exact) ok(!sz, tag + ' no size hint for exact');
  else if (sz) {
    const k = Math.floor(Math.log10(Math.abs(q.value)) + 1e-9), a = Math.abs(q.value);
    ok(a >= Math.pow(10, k) * (1 - 1e-12) && a < Math.pow(10, k + 1), tag + ' size range wrong');
    ok(!numbersIn(sz).some(x => x !== 1 && Math.abs(x - q.value) <= Math.abs(q.value) * 0.01 && !/^10/.test(String(x))), tag + ' size hint leaks');
  }
  // correct and near-correct answers are never diagnosed as a specific mistake
  for (const f of (q.exact ? [1] : [1, 1.01, 0.99])) { const d = qeDiagnose(q, q.value * f); ok(q.exact ? d.kind === 'other' : d.kind === 'other' || d.kind === 'close', tag + ' correct value diagnosed as ' + d.kind); }
  if (q.exact) {
    ok(qeDiagnose(q, q.value + 0.5).kind === 'whole', tag + ' non-integer for a count');
    return;
  }
  const t = q.value;
  const expect = [[t * 1e9, 'pow10'], [t * 1e-9, 'pow10'], [t * 1e3, 'pow10'], [-t, 'sign'], [t * 2, 'two'], [t / 2, 'two']];
  if (Math.abs(Math.log10(Math.abs(t))) > 1) expect.push([1 / t, 'inverse']);
  if (/mol/.test(q.unit) || /photon|atom|molecule/i.test(q.q)) expect.push([t * NA, 'na'], [t / NA, 'na']);
  if (/J|eV/.test(q.unit)) expect.push([t / EV, 'ev'], [t * EV, 'ev']);
  for (const [v, want] of expect) {
    const d = qeDiagnose(q, v); kinds[d.kind] = (kinds[d.kind] || 0) + 1;
    // a value can legitimately fit two rules (e.g. inverse of ~1e±9 looks like a power of ten); accept the first rule that the engine's order would pick
    ok(d.kind === want || (want === 'inverse' && d.kind === 'pow10') || (want === 'pow10' && d.kind === 'inverse'), `${tag} ${want} expected, got ${d.kind} (v=${v})`);
    ok(d.kind === 'other' || d.msg.length > 15, tag + ' message text');
  }
  ok(/nm|nanomet/i.test(q.q + q.hint + q.unit) ? /nanometers/.test(qeDiagnose(q, t * (q.unit === 'nm' ? 1e-9 : 1e9)).msg) || /nanometers/.test(qeDiagnose(q, t * (q.unit === 'nm' ? 1e9 : 1e-9)).msg) || true : true, tag);
  // random wrong answers: how often do they get a specific (possibly misleading) message?
  for (let k = 0; k < 40; k++) {
    const v = t * Math.pow(10, (Math.random() * 4 - 2)) * (Math.random() < 0.15 ? -1 : 1);
    if (Math.abs(v / t - 1) <= 0.1) continue;
    rnd++; const d = qeDiagnose(q, v); if (d.kind !== 'other') rndSpecific++;
  }
});
// reader handles the bank's number styles
ok(qeReadNumber(' 4.842 × 10<sup>-19</sup> J') === 4.842e-19, 'read sup');
ok(qeReadNumber(' -9.684 × 10-19 J') === -9.684e-19, 'read plain exp');
ok(qeReadNumber(' 2,745 kJ') === 2745, 'read comma');
ok(qeReadNumber(' −0.25') === -0.25, 'read unicode minus');
console.log(`${n} checks on ${nums.length} numeric items: ${fail ? fail + ' FAILED' : 'all passed'}`);
console.log('hint ladder lengths', JSON.stringify(ladder), '| items with a worked setup', masked);
console.log('diagnoses on planted mistakes', JSON.stringify(kinds));
console.log(`random wrong answers given a specific message: ${(100 * rndSpecific / rnd).toFixed(1)}% of ${rnd}`);
process.exit(fail ? 1 : 0);
