// Diagram snapshot: node tools/check-diagrams.js [--save]
// Runs diagramFor() on every bank item in both courses and compares title + SVG hash
// with tools/diagram-snapshot.json. --save writes a new snapshot (do this only from a known-good version).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { load } = require('./load-bank');
const SNAP = path.join(__dirname, 'diagram-snapshot.json');
function snap() {
  const G = load(), out = {};
  G.bank.forEach((q, i) => {
    let d, err = '';
    try { d = G.diagramFor(q); } catch (e) { err = 'THROW ' + e.message; }
    const key = i + '|' + q.mode + '|' + String(q.q).slice(0, 60);
    out[key] = err || (d ? (d.title || '') + ' #' + crypto.createHash('sha1').update(String(d.svg || '') + '|' + String(d.html || '') + '|' + String(d.note || '') + '|' + String(d.caption || '') + '|' + JSON.stringify(Object.keys(d).sort())).digest('hex').slice(0, 12) : 'none');
  });
  return out;
}
const a = snap(), b = snap();
const unstable = Object.keys(a).filter(k => a[k] !== b[k]);
if (process.argv.includes('--save')) {
  if (unstable.length) { console.log('NOT saved: diagrams are not deterministic for', unstable.length, 'items, e.g.', unstable.slice(0, 3)); process.exit(1); }
  fs.writeFileSync(SNAP, JSON.stringify(a, null, 0));
  const vals = Object.values(a);
  console.log('saved', vals.length, 'items;', vals.filter(v => v === 'none').length, 'with no diagram;', vals.filter(v => v.startsWith('THROW')).length, 'throw;', new Set(vals.map(v => v.split(' #')[0])).size, 'distinct titles');
  process.exit(0);
}
const base = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
const diff = Object.keys(base).filter(k => base[k] !== a[k]);
const extra = Object.keys(a).filter(k => !(k in base));
console.log(`${Object.keys(base).length} items compared: ${diff.length} changed, ${extra.length} new, ${unstable.length} nondeterministic`);
diff.slice(0, 10).forEach(k => console.log('  CHANGED', k, '\n    was', base[k], '\n    now', a[k]));
process.exit(diff.length || extra.length || unstable.length ? 1 : 0);
