// After switching credx.co.uk over: check every page is the new build and the redirects,
// 404, form endpoint and assets behave.
//   node qa/golive-check.mjs [base=https://credx.co.uk]
// For a visual check against the old site afterwards:
//   BASE=https://credx.co.uk OUT=postlive node qa/capture-live.mjs 1440   (then diff.mjs with local=postlive)
import { PAGES } from './pages.mjs';

const BASE = (process.argv[2] || 'https://credx.co.uk').replace(/\/$/, '');
let failures = 0;
const ok = (pass, label, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};
const get = (path, opts = {}) => fetch(BASE + path, { redirect: 'manual', ...opts });

for (const [key, path] of Object.entries(PAGES)) {
  if (key === '404') continue;
  const r = await get(path);
  const html = r.status === 200 ? await r.text() : '';
  ok(r.status === 200 && html.includes('/_astro/') && !html.includes('wp-content'), `page ${path}`, `${r.status}${html.includes('wp-content') ? ' (still WordPress)' : ''}`);
}

const nf = await get('/this-page-does-not-exist/');
const nfHtml = await nf.text();
ok(nf.status === 404 && nfHtml.includes('Page not found'), '404 page', String(nf.status));

const redirects = [
  ['/get-a-quote', '/get-a-quote/'],
  ['/feed/', '/'],
  ['/sitemap_index.xml', '/sitemap-index.xml'],
  ['/page-sitemap.xml', '/sitemap-index.xml'],
];
for (const [from, to] of redirects) {
  const r = await get(from);
  const loc = r.headers.get('location') || '';
  ok([301, 302, 308].includes(r.status) && new URL(loc, BASE).pathname === to, `redirect ${from} -> ${to}`, `${r.status} ${loc}`);
}
for (const p of ['/wp-login.php', '/xmlrpc.php', '/wp-admin/']) {
  const r = await get(p);
  ok(r.status === 410, `old WordPress path ${p} gone (410)`, String(r.status));
}

for (const p of ['/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml', '/images/email/credx-logo.png', '/fonts/aller_regular.woff2']) {
  const r = await get(p);
  ok(r.status === 200, `asset ${p}`, String(r.status));
}
const api = await get('/api/enquiry/');
ok([301, 302, 303].includes(api.status), 'form endpoint answers (GET redirects to the form)', String(api.status));
const empty = await get('/api/enquiry/', { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams({}) });
const emptyJson = await empty.json().catch(() => ({}));
ok(empty.status === 422 && emptyJson.status === 'invalid', 'form validation runs (empty POST rejected, nothing sent)', `${empty.status} ${emptyJson.status ?? ''}`);

for (const host of ['http://credx.co.uk/', 'https://www.credx.co.uk/']) {
  if (!BASE.includes('credx.co.uk')) break;
  const r = await fetch(host, { redirect: 'manual' });
  ok([301, 308].includes(r.status) && (r.headers.get('location') || '').startsWith('https://credx.co.uk/'), `${host} -> https://credx.co.uk/`, `${r.status}`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
