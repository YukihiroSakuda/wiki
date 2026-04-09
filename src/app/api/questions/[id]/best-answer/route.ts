import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/questions/[id]/best-answer — set best answer (question author only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const question = await prisma.question.findUnique({ where: { id: params.id } });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the question author can select best answer" }, { status: 403 });
  }

  const { answerId } = await req.json();
  if (!answerId) {
    return NextResponse.json({ error: "answerId is required" }, { status: 400 });
  }

  // Verify answer belongs to this question
  const answer = await prisma.answer.findFirst({
    where: { id: answerId, questionId: params.id },
  });
  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  const updated = await prisma.question.update({
    where: { id: params.id },
    data: { bestAnswerId: answerId, status: "answered" },
  });

  return NextResponse.json(updated);
}
