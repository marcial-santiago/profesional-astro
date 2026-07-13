/**
 * Convert a string to a URL-friendly slug.
 * "Residential Cleaning" → "residential-cleaning"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')       // Remove non-word chars
    .replace(/[\s_]+/g, '-')        // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');       // Trim leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if collision exists.
 */
export async function generateUniqueSlug(
  baseName: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = slugify(baseName);
  let counter = 1;

  while (await exists(slug)) {
    slug = `${slugify(baseName)}-${counter}`;
    counter++;
  }

  return slug;
}
