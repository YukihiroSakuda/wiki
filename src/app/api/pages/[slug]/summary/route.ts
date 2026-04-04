import { prisma } from "@/lib/prisma";
import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";

// POST /api/pages/[slug]/summary — generate or regenerate AI summary
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const page = await prisma.page.findUnique({
      where: { slug: params.slug },
      select: { id: true, title: true, content: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    let summary: string;

    if (IS_AI_CONFIGURED) {
      const azure = getAzureClient()!;
      const result = await generateText({
        model: azure(MODELS.GPT_FAST),
        prompt: PROMPTS.summary(page.title, page.content),
        maxOutputTokens: 200,
      });
      summary = result.text.trim();
    } else {
      // Mock summary for local dev
      summary = `This page covers "${page.title}". It contains ${page.content.split("\n").length} lines of documentation. [AI summary unavailable — configure AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY]`;
    }

    // Upsert AISummary
    const aiSummary = await prisma.aISummary.upsert({
      where: { pageId: page.id },
      update: { summary },
      create: { pageId: page.id, summary },
    });

    return NextResponse.json({ summary: aiSummary.summary });
  } catch (error) {
    console.error("POST /api/pages/[slug]/summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

// GET /api/pages/[slug]/summary
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: params.slug },
      include: { aiSummary: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ summary: page.aiSummary?.summary ?? null });
  } catch (error) {
    console.error("GET /api/pages/[slug]/summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
