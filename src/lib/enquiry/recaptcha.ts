// reCAPTCHA (Enterprise, score-based), with the same rules as credco.co.uk's lib/recaptcha.ts:
// refuse only on positive evidence of a bot (no token, a token minted for another action, or a
// low score) and let everything else through (not configured, Google unreachable, or a token
// Google won't validate, which almost always means a key/domain set-up problem and would
// otherwise swallow every real enquiry).
//
// Verification, whichever is configured:
//   RECAPTCHA_PROJECT_ID + RECAPTCHA_API_KEY  the reCAPTCHA Enterprise API (createAssessment)
//   RECAPTCHA_SECRET_KEY                      the classic siteverify endpoint (a legacy secret)
import { RECAPTCHA_ACTION } from './rules';
import { RECAPTCHA_SITE_KEY } from '../config';

export type RecaptchaResult = { allowed: boolean; reason: string };

const unverified = (why: string): RecaptchaResult => {
  console.warn(`[enquiry] reCAPTCHA token not validated (${why}), enquiry allowed through`);
  return { allowed: true, reason: `unverified: ${why}` };
};

function judge(action: string | undefined, score: number | undefined): RecaptchaResult {
  if (action && action !== RECAPTCHA_ACTION) return { allowed: false, reason: `action was ${action}` };
  const s = score ?? 0;
  return { allowed: s >= Number(process.env.RECAPTCHA_MIN_SCORE || 0.5), reason: `score ${s}` };
}

async function enterprise(token: string, project: string, apiKey: string): Promise<RecaptchaResult> {
  const url = process.env.RECAPTCHA_ASSESSMENT_URL
    || `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(project)}/assessments`;
  const res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: { token, siteKey: RECAPTCHA_SITE_KEY, expectedAction: RECAPTCHA_ACTION } }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // wrong project or key, API not enabled, quota: a set-up problem, not a bot
    console.warn(`[enquiry] reCAPTCHA assessment returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { allowed: true, reason: `assessment returned ${res.status}` };
  }
  const data = (await res.json()) as {
    tokenProperties?: { valid?: boolean; invalidReason?: string; action?: string };
    riskAnalysis?: { score?: number };
  };
  if (!data.tokenProperties?.valid) return unverified(data.tokenProperties?.invalidReason || 'invalid');
  return judge(data.tokenProperties.action, data.riskAnalysis?.score);
}

async function classic(token: string, secret: string): Promise<RecaptchaResult> {
  const res = await fetch(process.env.RECAPTCHA_VERIFY_URL || 'https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return { allowed: true, reason: `verify returned ${res.status}` };
  const data = (await res.json()) as { success?: boolean; score?: number; action?: string; 'error-codes'?: string[] };
  if (!data.success) return unverified((data['error-codes'] ?? ['unknown']).join(', '));
  return judge(data.action, data.score);
}

export async function checkRecaptcha(token: string): Promise<RecaptchaResult> {
  const project = process.env.RECAPTCHA_PROJECT_ID;
  const apiKey = process.env.RECAPTCHA_API_KEY;
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!(project && apiKey) && !secret) return { allowed: true, reason: 'not configured' };
  if (!token) return { allowed: false, reason: 'no token supplied' };
  try {
    return project && apiKey ? await enterprise(token, project, apiKey) : await classic(token, secret!);
  } catch (err) {
    return { allowed: true, reason: `verify failed: ${(err as Error).message}` };
  }
}
