// Viewport screenshots while scrolling down a page, to see scroll effects (background canvas,
// entrance animations, sticky header) that full-page screenshots miss.
//   node qa/filmstrip.mjs <url> <width> [step] [outPrefix]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const [url, w = '1440', step = '700', prefix = 'film'] = process.argv.slice(2);
const OUT = path.join(import.meta.dirname, 'film');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: +w, height: 900 } })).newPage();
try { await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch {}
await page.waitForTimeout(3000);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < h; y += +step) {
  await page.mouse.wheel(0, i === 0 ? 0 : +step);
  await page.waitForTimeout(1600);
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: path.join(OUT, `${prefix}-${String(i).padStart(2, '0')}-${sy}.png`) });
  i++;
}
console.log(i, 'frames, height', h);
await browser.close();
