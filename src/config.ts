/**
 * Application configuration
 * 
 * STRAPI_URL - URL of the Strapi CMS instance
 * STRIPE_API_URL - URL of the Astro API (for Stripe endpoints)
 */

export const STRAPI_URL =
  import.meta.env.STRAPI_URL || 'http://localhost:1337';

export const STRIPE_API_URL =
  import.meta.env.STRIPE_API_URL || 'http://localhost:4321';

/**
 * Resolve a Strapi image URL to an absolute URL.
 * Strapi returns relative paths like "/uploads/image.webp" or full URLs.
 */
export function strapiImage(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}
