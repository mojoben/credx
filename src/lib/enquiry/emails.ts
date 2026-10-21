// Branded HTML emails for the enquiry form: the auto-reply to the person enquiring and the
// notification to info@credx.co.uk.
//
// Email-safe markup: table layout, inline styles, no SVG (the logo is a hosted PNG). The Aller
// web font shows in Apple Mail and iOS; everything else falls back to Arial.
import { site } from '../content';
import { EMAIL_ROWS, type Enquiry } from './rules';

const FONT = "Aller, 'Aller Regular', Arial, Helvetica, sans-serif";
const FONT_LIGHT = "'Aller Light', Aller, Arial, Helvetica, sans-serif";

export type Built = { subject: string; html: string; text: string };

const e = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const nl2br = (s: string) => s.replace(/\r?\n/g, '<br>');
const siteUrl = () => (process.env.SITE_URL || site.url).replace(/\/$/, '');
const contact = site.contact;
const tel = contact.phone.replace(/\s+/g, '');

/** Pill button that survives Outlook (a table cell with a background colour). */
function button(href: string, label: string, bg = '#008189') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">`
    + `<tr><td bgcolor="${bg}" style="background:${bg};border-radius:50px;">`
    + `<a href="${e(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;line-height:20px;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:.02em;">`
    + `${e(label)}</a></td></tr></table>`;
}

/** Grey rounded panel listing label / value pairs (empty values are left out). */
function details(rows: [string, string][]) {
  const out = rows
    .filter(([, v]) => v !== '')
    .map(([label, value]) => `<tr><td style="padding:0 0 18px;">`
      + `<div style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:bold;letter-spacing:.09em;text-transform:uppercase;color:#008189;">${e(label)}</div>`
      + `<div style="font-family:${FONT_LIGHT};font-size:16px;line-height:26px;color:#1a1a1a;">${nl2br(e(value))}</div>`
      + `</td></tr>`)
    .join('');
  if (!out) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f3f3" style="background:#f3f3f3;border-radius:30px;">`
    + `<tr><td style="padding:32px 32px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${out}</table></td></tr></table>`;
}

