// Public build-time settings.

/** Google reCAPTCHA site key for credx.co.uk (score-based, invisible). Its allowed domains are set
 *  in the reCAPTCHA admin. Set to '' to turn reCAPTCHA off and rely on the honeypot and server
 *  checks only. */
export const RECAPTCHA_SITE_KEY = '6LffXfktAAAAAP1j-A_WcuaJDkP4EeJK-zwGf3B-';

/** 'classic': api.js in the browser, checked on the server with RECAPTCHA_SECRET_KEY (siteverify).
 *  'enterprise': enterprise.js, checked with RECAPTCHA_PROJECT_ID + RECAPTCHA_API_KEY. */
export const RECAPTCHA_MODE: 'classic' | 'enterprise' = 'classic';
