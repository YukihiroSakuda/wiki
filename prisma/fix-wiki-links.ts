/**
 * Fix wiki links in AI pages to match actual slugs.
 * transformWikiLinks uses generateSlug logic (removes special chars, lowercase).
 * So [[Title]] must produce the same slug as the target page's actual slug.
 */
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// Matches generateSlug() and the fixed titleToSlug() in page-content.tsx
function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}

// Map: actual slug → wiki link title that resolves to it via titleToSlug()
// titleToSlug("LLM Overview")       = "llm-overview"         ✓
// titleToSlug("AI Agents")          = "ai-agents"            ✓
// titleToSlug("RAG")                = "rag"                  ✗ (slug is rag-retrieval-augmented-generation)
// → use "RAG 検索拡張生成" to get rag-検索拡張生成? No, use explicit title below
const LINK_MAP: Record<string, string> = {
  "llm-overview":                       "LLM Overview",
  "ai-agents":                          "AI Agents",
  "rag-retrieval-augmented-generation": "RAG Retrieval Augmented Generation",
  "prompt-engineering":                 "Prompt Engineering",
  "multimodal-ai":                      "Multimodal AI",
};

// Verify our mapping is correct
for (const [slug, title] of Object.entries(LINK_MAP)) {
  const computed = titleToSlug(title);
  if (computed !== slug) {
    console.error(`MISMATCH: "${title}" → "${computed}" (expected "${slug}")`);
    process.exit(1);
  }
}
console.log("✓ Link map verified");

// Old Japanese link titles → new English link titles
const REPLACE: Record<string, string> = {
  "LLM（大規模言語モデル）概要": LINK_MAP["llm-overview"],
  "AIエージェント":              LINK_MAP["ai-agents"],
  "RAG（検索拡張生成）":         LINK_MAP["rag-retrieval-augmented-generation"],
  "プロンプトエンジニアリング":  LINK_MAP["prompt-engineering"],
  "マルチモーダルAI":            LINK_MAP["multimodal-ai"],
};

async function main() {
  const slugs = Object.keys(LINK_MAP);
  const pages = await prisma.page.findMany({ where: { slug: { in: slugs } } });

  for (const page of pages) {
    let updated = page.content;
    for (const [oldTitle, newTitle] of Object.entries(REPLACE)) {
      updated = updated.replaceAll(`[[${oldTitle}]]`, `[[${newTitle}]]`);
    }
    if (updated !== page.content) {
      await prisma.page.update({ where: { id: page.id }, data: { content: updated } });
      console.log(`  更新: ${page.title}`);
    }
  }
  console.log("✓ Wiki links 修正完了");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
