// Enquiry form: validates with the same messages Contact Form 7 used, lazy-loads reCAPTCHA
// Enterprise (invisible, score-based) when the form comes near the screen, and submits to
// /api/enquiry/ (src/pages/api/enquiry.ts) without a page reload.

import { MESSAGES, RECAPTCHA_ACTION, validate as validateRules } from '../lib/enquiry/rules';

type Recaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};
declare global {
  interface Window {
    grecaptcha?: { enterprise?: Recaptcha };
  }
}

function loadCaptcha(key: string) {
  if (document.getElementById('recaptcha')) return;
  const s = document.createElement('script');
  s.id = 'recaptcha';
  s.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(key)}`;
  s.async = true;
  document.head.append(s);
}

/** A token for this submission, or undefined if Google's script is blocked or not loaded yet
 *  (the server decides what to do with a missing token). */
async function captchaToken(key: string): Promise<string | undefined> {
  const g = window.grecaptcha?.enterprise;
  if (!g) return undefined;
  try {
    await new Promise<void>((resolve) => g.ready(resolve));
    return await g.execute(key, { action: RECAPTCHA_ACTION });
  } catch {
    return undefined;
  }
}

export function initEnquiryForms() {
  const forms = document.querySelectorAll<HTMLFormElement>('[data-enquiry]');
  if (!forms.length) return;

  forms.forEach((form) => {
    const key = form.dataset.recaptcha;
    if (key) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadCaptcha(key);
          io.disconnect();
        }
      }, { rootMargin: '600px 0px' });
      io.observe(form);
      form.addEventListener('focusin', () => loadCaptcha(key), { once: true });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(form);
    });
    // clear a field's error once it's changed
    form.addEventListener('input', (e) => clearError(e.target as HTMLElement));
    form.addEventListener('change', (e) => clearError(e.target as HTMLElement));
  });

  // the no-JavaScript fallback redirects back with ?enquiry=sent|failed
  const status = new URLSearchParams(location.search).get('enquiry');
  if (status === 'sent' || status === 'failed') {
    const form = document.querySelector<HTMLFormElement>('#get-in-touch [data-enquiry]');
    if (form) respond(form, status === 'sent' ? 'is-sent' : 'is-failed', MESSAGES[status]);
  }
}

function fieldBox(el: HTMLElement) {
  return el.closest<HTMLElement>('.field')!;
}

function clearError(el: HTMLElement) {
  const box = el.closest?.('.field');
  box?.querySelector('.field-error')?.remove();
  box?.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
}

function setError(form: HTMLFormElement, name: string, message: string) {
  const inputs = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  if (!inputs.length) return;
  const box = fieldBox(inputs[0]);
  box.querySelector('.field-error')?.remove();
  const tip = document.createElement('span');
  tip.className = 'field-error';
  tip.id = `${inputs[0].id || name}-error-${Math.random().toString(36).slice(2, 6)}`;
  tip.textContent = message;
  box.append(tip);
  inputs.forEach((i) => {
    i.setAttribute('aria-invalid', 'true');
    i.setAttribute('aria-describedby', tip.id);
  });
}

function validate(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const v: Record<string, string> = {};
  for (const [k, val] of data.entries()) if (typeof val === 'string') v[k] = val.trim();
  return validateRules(v);
}

function respond(form: HTMLFormElement, cls: string, message: string) {
  const out = form.querySelector<HTMLElement>('.enquiry-response')!;
  out.className = `enquiry-response ${cls}`;
  out.textContent = message;
  out.hidden = false;
}

function showErrors(form: HTMLFormElement, errors: Record<string, string>) {
  form.querySelectorAll('.field-error').forEach((e) => e.remove());
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  for (const [name, msg] of Object.entries(errors)) setError(form, name, msg);
  respond(form, 'is-invalid', MESSAGES.invalid);
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: false });
}

async function submit(form: HTMLFormElement) {
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  if (button.getAttribute('aria-busy') === 'true') return;

  const errors = validate(form);
  if (Object.keys(errors).length) {
    showErrors(form, errors);
    return;
  }

  button.setAttribute('aria-busy', 'true');
  try {
    const body = new FormData(form);
    const key = form.dataset.recaptcha;
    if (key) {
      const token = await captchaToken(key);
      if (token) body.set('g-recaptcha-response', token);
    }
    const res = await fetch(form.action, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.status === 'sent') {
      form.reset();
      form.querySelectorAll('.field-error').forEach((e) => e.remove());
      respond(form, 'is-sent', json.message || MESSAGES.sent);
    } else if (json.status === 'invalid' && json.fields) {
      showErrors(form, json.fields);
    } else {
      respond(form, 'is-failed', json.message || MESSAGES.failed);
    }
  } catch {
    respond(form, 'is-failed', MESSAGES.failed);
  } finally {
    button.removeAttribute('aria-busy');
  }
}
