import { searchPages } from "@/lib/search";
import { searchIndex } from "@/lib/azure/ai-search";
import { generateEmbedding } from "@/lib/azure/embeddings";
import { env } from "@/lib/env";

export interface RagContext {
  contextText: string;
  sources: { slug: string; title: string }[];
}

/**
 * Build RAG context for a user query.
 * Uses Azure AI Search vector search when configured, falls back to Prisma LIKE.
 */
export async function buildRagContext(query: string): Promise<RagContext> {
  let sources: { slug: string; title: string }[] = [];
  let contextText = "";

  if (env.isAzureSearchConfigured()) {
    // Hybrid search: vector + full-text
    const vector = await generateEmbedding(query);
    const docs = await searchIndex(query, { vector: vector ?? undefined, top: 5 });

    sources = docs.map((d) => ({ slug: d.slug, title: d.title }));
    contextText = docs
      .map((d) => `## ${d.title}\n${d.content.substring(0, 1500)}`)
      .join("\n\n---\n\n");
  } else {
    // Local fallback: Prisma LIKE search
    const { results } = await searchPages(query, { limit: 5 });
    sources = results.map((r) => ({ slug: r.slug, title: r.title }));
    contextText = results.map((r) => `## ${r.title}\n${r.excerpt}`).join("\n\n---\n\n");
  }

  return { contextText, sources };
}
