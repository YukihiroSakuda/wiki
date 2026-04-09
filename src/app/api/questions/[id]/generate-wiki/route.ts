import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getAzureClient, IS_AI_CONFIGURED } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { generateText } from "ai";
import { generateSlug, uniqueSlug } from "@/lib/slug";

// POST /api/questions/[id]/generate-wiki — generate wiki page from best answer
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true } },
      answers: { include: { author: { select: { name: true } } } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (!question.bestAnswerId) {
    return NextResponse.json({ error: "No best answer selected yet" }, { status: 400 });
  }

  // additionalAnswerIds: caller-selected answer IDs to supplement the best answer.
  // If omitted or empty, no supplementary answers are included.
  const body = await req.json().catch(() => ({}));
  const additionalAnswerIds: string[] = Array.isArray(body.additionalAnswerIds)
    ? body.additionalAnswerIds
    : [];

  type AnswerRow = { id: string; content: string };
  const bestAnswer = question.answers.find((a: AnswerRow) => a.id === question.bestAnswerId);
  if (!bestAnswer) {
    return NextResponse.json({ error: "Best answer not found" }, { status: 404 });
  }

  // Only include answers explicitly selected by the poster
  const otherAnswers = question.answers
    .filter((a: AnswerRow) => additionalAnswerIds.includes(a.id))
    .map((a: AnswerRow) => a.content);

  let wikiContent: string;

  if (IS_AI_CONFIGURED) {
    const azure = getAzureClient()!;
    const { text } = await generateText({
      model: azure(MODELS.GPT_CHAT),
      prompt: PROMPTS.qaToWiki(question.title, question.content, bestAnswer.content, otherAnswers),
      maxOutputTokens: 3000,
    });
    wikiContent = text.trim();
  } else {
    // Dev fallback: minimal template
    wikiContent = `# ${question.title}

## Overview

${question.content}

## Explanation

${bestAnswer.content}

> This page was auto-generated from a Q&A thread.
`;
  }

  // Create the wiki page
  const baseSlug = generateSlug(question.title);
  const slug = await uniqueSlug(baseSlug, async (s) => {
    const existing = await prisma.page.findUnique({ where: { slug: s }, select: { id: true } });
    return existing !== null;
  });

  // Extract title from generated content (first H1) or fall back to question title
  const titleMatch = wikiContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : question.title;

  await prisma.user.upsert({
    where: { id: session.user.id },
    update: { name: session.user.name ?? "Unknown", email: session.user.email ?? "" },
    create: {
      id: session.user.id,
      name: session.user.name ?? "Unknown",
      email: session.user.email ?? `${session.user.id}@unknown`,
    },
  });

  const page = await prisma.page.create({
    data: {
      slug,
      title,
      content: wikiContent,
      authorId: session.user.id,
      revisions: {
        create: { content: wikiContent, authorId: session.user.id },
      },
    },
  });

  return NextResponse.json({ slug: page.slug, title: page.title }, { status: 201 });
}