/** Numbered "what happens next" steps, styled like the site's process cards. */
function steps(list: [string, string][]) {
  const rows = list.map(([title, text], i) => `<tr><td valign="top" width="44" style="padding:0 0 18px;font-family:${FONT};font-size:40px;line-height:34px;color:#008189;">${i + 1}</td>`
    + `<td valign="top" style="padding:0 0 18px;">`
    + `<div style="font-family:${FONT};font-size:18px;line-height:24px;color:#1a1a1a;">${e(title)}</div>`
    + `<div style="font-family:${FONT_LIGHT};font-size:15px;line-height:25px;color:#1a1a1a;">${e(text)}</div></td></tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

const heading = (s: string, top = 0) => `<p style="margin:${top}px 0 20px;font-family:${FONT};font-size:20px;line-height:26px;color:#1a1a1a;">${e(s)}</p>`;

function customerFooter() {
  return `<tr><td class="px" style="padding:16px 40px 8px;">`
    + `<p style="margin:0 0 14px;font-family:${FONT};font-size:20px;line-height:26px;color:#1a1a1a;">Get in touch with CredX</p>`
    + `<p style="margin:0 0 18px;font-family:${FONT_LIGHT};font-size:16px;line-height:28px;color:#1a1a1a;">`
    + `Phone: <a href="tel:${e(tel)}" style="color:#008189;text-decoration:none;">${e(contact.phone)}</a><br>`
    + `Email: <a href="mailto:${e(contact.email)}" style="color:#008189;text-decoration:none;">${e(contact.email)}</a><br>`
    + `Address: ${e(contact.address)}</p>`
    + button(`tel:${tel}`, 'Call us') + button(`mailto:${contact.email}`, 'Email us', '#1a1a1a')
    + `</td></tr>`
    + `<tr><td class="px" style="padding:24px 40px 36px;"><div style="border-top:1px solid #e3e3e3;padding-top:24px;font-family:${FONT_LIGHT};font-size:12px;line-height:19px;color:#6b6b6b;">`
    + `<p style="margin:0 0 10px;"><b>CredX provides unregulated, business-purpose property finance exclusively to corporate borrowers. We do not provide regulated residential mortgages or consumer credit.</b></p>`
    + `<p style="margin:0 0 10px;">Our lending is not regulated by the Financial Conduct Authority. Loans are for business and investment purposes only and are not covered by the Financial Ombudsman Service or the Financial Services Compensation Scheme. All facilities are subject to underwriting, valuation and legal due diligence.</p>`
    + `<p style="margin:0 0 10px;">CredX Ltd is registered in England &amp; Wales with Company Number 16640225. Registered office: Suite F16 St George’s Business Park, Castle Road, Sittingbourne, Kent ME10 3TB. Registered with the Information Commissioner’s Office (ICO) under registration number: ZB991146.</p>`
    + `<p style="margin:0;"><b>Property may be repossessed if you do not keep up repayments on any loan secured against it.</b></p>`
    + `</div></td></tr>`;
}

/** The page every email sits in: logo, black hero panel, content, then (for customers) the
 *  contact details and legal footer, or (for the team) a one-line footnote. */
function layout(subject: string, preheader: string, title: string, introHtml: string, content: string, footnote?: string) {
  const s = siteUrl();
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">`
    + `<title>${e(subject)}</title><style>`
    + `@font-face{font-family:'Aller';src:url('${s}/fonts/aller_regular.woff2') format('woff2');}`
    + `@font-face{font-family:'Aller Light';src:url('${s}/fonts/aller_light.woff2') format('woff2');}`
    + `body{margin:0;padding:0;background:#f3f3f3;-webkit-text-size-adjust:100%;}`
    + `@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.hero{padding:30px 24px!important}.h1{font-size:28px!important;line-height:34px!important}.card{border-radius:0!important}}`
    + `</style></head><body style="margin:0;padding:0;background:#f3f3f3;">`
    + `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${e(preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f3f3" style="background:#f3f3f3;"><tr><td align="center" style="padding:24px 0;">`
    + `<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border-radius:30px;">`
    + `<tr><td class="px" style="padding:32px 40px 24px;"><a href="${e(s)}/"><img src="${e(s)}/images/email/credx-logo.png" width="150" height="54" alt="CredX" style="display:block;border:0;width:150px;height:auto;"></a></td></tr>`
    + `<tr><td class="px" style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:30px;">`
    + `<tr><td class="hero" style="padding:40px;">`
    + `<h1 class="h1" style="margin:0 0 14px;font-family:${FONT};font-weight:normal;font-size:34px;line-height:40px;color:#ffffff;">${e(title)}</h1>`
    + `<p style="margin:0;font-family:${FONT_LIGHT};font-size:17px;line-height:30px;color:#ffffff;">${introHtml}</p>`
    + `</td></tr></table></td></tr>`
    + `<tr><td class="px" style="padding:32px 40px 8px;">${content}</td></tr>`
    + (footnote !== undefined
      ? `<tr><td class="px" style="padding:16px 40px 36px;font-family:${FONT_LIGHT};font-size:12px;line-height:19px;color:#6b6b6b;">${e(footnote)}</td></tr>`
      : customerFooter())
    + `</table></td></tr></table></body></html>`;
}

/** £ amount as entered, with thousands separators. */
export function displayValues(v: Enquiry): Enquiry {
  const n = Number(v['loan-amount']);
  return {
    ...v,
    'loan-amount': `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`,
    declaration: 'Yes',
  };
}

/**
 * Auto-reply to the person enquiring. Only short, structured fields are repeated back, so the
 * form can't be used to send someone else an email full of arbitrary text.
 */
export function autoreplyEmail(v: Enquiry): Built {
  const d = displayValues(v);
  const first = (v['your-name'].trim().split(/\s+/)[0] ?? '').slice(0, 40);
  const clip = (s: string) => (s.length > 120 ? s.slice(0, 117) + '…' : s);
  const summary: [string, string][] = [
    ['Company', clip(v['company-name'])],
    ['Companies House number', clip(v['company-number'])],
    ['Loan purpose', v['loan-purpose']],
    ['Property type', v['property-type']],
    ['Amount requested', d['loan-amount']],
    ['Security address', clip(v['security-address'])],
  ];
  const next: [string, string][] = [
    ['We review your enquiry', 'We look at the requested facility, the security, LTV, purpose and proposed exit.'],
    ['We get in touch', 'A member of our team will contact you to talk the transaction through.'],
    ['Indicative terms', 'Where appropriate, we issue indicative terms in writing.'],
  ];
  const subject = 'We’ve received your enquiry | CredX';
  const intro = `${first ? `Dear ${e(first)}, thank` : 'Thank'} you for getting in touch. We’ve received your enquiry and will get back to you as soon as possible.`;
  const html = layout(subject, 'Thanks for getting in touch. Here’s a copy of your enquiry.', 'Thank you for your enquiry', intro,
    heading('Your enquiry') + details(summary) + heading('What happens next', 32) + steps(next));
  const text = (first ? `Dear ${first},\n\n` : '')
    + "Thank you for getting in touch with CredX. We've received your enquiry and will get back to you as soon as possible.\n\n"
    + 'YOUR ENQUIRY\n' + summary.map(([l, val]) => `${l}: ${val}`).join('\n')
    + '\n\nWHAT HAPPENS NEXT\n' + next.map(([t, x], i) => `${i + 1}. ${t}: ${x}`).join('\n')
    + `\n\nPhone: ${contact.phone}\nEmail: ${contact.email}\nAddress: ${contact.address}\n\n`
    + 'CredX provides unregulated, business-purpose property finance exclusively to corporate borrowers. We do not provide regulated residential mortgages or consumer credit. '
    + 'CredX Ltd, registered in England & Wales, company number 16640225. Property may be repossessed if you do not keep up repayments on any loan secured against it.\n';
  return { subject, html, text };
}

/** Notification to the CredX team, in the same branded layout, with every field. */
export function notificationEmail(v: Enquiry): Built {
  const d = displayValues(v);
  const groups: [string, string][][] = [[]];
  let text = '';
  for (const row of EMAIL_ROWS) {
    if (!row) {
      groups.push([]);
      text += '\n';
      continue;
    }
    const [k, label] = row;
    groups[groups.length - 1].push([label, d[k] ?? '']);
    text += `${(label + ': ').padEnd(20)}${d[k] ?? ''}\n`;
  }
  const spacer = '<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>';
  const content = groups.map(details).filter(Boolean).map((p) => p + spacer).join('')
    + button(`mailto:${v['your-email']}?subject=${encodeURIComponent('Your CredX enquiry')}`, `Reply to ${v['your-name'].slice(0, 40)}`);
  const footnote = `This is a notification that a contact form was submitted on your website (Credx ${siteUrl()}).`;
  text += `\n-- \n${footnote}\n`;
  const intro = `${e(v['your-name'])} at ${e(v['company-name'])} has sent an enquiry through credx.co.uk. Reply to this email to answer them directly.`;
  return {
    subject: 'Credx "Get In Touch"',
    html: layout('Credx "Get In Touch"', `New enquiry from ${v['company-name']}`, 'New enquiry', intro, content, footnote),
    text,
  };
}
