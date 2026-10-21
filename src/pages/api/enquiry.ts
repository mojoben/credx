// POST /api/enquiry/: the enquiry form. Validates, checks reCAPTCHA v3, emails the team and a
// branded auto-reply to the person enquiring through Resend, and logs a copy to /data.
// Answers JSON to the site's script, or redirects back with ?enquiry=sent|failed without JS.
import type { APIRoute } from 'astro';
import { FIELDS, MESSAGES, validate, type Enquiry } from '../../lib/enquiry/rules';
import { checkRecaptcha } from '../../lib/enquiry/recaptcha';
import { sendEmail } from '../../lib/enquiry/send';
import { autoreplyEmail, notificationEmail } from '../../lib/enquiry/emails';
import { logEnquiry } from '../../lib/enquiry/log';
import { rateLimited } from '../../lib/enquiry/ratelimit';

export const prerender = false;

const TEAM = () => (process.env.MAIL_TO || 'info@credx.co.uk').split(',').map((s) => s.trim()).filter(Boolean);
const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Europe/London' });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const finish = (status: string, message: string, code = 200, fields?: Record<string, string>) => {
    if (wantsJson) {
      return new Response(JSON.stringify({ status, message, ...(fields ? { fields } : {}) }), {
        status: code,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    // no JavaScript: back to the page the form was on (its path only, so this can't send
    // anyone to another site)
    let back = '/';
    try {
      const path = new URL(request.headers.get('referer') || '').pathname;
      if (/^\/(?!\/)/.test(path)) back = path;
    } catch {}
    return new Response(null, { status: 303, headers: { Location: `${back}?enquiry=${status === 'sent' ? 'sent' : 'failed'}#get-in-touch` } });
  };

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return finish('failed', MESSAGES.failed, 400);
  }
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v.replace(/\0/g, '').trim() : '';
  };

  // spam trap: real people never see this field
  if (field('website')) return finish('sent', MESSAGES.sent);

  // behind Coolify's proxy the visitor's address is the first X-Forwarded-For entry
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || clientAddress;
  if (rateLimited(ip)) return finish('failed', MESSAGES.failed, 429);

  const v: Enquiry = Object.fromEntries(FIELDS.map((k) => [k, field(k)]));
  const errors = validate(v);
  if (Object.keys(errors).length) return finish('invalid', MESSAGES.invalid, 422, errors);

  const captcha = await checkRecaptcha(field('g-recaptcha-response'));
  if (!captcha.allowed) {
    await logEnquiry({ date: now(), mail: `blocked: ${captcha.reason}`, autoreply: 'off', ...v });
    return finish('spam', MESSAGES.spam, 400);
  }

  // 1. the team: replies go straight to the person enquiring
  let mail = 'sent';
  try {
    await sendEmail({ to: TEAM(), replyTo: v['your-email'], ...notificationEmail(v) });
  } catch (err) {
    console.error('[enquiry] team email failed:', (err as Error).message);
    mail = 'failed';
  }

  // 2. the person enquiring: only once the team has it, so a failed send isn't confirmed to them
  let autoreply = 'off';
  if (mail === 'sent' && process.env.AUTOREPLY !== 'off') {
    try {
      await sendEmail({ to: [v['your-email']], replyTo: TEAM()[0], ...autoreplyEmail(v) });
      autoreply = 'sent';
    } catch (err) {
      console.error('[enquiry] auto-reply failed:', (err as Error).message);
      autoreply = 'failed';
    }
  }

  await logEnquiry({ date: now(), mail, autoreply, ...v });
  return mail === 'sent' ? finish('sent', MESSAGES.sent) : finish('failed', MESSAGES.failed, 500);
};

export const GET: APIRoute = ({ redirect }) => redirect('/get-a-quote/', 302);
