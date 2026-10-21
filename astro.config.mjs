import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Astro also emits the original of every imported image; drop the ones no page uses so the
// upload stays small.
const pruneUnusedImages = () => ({
  name: 'prune-unused-images',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      // with the Node adapter `dir` is the client output (dist/client)
      const root = fileURLToPath(dir);
      const texts = [];
      const walk = async (d) => {
        for (const e of await fs.readdir(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) await walk(p);
          else if (/\.(html|css|js|xml|txt)$/.test(e.name)) texts.push(await fs.readFile(p, 'utf8'));
        }
      };
      await walk(root);
      const all = texts.join('\n');
      const assets = path.join(root, '_astro');
      let removed = 0;
      for (const f of await fs.readdir(assets)) {
        if (/\.(jpe?g|png|webp|avif|gif)$/i.test(f) && !all.includes(f)) {
          await fs.unlink(path.join(assets, f));
          removed++;
        }
      }
      logger.info(`removed ${removed} unreferenced image files`);
    },
  },
});

// Old WordPress addresses -> new, as real 301s. (Yoast's .xml sitemaps and the 410s for
// wp-login.php etc. are small on-demand routes in src/pages, see src/lib/legacy.ts.)
const REDIRECTS = {
  '/feed/': '/',
  '/comments/feed/': '/',
};

// Static-first: every page is prerendered at build time. The one on-demand route is
// /api/enquiry/ (the form). Runs as a Node server in the Coolify container (see Dockerfile).
export default defineConfig({
  site: 'https://credx.co.uk',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  redirects: Object.fromEntries(Object.entries(REDIRECTS).map(([from, to]) => [from, { status: 301, destination: to }])),
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !['/404', '/api/'].some((p) => page.includes(p)) }), pruneUnusedImages()],
  server: { host: true, port: 4321 },
  devToolbar: { enabled: false },
});
