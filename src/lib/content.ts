// Content exported from the old WordPress database (scripts/extract_content.py) and the
// live site's <head> (scripts/extract_seo.py).
import siteData from '../data/site.json';
import seoData from '../data/seo.json';

export type Img = { src: string; width: number | null; height: number | null; alt: string };
export type Point = { title: string; description: string };
export type Page = {
  id: number;
  key: string;
  path: string;
  title: string;
  content: string;
  fields: Record<string, any>;
};

const pages = import.meta.glob<Page>('../data/pages/*.json', { eager: true, import: 'default' });

export const site = siteData;
export const seo = seoData as Record<string, any>;

export function getPage(key: string): Page {
  const p = pages[`../data/pages/${key}.json`];
  if (!p) throw new Error(`No content for page "${key}"`);
  return p;
}

/** Every "#" button on the old site was meant to take you to the enquiry form. */
export const ENQUIRY = '#get-in-touch';
