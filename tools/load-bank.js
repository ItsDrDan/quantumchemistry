// Load Quantum Quest's main script in Node with a tiny stub DOM and return its globals.
// Used by the snapshot and feedback checkers. node tools/load-bank.js prints a summary.
const fs = require('fs'), vm = require('vm'), path = require('path');
function load() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const main = scripts.find(s => s.includes('const bank=[]'));
  if (!main) throw new Error('main script not found');
  const el = () => new Proxy(function () {}, {
    get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'style' || k === 'dataset' || k === 'classList' ? new Proxy({}, { get: () => () => {} , set: () => true }) : k === 'value' || k === 'innerHTML' || k === 'textContent' ? '' : el(),
    apply: () => el(), set: () => true
  });
  const store = {};
  const ctx = {
    console, Math, JSON, Date, Number, String, Array, Object, Set, Map, RegExp, Error, isFinite, parseFloat, parseInt, Symbol, Proxy,
    document: el(), window: {}, navigator: { userAgent: 'node' }, location: { search: '?course=1A', href: 'http://x/?course=1A' },
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    matchMedia: () => ({ matches: false, addEventListener() {} }), setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0,
    addEventListener() {}, history: { replaceState() {} }, URL, URLSearchParams, getComputedStyle: () => ({})
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  // expose lexical globals at the end of the script
  const expose = ';try{globalThis.__G={bank,diagramFor,modes,course:typeof course!=="undefined"?course:null,setCourse:typeof setCourse!=="undefined"?setCourse:null,parseNumber,shown,qeHints:typeof qeHints!=="undefined"?qeHints:null,qeDiagnose:typeof qeDiagnose!=="undefined"?qeDiagnose:null,qeMaskedWhy:typeof qeMaskedWhy!=="undefined"?qeMaskedWhy:null,qeSizeHint:typeof qeSizeHint!=="undefined"?qeSizeHint:null,qeReadNumber:typeof qeReadNumber!=="undefined"?qeReadNumber:null};}catch(e){globalThis.__E=e.message}';
  try { vm.runInContext(main + expose, ctx, { timeout: 60000 }); } catch (e) { if (!ctx.__G) throw e; }
  if (!ctx.__G) throw new Error('expose failed: ' + ctx.__E);
  return ctx.__G;
}
module.exports = { load };
if (require.main === module) {
  const G = load(), b = G.bank, by = {};
  b.forEach(q => { const k = q.type + '|' + q.mode; by[k] = (by[k] || 0) + 1; });
  console.log('bank', b.length);
  console.log(by);
  const nums = b.filter(q => q.type === 'number');
  console.log('number items', nums.length, 'with hint', nums.filter(q => q.hint).length, 'with hints[]', nums.filter(q => Array.isArray(q.hints)).length);
  console.log('sample', JSON.stringify(nums[5], null, 1).slice(0, 700));
}
