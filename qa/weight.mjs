// Page weight and console errors, live vs local, for each page (desktop, scrolled to the bottom).
//   node qa/weight.mjs
import { chromium } from 'playwright';
import { PAGES } from './pages.mjs';

const browser = await chromium.launch();
const rows = [];
for (const [key, url] of Object.entries(PAGES)) {
  const row = { key };
  for (const [site, base] of [['live', 'https://credx.co.uk'], ['local', 'http://localhost:4331']]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    let bytes = 0, reqs = 0, js = 0;
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)));
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
    page.on('response', async (r) => {
      try {
        const b = (await r.body()).length;
        bytes += b; reqs++;
        if ((r.headers()['content-type'] || '').includes('javascript')) js += b;
      } catch {}
    });
    try { await page.goto(base + url, { waitUntil: 'networkidle', timeout: 60000 }); } catch {}
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) { await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(1500);
    row[site] = { kb: Math.round(bytes / 1024), reqs, jsKb: Math.round(js / 1024), errors };
    await ctx.close();
  }
  rows.push(row);
  const f = (s) => `${String(row[s].kb).padStart(5)} KB ${String(row[s].reqs).padStart(3)} req (JS ${row[s].jsKb} KB)`;
  console.log(key.padEnd(11), 'live', f('live'), ' | local', f('local'), row.local.errors.length ? ' local errors: ' + row.local.errors.join(' / ') : '');
}
await browser.close();
