// Images copied from wp-content/uploads, keyed by their old uploads path (e.g. "2025/08/bridging.webp").
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/media/**/*.{jpg,jpeg,png,webp}', { eager: true });

export function media(src: string): ImageMetadata {
  const f = files[`../assets/media/${src}`];
  if (!f) throw new Error(`Missing media file: ${src}`);
  return f.default;
}
