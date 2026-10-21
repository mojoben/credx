// Scroll through the home page services section on live and local, one frame per step.
//   node qa/services-film.mjs <outDir>
import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const [outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const frames = {};
for (const [site, base] of [['live', 'https://credx.co.uk'], ['local', 'http://localhost:4331']]) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  try { await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 60000 }); } catch {}
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector('.stickysection, .services').getBoundingClientRect().top + scrollY);
  frames[site] = [];
  let y = 0;
  for (let i = 0; i < 7; i++) {
    const target = top - 100 + i * 520;
    // wheel in small steps so scroll handlers see real scrolling
    while (y < target) { await page.mouse.wheel(0, 130); y += 130; await page.waitForTimeout(60); }
    await page.waitForTimeout(1700);
    const f = path.join(outDir, `${site}-${i}.png`);
    await page.screenshot({ path: f });
    frames[site].push(f);
  }
}
await browser.close();
for (let i = 0; i < 7; i++) {
  const both = await sharp({ create: { width: 2900, height: 900, channels: 3, background: '#f0f' } })
    .composite([{ input: frames.live[i], left: 0, top: 0 }, { input: frames.local[i], left: 1460, top: 0 }]).png().toBuffer();
  await sharp(both).resize({ width: 1200 }).png().toFile(path.join(outDir, `frame-${i}.png`));
}
console.log('done');
