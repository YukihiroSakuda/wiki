import { prisma } from "@/lib/prisma";
import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";

// POST /api/pages/[slug]/suggest-tags
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const page = await prisma.page.findUnique({
      where: { slug: params.slug },
      select: { title: true, content: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const existingTags = await prisma.tag.findMany({
      select: { name: true },
      orderBy: { pages: { _count: "desc" } },
      take: 50,
    });

    const existingTagNames = existingTags.map((t) => t.name);

    let suggested: string[];

    if (IS_AI_CONFIGURED) {
      const azure = getAzureClient()!;
      const result = await generateText({
        model: azure(MODELS.GPT_FAST),
        prompt: PROMPTS.suggestTags(page.title, page.content, existingTagNames),
        maxOutputTokens: 100,
      });

      try {
        const raw = result.text.trim();
        // Extract JSON array from response
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        suggested = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        suggested = suggested.filter((t) => typeof t === "string").slice(0, 5);
      } catch {
        suggested = [];
      }
    } else {
      // Mock suggestions for local dev
      const words = page.title.toLowerCase().split(/\s+/);
      suggested = words
        .filter((w) => w.length > 3)
        .slice(0, 3)
        .map((w) => w.replace(/[^a-z0-9-]/g, ""));
    }

    return NextResponse.json({ tags: suggested });
  } catch (error) {
    console.error("POST /api/pages/[slug]/suggest-tags error:", error);
    return NextResponse.json({ error: "Failed to suggest tags" }, { status: 500 });
  }
}
