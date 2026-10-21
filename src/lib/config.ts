// Public build-time settings.

/** Google reCAPTCHA v3 site key: the same one credco.co.uk uses. credx.co.uk has to be added
 *  to its domain list in the reCAPTCHA admin console. The matching secret goes in the server
 *  config (deploy/enquiry-config.example.php). Set to '' to turn reCAPTCHA off and rely on the
 *  honeypot and server checks only. */
export const RECAPTCHA_SITE_KEY = '6LdhQqUtAAAAALCVv9rCiAgMUfj6Slp9ts6PC0My';
