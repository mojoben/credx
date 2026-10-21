// reCAPTCHA v3, with the same rules as credco.co.uk (its lib/recaptcha.ts): refuse only on
// positive evidence of a bot (no token, a token minted for another action, or a low score) and
// let everything else through (no secret configured, Google unreachable, or a token Google won't
// validate, which almost always means a key/domain set-up problem and would otherwise swallow
// every real enquiry).
import { RECAPTCHA_ACTION } from './rules';

export type RecaptchaResult = { allowed: boolean; reason: string };

export async function checkRecaptcha(token: string): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { allowed: true, reason: 'not configured' };
  if (!token) return { allowed: false, reason: 'no token supplied' };
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
  try {
    const res = await fetch(process.env.RECAPTCHA_VERIFY_URL || 'https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { allowed: true, reason: `verify returned ${res.status}` };
    const data = (await res.json()) as { success?: boolean; score?: number; action?: string; 'error-codes'?: string[] };
    if (!data.success) {
      const codes = (data['error-codes'] ?? ['unknown']).join(', ');
      console.warn(`[enquiry] reCAPTCHA token not validated (${codes}), enquiry allowed through`);
      return { allowed: true, reason: `unverified: ${codes}` };
    }
    if (data.action && data.action !== RECAPTCHA_ACTION) return { allowed: false, reason: `action was ${data.action}` };
    const score = data.score ?? 0;
    return { allowed: score >= minScore, reason: `score ${score}` };
  } catch (err) {
    return { allowed: true, reason: `verify failed: ${(err as Error).message}` };
  }
}
