import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { searchIndex } from "@/lib/azure/ai-search";
import { generateEmbedding } from "@/lib/azure/embeddings";

export interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  updatedAt: Date;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  mode: "fulltext" | "semantic";
}

/**
 * Full-text search: Prisma LIKE locally, Azure AI Search full-text in production.
 */
export async function searchPages(
  query: string,
  opts: { tag?: string; limit?: number; offset?: number } = {}
): Promise<SearchResponse> {
  const { tag, limit = 20, offset = 0 } = opts;
  const q = query.trim();

  if (!q && !tag) {
    return { results: [], total: 0, mode: "fulltext" };
  }

  if (env.isAzureSearchConfigured() && q) {
    const filter = tag ? `tags/any(t: t eq '${tag.replace(/'/g, "''")}')` : undefined;
    const docs = await searchIndex(q, { top: limit, filter });
    const results: SearchResult[] = docs.map((d) => ({
      slug: d.slug,
      title: d.title,
      excerpt: extractExcerpt(d.content, q),
      tags: d.tags,
      updatedAt: new Date(d.updatedAt),
      score: 1,
    }));
    return { results, total: results.length, mode: "fulltext" };
  }

  // Local Prisma fallback
  const where = {
    ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
  };

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.page.count({ where }),
  ]);

  const results: SearchResult[] = pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    excerpt: extractExcerpt(page.content, q),
    tags: page.tags.map((pt) => pt.tag.name),
    updatedAt: page.updatedAt,
    score: computeScore(page.title, page.content, q),
  }));

  results.sort((a, b) => b.score - a.score);

  return { results, total, mode: "fulltext" };
}

/**
 * Semantic (vector) search: Azure AI Search only.
 * Falls back to full-text if Azure AI Search is not configured.
 */
export async function semanticSearch(
  query: string,
  opts: { limit?: number } = {}
): Promise<SearchResponse> {
  const { limit = 20 } = opts;
  const q = query.trim();

  if (!q) return { results: [], total: 0, mode: "semantic" };

  if (!env.isAzureSearchConfigured()) {
    // Fallback to full-text
    const ft = await searchPages(q, { limit });
    return { ...ft, mode: "semantic" };
  }

  const vector = await generateEmbedding(q);
  const docs = await searchIndex(q, { vector: vector ?? undefined, top: limit });

  const results: SearchResult[] = docs.map((d) => ({
    slug: d.slug,
    title: d.title,
    excerpt: d.content.substring(0, 200) + "…",
    tags: d.tags,
    updatedAt: new Date(d.updatedAt),
    score: 1,
  }));

  return { results, total: results.length, mode: "semantic" };
}

function extractExcerpt(content: string, query: string, maxLen = 200): string {
  if (!query) return content.substring(0, maxLen) + (content.length > maxLen ? "…" : "");

  const lower = content.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);

  if (idx === -1) {
    return content.substring(0, maxLen) + (content.length > maxLen ? "…" : "");
  }

  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + query.length + 140);
  const excerpt = content.substring(start, end);

  return (start > 0 ? "…" : "") + excerpt + (end < content.length ? "…" : "");
}

function computeScore(title: string, content: string, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  let score = 0;
  if (title.toLowerCase().includes(q)) score += 10;
  const contentMatches = (
    content
      .toLowerCase()
      .match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []
  ).length;
  score += contentMatches;
  return score;
}
