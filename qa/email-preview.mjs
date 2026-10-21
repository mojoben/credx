// Render the two enquiry emails (team notification and auto-reply) into qa/email-preview/, with
// the logo and fonts embedded so the files open anywhere. Runs the built server against a fake
// Resend, so nothing is sent.
//   npm run build && node qa/email-preview.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'qa', 'email-preview');
const PORT = 4600;

const received = [];
const resend = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    received.push(JSON.parse(body));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"id":"preview"}');
  });
});
await new Promise((r) => resend.listen(0, '127.0.0.1', r));

const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
  cwd: ROOT,
  stdio: 'ignore',
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(PORT),
    RESEND_API_KEY: 'preview',
    RESEND_API_URL: `http://127.0.0.1:${resend.address().port}/`,
    RECAPTCHA_SECRET_KEY: '',
    ENQUIRY_LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'credx-preview-')),
  },
});
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const sample = {
    'your-name': 'Sarah Jones', 'your-email': 'sarah@example.com', 'contact-number': '07700 900123',
    'company-name': 'Example Property Ltd', 'company-number': '12345678', 'is-limited-company': 'Yes', 'is-trustee': 'No',
    'loan-purpose': 'Auction purchase', 'property-type': 'Residential investment', 'security-address': '12 High Street\nDartford DA1 1AA',
    'loan-amount': '275000', 'exit-strategy': 'Refinance onto a buy-to-let mortgage', 'let-us': 'Lot 14 at next month’s auction.', declaration: '1',
  };
  const r = await fetch(`http://127.0.0.1:${PORT}/api/enquiry/`, { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams(sample) });
  if (!r.ok || received.length < 2) throw new Error(`expected two emails, got ${received.length} (${r.status} ${await r.text()})`);

  const embed = (file, type) => `data:${type};base64,${fs.readFileSync(path.join(ROOT, 'public', file)).toString('base64')}`;
  const assets = {
    '/images/email/credx-logo.png': embed('images/email/credx-logo.png', 'image/png'),
    '/fonts/aller_regular.woff2': embed('fonts/aller_regular.woff2', 'font/woff2'),
    '/fonts/aller_light.woff2': embed('fonts/aller_light.woff2', 'font/woff2'),
  };
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, mail] of [['notification', received[0]], ['autoreply', received[1]]]) {
    let html = mail.html;
    for (const [p, data] of Object.entries(assets)) html = html.replace(new RegExp(`https?://[^"')]*${p.replace(/\./g, '\\.')}`, 'g'), data);
    fs.writeFileSync(path.join(OUT, `${name}.html`), html);
    fs.writeFileSync(path.join(OUT, `${name}.txt`), `To: ${mail.to.join(', ')}\nReply-To: ${mail.reply_to}\nFrom: ${mail.from}\nSubject: ${mail.subject}\n\n${mail.text}`);
    console.log(`${name}: ${mail.subject} -> ${mail.to.join(', ')}`);
  }
} finally {
  server.kill();
  resend.close();
}
