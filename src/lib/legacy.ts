// Handlers for old WordPress addresses (see the files under src/pages that re-export these).
import type { APIRoute } from 'astro';

/** Endpoints bots keep requesting: 410 Gone rather than the 404 page. */
export const gone: APIRoute = () => new Response('Gone', { status: 410, headers: { 'Content-Type': 'text/plain' } });

/** Yoast's sitemap addresses -> the new sitemap. */
export const toSitemap: APIRoute = () => new Response(null, { status: 301, headers: { Location: '/sitemap-index.xml' } });
