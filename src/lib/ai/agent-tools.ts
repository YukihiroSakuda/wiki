import { tool } from "ai";
import { z } from "zod";
import { searchPages, semanticSearch } from "@/lib/search";
import { prisma } from "@/lib/prisma";

/**
 * Tools available to the agentic RAG chat.
 */
export const agentTools = {
  searchWiki: tool({
    description:
      "Search the wiki for pages matching a query. Use 'semantic' mode for meaning-based search, 'keyword' for exact matches, or 'hybrid' for both. Always try searching before answering factual questions about the wiki.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      mode: z
        .enum(["semantic", "keyword", "hybrid"])
        .default("hybrid")
        .describe("Search mode"),
    }),
    execute: async ({ query, mode }) => {
      try {
        if (mode === "semantic") {
          const { results } = await semanticSearch(query, { limit: 5 });
          return formatSearchResults(results);
        }
        if (mode === "keyword") {
          const { results } = await searchPages(query, { limit: 5 });
          return formatSearchResults(results);
        }
        // hybrid: run both and deduplicate
        const [semantic, keyword] = await Promise.all([
          semanticSearch(query, { limit: 3 }),
          searchPages(query, { limit: 3 }),
        ]);
        const seen = new Set<string>();
        const merged = [...semantic.results, ...keyword.results].filter((r) => {
          if (seen.has(r.slug)) return false;
          seen.add(r.slug);
          return true;
        });
        return formatSearchResults(merged.slice(0, 5));
      } catch (err) {
        return `Search failed: ${err instanceof Error ? err.message : "unknown error"}`;
      }
    },
  }),

  fetchPage: tool({
    description:
      "Fetch the full content of a specific wiki page by its slug. Use this when you need detailed information from a page found via search.",
    inputSchema: z.object({
      slug: z.string().describe("The page slug (URL identifier)"),
    }),
    execute: async ({ slug }) => {
      try {
        const page = await prisma.page.findUnique({
          where: { slug },
          include: { tags: { include: { tag: true } } },
        });
        if (!page) return `Page not found: ${slug}`;
        const tags = page.tags.map((pt) => pt.tag.name).join(", ");
        const content =
          page.content.length > 4000
            ? page.content.substring(0, 4000) + "\n\n[...truncated]"
            : page.content;
        return `# ${page.title}\nSlug: ${slug}\nTags: ${tags || "none"}\nUpdated: ${page.updatedAt.toISOString().split("T")[0]}\n\n${content}`;
      } catch (err) {
        return `Failed to fetch page: ${err instanceof Error ? err.message : "unknown error"}`;
      }
    },
  }),

  listPages: tool({
    description:
      "List all wiki pages with their titles and slugs. Use this to get an overview of available content or when search returns no results.",
    inputSchema: z.object({
      limit: z.number().default(20).describe("Maximum number of pages to return"),
    }),
    execute: async ({ limit }) => {
      try {
        const pages = await prisma.page.findMany({
          select: { slug: true, title: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: limit,
        });
        if (pages.length === 0) return "No pages found in the wiki.";
        return pages
          .map(
            (p) =>
              `- [${p.title}](slug:${p.slug}) (updated ${p.updatedAt.toISOString().split("T")[0]})`
          )
          .join("\n");
      } catch (err) {
        return `Failed to list pages: ${err instanceof Error ? err.message : "unknown error"}`;
      }
    },
  }),
};

function formatSearchResults(
  results: { slug: string; title: string; excerpt: string }[]
): string {
  if (results.length === 0) return "No results found.";
  return results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}** (slug: ${r.slug})\n   ${r.excerpt.substring(0, 200)}`
    )
    .join("\n\n");
}
