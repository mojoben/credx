// Put live and local full-page screenshots next to each other, sliced for review.
//   node qa/side-by-side.mjs <page-key> <width> <outDir> [sliceHeight] [scaleWidth]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [key, width, outDir, sh = '1600', sw = '1400'] = process.argv.slice(2);
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const a = path.join(ROOT, 'reference', 'live', `${key}-${width}.png`);
const b = path.join(ROOT, 'reference', 'local', `${key}-${width}.png`);
fs.mkdirSync(outDir, { recursive: true });
const ma = await sharp(a).metadata();
const mb = await sharp(b).metadata();
const W = ma.width, H = Math.max(ma.height, mb.height), gap = 20;
const canvas = sharp({ create: { width: W * 2 + gap, height: H, channels: 3, background: '#ff00ff' } })
  .composite([{ input: a, left: 0, top: 0 }, { input: b, left: W + gap, top: 0 }]);
const full = await canvas.png().toBuffer();
const slice = +sh * (ma.width / 1440 > 0.5 ? 1 : 1);
let i = 0;
for (let top = 0; top < H; top += slice, i++) {
  const h = Math.min(slice, H - top);
  await sharp(full).extract({ left: 0, top, width: W * 2 + gap, height: h }).resize({ width: Math.min(+sw, W * 2 + gap) })
    .png().toFile(path.join(outDir, `${key}-${width}-${String(i).padStart(2, '0')}.png`));
}
console.log(key, width, 'live', ma.height, 'local', mb.height, '->', i, 'slices');
