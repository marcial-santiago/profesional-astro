/**
 * Application configuration
 * 
 * STRAPI_URL - URL of the Strapi CMS instance
 * STRIPE_API_URL - URL of the Astro API (for Stripe endpoints)
 */

export const STRAPI_URL =
  (typeof process !== 'undefined' ? process.env.STRAPI_URL : undefined) ||
  import.meta.env.STRAPI_URL || 'http://localhost:1337';

export const STRIPE_API_URL =
  (typeof process !== 'undefined' ? process.env.STRIPE_API_URL : undefined) ||
  import.meta.env.STRIPE_API_URL || 'http://localhost:4321';

// Public URL used in rendered HTML for images/assets. In Docker production,
// STRAPI_URL is an internal service URL (http://strapi:1337), while browsers
// should use the Nginx same-origin proxy (/strapi).
export const STRAPI_PUBLIC_URL =
  (typeof process !== 'undefined' ? process.env.PUBLIC_STRAPI_URL : undefined) ||
  import.meta.env.PUBLIC_STRAPI_URL || STRAPI_URL;

/**
 * Resolve a Strapi image URL to an absolute URL.
 * Strapi returns relative paths like "/uploads/image.webp" or full URLs.
 */
export function strapiImage(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STRAPI_PUBLIC_URL}${url}`;
}

export interface StrapiMediaRaw {
  url?: string | null;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, { url?: string | null; width?: number; height?: number }>;
}

export interface StrapiMedia {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  formats?: Record<string, { url: string; width?: number; height?: number }>;
}

export function normalizeStrapiMedia(media: StrapiMediaRaw | null | undefined, fallbackAlt = ''): StrapiMedia | null {
  const rawUrl = media?.url;
  const url = strapiImage(rawUrl);
  if (!url) return null;

  const formats = media?.formats
    ? Object.fromEntries(
        Object.entries(media.formats)
          .map(([key, format]) => {
            const fUrl = strapiImage(format?.url);
            if (!fUrl) return null;
            return [key, { url: fUrl, width: format?.width, height: format?.height }];
          })
          .filter((entry): entry is [string, { url: string; width?: number; height?: number }] => !!entry)
      )
    : undefined;

  return {
    url,
    alt: media?.alternativeText || fallbackAlt,
    width: media?.width || undefined,
    height: media?.height || undefined,
    formats,
  };
}

export function strapiQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  return search.toString();
}
