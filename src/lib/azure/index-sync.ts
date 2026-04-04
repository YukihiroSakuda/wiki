import { indexPage, deletePageFromIndex, WikiPageDocument } from "./ai-search";
import { generateEmbedding } from "./embeddings";

interface PageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  authorName: string;
  updatedAt: Date;
}

/**
 * Sync a page to Azure AI Search index (fire-and-forget safe).
 * Call after page create/update.
 */
export async function syncPageToIndex(page: PageData): Promise<void> {
  try {
    const embedText = `${page.title}\n\n${page.content}`.substring(0, 8000);
    const vector = await generateEmbedding(embedText);

    const doc: WikiPageDocument = {
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content.substring(0, 10000),
      tags: page.tags,
      authorName: page.authorName,
      updatedAt: page.updatedAt.toISOString(),
      ...(vector ? { contentVector: vector } : {}),
    };

    await indexPage(doc);
  } catch (err) {
    // Non-critical — log and continue
    console.error("syncPageToIndex error:", err);
  }
}

/**
 * Remove a page from Azure AI Search index.
 * Call after page delete.
 */
export async function removePageFromIndex(pageId: string): Promise<void> {
  try {
    await deletePageFromIndex(pageId);
  } catch (err) {
    console.error("removePageFromIndex error:", err);
  }
}
