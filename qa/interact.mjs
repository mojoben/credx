// Run the same interactions on the live site and the local build and screenshot both, side by side.
//   node qa/interact.mjs <outDir> [scenario ...]
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [outDir, ...only] = process.argv.slice(2);
const SITES = { live: 'https://credx.co.uk', local: process.env.BASE || 'http://localhost:4331' };

// each scenario: page, viewport, steps(page, site) then a viewport screenshot
const SCENARIOS = {
  'menu-390': { url: '/', w: 390, h: 760, run: async (p, s) => { await p.click(s === 'live' ? '.navbar-toggler' : '.nav-toggle'); await p.waitForTimeout(800); } },
  'menu-1024': { url: '/', w: 1024, h: 700, run: async (p, s) => { await p.click(s === 'live' ? '.navbar-toggler' : '.nav-toggle'); await p.waitForTimeout(800); } },
  'sticky-1440': { url: '/our-process/', w: 1440, h: 600, run: async (p) => { await p.mouse.wheel(0, 900); await p.waitForTimeout(1500); } },
  'sticky-390': { url: '/our-process/', w: 390, h: 700, run: async (p) => { await p.mouse.wheel(0, 900); await p.waitForTimeout(1500); } },
  'team-1440': { url: '/why-choose-credx/', w: 1440, h: 900, run: async (p, s) => {
    await p.evaluate(() => document.querySelectorAll('.team-card')[1].scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    await p.locator(s === 'live' ? '.team-card .thm-btn' : '.team-card button').nth(1).click({ force: true }); await p.waitForTimeout(1000);
  } },
  'team-390': { url: '/why-choose-credx/', w: 390, h: 800, run: async (p, s) => {
    await p.evaluate(() => document.querySelector('.team-card').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    await p.locator(s === 'live' ? '.team-card .thm-btn' : '.team-card button').first().click({ force: true }); await p.waitForTimeout(1000);
  } },
  'carousel-1440': { url: '/', w: 1440, h: 900, run: async (p, s) => {
    const sel = s === 'live' ? '.why-choose' : '.why-choose';
    await p.locator(sel).scrollIntoViewIfNeeded();
    await p.evaluate(() => scrollBy(0, 100));
    await p.waitForTimeout(500);
    // go back to the first slide, then forward one
    for (let i = 0; i < 4; i++) { await p.click(s === 'live' ? '.why-choose .owl-prev' : '.why-choose .carousel-prev', { force: true }).catch(() => {}); await p.waitForTimeout(300); }
    await p.waitForTimeout(1200);
  } },
};

const browser = await chromium.launch();
fs.mkdirSync(outDir, { recursive: true });
for (const [name, sc] of Object.entries(SCENARIOS)) {
  if (only.length && !only.includes(name)) continue;
  const shots = [];
  for (const [site, base] of Object.entries(SITES)) {
    const ctx = await browser.newContext({ viewport: { width: sc.w, height: sc.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try { await page.goto(base + sc.url, { waitUntil: 'networkidle', timeout: 60000 }); } catch {}
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    try { await sc.run(page, site); } catch (e) { console.log(name, site, 'step failed:', e.message.split('\n')[0]); }
    const file = path.join(outDir, `${name}-${site}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
    await ctx.close();
  }
  const gap = 20;
  const both = await sharp({ create: { width: sc.w * 2 + gap, height: sc.h, channels: 3, background: '#ff00ff' } })
    .composite([{ input: shots[0], left: 0, top: 0 }, { input: shots[1], left: sc.w + gap, top: 0 }])
    .png().toBuffer();
  await sharp(both).resize({ width: Math.min(1400, sc.w * 2 + gap) }).png().toFile(path.join(outDir, `${name}.png`));
  console.log(name, 'done');
}
await browser.close();
