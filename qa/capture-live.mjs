// Capture a site for reference: full-page screenshot, rendered DOM and a geometry/style dump of
// every visible element.
//   node qa/capture-live.mjs [width] [page-key ...]          live site -> reference/live
//   BASE=http://localhost:4331 OUT=local node qa/capture-live.mjs ...   local build -> reference/local
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES } from './pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const BASE = process.env.BASE || 'https://credx.co.uk';
const OUT = path.join(ROOT, 'reference', process.env.OUT || 'live');
const [widthArg, ...only] = process.argv.slice(2);
const WIDTH = Number(widthArg) || 1440;

const dump = () => {
  const out = [];
  const keep = (el) => {
    const t = el.tagName;
    const cs = getComputedStyle(el);
    if (/^(H[1-6]|P|LI|A|IMG|BUTTON|UL|OL|SPAN|STRONG|BLOCKQUOTE|INPUT|TEXTAREA|SELECT|IFRAME|VIDEO|SVG|I|LABEL)$/.test(t)) return true;
    if (cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) return true;
    if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0) return true;
    if (cs.transform !== 'none') return true;
    if (/^(SECTION|HEADER|FOOTER|NAV|ARTICLE|FORM)$/.test(t)) return true;
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    if (!keep(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const cls = el.getAttribute('class') || '';
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: cls.split(/\s+/).slice(0, 6).join(' ') || undefined,
      id: el.id || undefined,
      text: (own || (el.children.length === 0 ? el.textContent.trim() : '')).replace(/\s+/g, ' ').slice(0, 80) || undefined,
      href: el.tagName === 'A' ? el.getAttribute('href') : undefined,
      src: el.currentSrc ? el.currentSrc.split('/uploads/').pop() : undefined,
      x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height),
      font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`,
      ls: cs.letterSpacing !== 'normal' ? cs.letterSpacing : undefined,
      tt: cs.textTransform !== 'none' ? cs.textTransform : undefined,
      ta: cs.textAlign,
      color: cs.color,
      bg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : undefined,
      bgi: cs.backgroundImage !== 'none' ? cs.backgroundImage.split('/uploads/').pop().slice(0, 120) : undefined,
      bgp: cs.backgroundImage !== 'none' ? `${cs.backgroundPosition} / ${cs.backgroundSize}` : undefined,
      pad: cs.padding !== '0px' ? cs.padding : undefined,
      mar: cs.margin !== '0px' ? cs.margin : undefined,
      border: parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth) ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor} | ${cs.borderLeftWidth}` : undefined,
      bb: cs.borderBottomWidth !== '0px' && cs.borderBottomStyle !== 'none' ? `${cs.borderBottomWidth} ${cs.borderBottomColor}` : undefined,
      radius: cs.borderRadius !== '0px' ? cs.borderRadius : undefined,
      transform: cs.transform !== 'none' ? cs.transform : undefined,
      opacity: cs.opacity !== '1' ? cs.opacity : undefined,
      z: cs.zIndex !== 'auto' ? cs.zIndex : undefined,
      pos: cs.position !== 'static' ? cs.position : undefined,
      fit: el.tagName === 'IMG' ? `${cs.objectFit} ${cs.objectPosition}` : undefined,
      shadow: cs.boxShadow !== 'none' ? cs.boxShadow : undefined,
    });
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: WIDTH >= 1024 ? 1 : 2 });
fs.mkdirSync(OUT, { recursive: true });
for (const [key, url] of Object.entries(PAGES)) {
  if (only.length && !only.includes(key)) continue;
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 90000 });
  } catch { /* long-polling scripts can stop networkidle; carry on with what loaded */ }
  await page.evaluate(() => document.fonts.ready);
  // scroll through so lazy images load and entrance animations fire
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(200); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(3000);
  const data = await page.evaluate(dump);
  const meta = await page.evaluate(() => ({ title: document.title, height: document.documentElement.scrollHeight, fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`))] }));
  fs.writeFileSync(path.join(OUT, `${key}-${WIDTH}.json`), JSON.stringify({ url, width: WIDTH, ...meta, elements: data }, null, 1));
  if (WIDTH === 1440) fs.writeFileSync(path.join(OUT, `${key}.dom.html`), await page.content());
  await page.screenshot({ path: path.join(OUT, `${key}-${WIDTH}.png`), fullPage: true });
  console.log(key, WIDTH, meta.height, data.length, 'elements;', meta.fonts.join(', '));
  await page.close();
}
await browser.close();
