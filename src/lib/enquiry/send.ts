// Email through Resend's HTTPS API, as credco.co.uk sends (no SMTP ports needed, which container
// hosts often block). Without RESEND_API_KEY the email is written to the server log instead, so
// local testing never sends anything.

export type Email = { to: string[]; replyTo: string; subject: string; text: string; html: string };

export async function sendEmail(mail: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = `${process.env.MAIL_FROM_NAME || 'Credx'} <${process.env.MAIL_FROM || 'info@credx.co.uk'}>`;
  if (!key) {
    console.log(`[enquiry] RESEND_API_KEY not set, not sending.\nTo: ${mail.to.join(', ')}\nSubject: ${mail.subject}\n${mail.text}`);
    return;
  }
  const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'credx-enquiry/1.0' },
    body: JSON.stringify({ from, to: mail.to, reply_to: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
