// Slice a tall full-page screenshot into viewport-sized chunks for review.
//   node qa/slice.mjs <png> <outDir> [chunkHeight] [scaleWidth]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [src, outDir, ch = '1800', sw = '900'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const { width, height } = await sharp(src).metadata();
const base = path.basename(src, '.png');
for (let top = 0, i = 0; top < height; top += +ch, i++) {
  const h = Math.min(+ch, height - top);
  await sharp(src).extract({ left: 0, top, width, height: h }).resize({ width: Math.min(+sw, width) })
    .png().toFile(path.join(outDir, `${base}-${String(i).padStart(2, '0')}.png`));
}
console.log(base, Math.ceil(height / +ch), 'slices');
