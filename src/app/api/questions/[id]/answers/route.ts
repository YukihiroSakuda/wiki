import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/questions/[id]/answers — add answer
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const question = await prisma.question.findUnique({ where: { id: params.id } });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Ensure user exists
  await prisma.user.upsert({
    where: { id: session.user.id },
    update: { name: session.user.name ?? "Unknown", email: session.user.email ?? "" },
    create: {
      id: session.user.id,
      name: session.user.name ?? "Unknown",
      email: session.user.email ?? `${session.user.id}@unknown`,
    },
  });

  const answer = await prisma.answer.create({
    data: {
      content: content.trim(),
      authorId: session.user.id,
      questionId: params.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(answer, { status: 201 });
}
