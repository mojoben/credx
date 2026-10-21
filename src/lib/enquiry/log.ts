// Every enquiry is appended to a CSV on the /data volume (replaces the old CFDB7 plugin), including
// ones reCAPTCHA refused, so a real enquiry blocked by mistake can still be followed up.
import fs from 'node:fs/promises';
import path from 'node:path';

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function logEnquiry(row: Record<string, string>): Promise<void> {
  const dir = process.env.ENQUIRY_LOG_DIR || '/data';
  const file = path.join(dir, 'credx-enquiries.csv');
  try {
    const exists = await fs.stat(file).then(() => true, () => false);
    const lines = (exists ? '' : Object.keys(row).map(cell).join(',') + '\n') + Object.values(row).map(cell).join(',') + '\n';
    await fs.appendFile(file, lines, { mode: 0o600 });
  } catch (err) {
    console.error(`[enquiry] could not write ${file}: ${(err as Error).message} (is the /data volume mounted?)`);
  }
}
