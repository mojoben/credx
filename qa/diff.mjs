// Compare element geometry between the live capture and the local build.
// Elements are matched by tag + text, in document order.
//   node qa/diff.mjs <page-key> <width> [threshold=2]
import fs from 'node:fs';
import path from 'node:path';

const [key, width, thr = '2'] = process.argv.slice(2);
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const load = (dir) => JSON.parse(fs.readFileSync(path.join(ROOT, 'reference', dir, `${key}-${width}.json`), 'utf8'));
const live = load('live');
const local = load('local');

const textual = (e) => e.text && e.w > 1 && e.x + e.w > 0 && e.x < +width && /^(h1|h2|h3|h4|p|a|li|label|span|button|legend|b|strong|input)$/.test(e.tag);
const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
const queue = new Map();
for (const e of local.elements.filter(textual)) {
  const k = norm(e.text);
  if (!queue.has(k)) queue.set(k, []);
  queue.get(k).push(e);
}

console.log(`${key} @${width}: page height live ${live.height} / local ${local.height} (${local.height - live.height >= 0 ? '+' : ''}${local.height - live.height})`);
let shown = 0;
let lastDy = null;
for (const a of live.elements.filter(textual)) {
  const list = queue.get(norm(a.text));
  if (!list?.length) {
    console.log(`  MISSING locally: <${a.tag}> "${a.text.slice(0, 50)}" @${a.y}`);
    continue;
  }
  const b = list.shift();
  const d = { x: b.x - a.x, y: b.y - a.y, w: b.w - a.w, h: b.h - a.h };
  const fontDiff = a.font !== b.font ? `  font ${a.font} -> ${b.font}` : '';
  if (Math.max(...Object.values(d).map(Math.abs)) > +thr || fontDiff) {
    // only print when the offset changes, to show where drift starts
    if (lastDy === null || Math.abs(d.y - lastDy) > +thr || Math.abs(d.x) > +thr || Math.abs(d.w) > +thr || Math.abs(d.h) > +thr || fontDiff) {
      console.log(`  <${a.tag}> "${a.text.slice(0, 40)}" live(${a.x},${a.y},${a.w}x${a.h}) d(x${d.x} y${d.y} w${d.w} h${d.h})${fontDiff}`);
      shown++;
    }
    lastDy = d.y;
  } else {
    lastDy = d.y;
  }
}
for (const [k, list] of queue) for (const b of list) console.log(`  EXTRA locally: <${b.tag}> "${k.slice(0, 50)}" @${b.y}`);
if (!shown) console.log('  all matched text elements within', thr, 'px');
