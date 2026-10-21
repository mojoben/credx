# Deploying credx.co.uk with Coolify

GitHub → Coolify → the server, behind Traefik, container port **4321**. It's the same shape as the Madhouse sites: every page is prerendered at build time, and the Node adapter serves them along with the one on-demand route, `/api/enquiry/` (the enquiry form).

## 1. Before the first deploy

- **Resend (the same account as credco.co.uk):** Domains → Add `credx.co.uk`. Put the records it lists into the credx.co.uk DNS at **GoDaddy**. They're usually `MX send`, `TXT send` (SPF) and `TXT resend._domainkey` (DKIM). **Leave the existing root MX, SPF and DMARC records alone**: Microsoft 365 uses them for info@credx.co.uk. The domain's DMARC is `p=reject`, so emails from the form are **refused** until Resend shows the domain as **Verified**. Then create an API key, ideally with sending access limited to credx.co.uk.
- **reCAPTCHA Enterprise:** the site key is already in `src/lib/config.ts`. In Google Cloud (Security → reCAPTCHA), make sure the key's domains include `credx.co.uk`, `www.credx.co.uk` and any temporary test domain. Then, in the same project, go to *APIs & Services → Credentials → Create credentials → API key* and restrict it to the **reCAPTCHA Enterprise API**. That key goes in `RECAPTCHA_API_KEY`, and the project ID (from the project picker) goes in `RECAPTCHA_PROJECT_ID`.

## 2. The Coolify application

*Project → New Resource → Application → the GitHub repo.*

| Setting | Value |
| --- | --- |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Port | `4321` |
| Domains | `https://credx.co.uk`, plus `https://www.credx.co.uk` set to redirect to it |
| Health check | built into the image (`GET /`) |

**Storages → Add → Volume Mount**, destination **`/data`**. Do this before the first deploy. It holds `credx-enquiries.csv`, a copy of every enquiry (including any refused by reCAPTCHA, marked `blocked: …`). Without the volume, the copy is lost on every redeploy, though the emails still go out.

**Environment variables** (see `.env.example`):

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | from Resend |
| `RECAPTCHA_PROJECT_ID` | the Google Cloud project the reCAPTCHA key is in |
| `RECAPTCHA_API_KEY` | an API key from that project, restricted to the reCAPTCHA Enterprise API |
| `MAIL_TO` | `info@credx.co.uk` (comma-separate for more than one) |
| `MAIL_FROM` | `info@credx.co.uk` (must be on the verified domain) |

None of these are needed at build time, so changing one needs a restart, not a rebuild.

## 3. Going live

1. Deploy, and check it on the Coolify-generated URL first (the pages, the form, the 404 page).
2. Point the domain at the new server: in GoDaddy DNS, change the `A` records for `credx.co.uk` and `www` (currently `213.175.208.161`, the old Plesk/WordPress server) to the Coolify server's IP. Lower the TTL a few hours beforehand if you can. Coolify issues the HTTPS certificate once DNS resolves.
3. When DNS has switched, run the checks from this folder:
   ```bash
   node qa/golive-check.mjs
   ```
   They cover all 9 pages, the 404 page, the old WordPress redirects and 410s, the form endpoint and the assets.
4. Send a real test enquiry from your own address. The notification should reach info@credx.co.uk, and the auto-reply should reach you. Then check the Runtime Logs: a line starting `[enquiry] reCAPTCHA` means the verification isn't set up right (wrong project or key, the API not enabled, or billing). Enquiries still go through while that's the case.
5. Google Search Console: submit `https://credx.co.uk/sitemap-index.xml`.

**Rollback:** point the DNS `A` records back at `213.175.208.161`. WordPress is still there, untouched.

## Later

- After a week or two, remove the WordPress site and database from the old Plesk server.
- GA4 (`G-VFEZ52Y58Y`) with a styled cookie banner is the next job.

## Local

```bash
npm ci
npm run dev                  # http://localhost:4321
npm run build && npm start   # production server, as in the container
node qa/email-preview.mjs    # renders both emails to qa/email-preview/ (needs a build)
```

Without `RESEND_API_KEY`, enquiries are written to the server log instead of being emailed.
