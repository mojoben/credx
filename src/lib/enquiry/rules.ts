// Enquiry form rules and wording, shared by the browser script and the /api/enquiry/ route.
// Messages are Contact Form 7's, as the old site showed them.

export const MESSAGES = {
  required: 'Please fill out this field.',
  email: 'Please enter an email address.',
  number: 'Please enter a number.',
  tooSmall: 'This field has a too small number.',
  tooLong: 'This field has a too long input.',
  accept: 'You must accept the terms and conditions before sending your message.',
  notLimited: 'CredX lends only to UK limited companies and corporate SPVs. We are not able to accept this enquiry. If you think this is an error, please email info@credx.co.uk.',
  trustee: 'Enquiries where the borrower would be acting as trustee need to be reviewed before they can proceed. Please email info@credx.co.uk.',
  invalid: 'One or more fields have an error. Please check and try again.',
  sent: 'Thank you for your message. It has been sent.',
  failed: 'There was an error trying to send your message. Please try again later.',
  // CF7's wording when its spam check refused a submission
  spam: 'There was an error trying to send your message. Please try again later.',
} as const;

export const PURPOSES = ['Auction purchase', 'Investment purchase', 'Refinance', 'Refurbishment', 'Development', 'Commercial', 'Other business purpose'];
export const PROPERTY_TYPES = ['Residential investment', 'Commercial', 'Semi-Commercial'];
export const MIN_LOAN = 25000;

/** must match between the browser (token request) and the server (verification) */
export const RECAPTCHA_ACTION = 'enquiry';

/** [field, label] in the order the team's email lists them; null = section break */
export const EMAIL_ROWS: ([string, string] | null)[] = [
  ['company-name', 'Company'],
  ['company-number', 'Companies House'],
  ['is-limited-company', 'UK limited company'],
  ['is-trustee', 'Acting as trustee'],
  null,
  ['your-name', 'Contact'],
  ['your-email', 'Email'],
  ['contact-number', 'Telephone'],
  null,
  ['loan-purpose', 'Loan purpose'],
  ['property-type', 'Security type'],
  ['security-address', 'Security address'],
  ['loan-amount', 'Amount requested'],
  ['exit-strategy', 'Exit strategy'],
  null,
  ['let-us', 'Detail'],
  null,
  ['declaration', 'Declaration accepted at submission'],
];

export const FIELDS = EMAIL_ROWS.filter((r): r is [string, string] => r !== null).map(([k]) => k);
export type Enquiry = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field name -> error message, empty when valid. The same checks run in the browser and on the server. */
export function validate(v: Enquiry): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const k of FIELDS) {
    const value = v[k] ?? '';
    if (value.length > 5000) errors[k] = MESSAGES.tooLong;
    else if (!value && k !== 'let-us') errors[k] = k === 'declaration' ? MESSAGES.accept : MESSAGES.required;
  }
  if (!errors['your-email'] && !EMAIL_RE.test(v['your-email'])) errors['your-email'] = MESSAGES.email;
  if (!errors['loan-amount']) {
    const n = Number(v['loan-amount']);
    if (!Number.isFinite(n)) errors['loan-amount'] = MESSAGES.number;
    else if (n < MIN_LOAN) errors['loan-amount'] = MESSAGES.tooSmall;
  }
  for (const k of ['is-limited-company', 'is-trustee']) {
    if (!errors[k] && !['Yes', 'No'].includes(v[k])) errors[k] = MESSAGES.required;
  }
  if (!errors['loan-purpose'] && !PURPOSES.includes(v['loan-purpose'])) errors['loan-purpose'] = MESSAGES.required;
  if (!errors['property-type'] && !PROPERTY_TYPES.includes(v['property-type'])) errors['property-type'] = MESSAGES.required;
  if (v['is-limited-company'] === 'No') errors['is-limited-company'] = MESSAGES.notLimited;
  if (v['is-trustee'] === 'Yes') errors['is-trustee'] = MESSAGES.trustee;
  return errors;
}
