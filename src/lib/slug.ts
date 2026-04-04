/**
 * Generate a URL-safe slug from a title.
 * Supports Japanese and other Unicode characters via transliteration.
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, "-")
      // Remove characters that are not alphanumeric, hyphens, or common CJK ranges
      .replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF-]/g, "")
      // Collapse multiple hyphens
      .replace(/-+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, "") ||
    // Fallback if empty
    `page-${Date.now()}`
  );
}

/**
 * Ensure slug is unique by appending a counter if needed.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = base;
  let counter = 1;
  while (await exists(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

/**
 * Extract [[wiki links]] from Markdown content.
 */
export function extractWikiLinks(content: string): string[] {
  const results: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}
