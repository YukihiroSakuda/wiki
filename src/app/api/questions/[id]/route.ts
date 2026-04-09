import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/questions/[id] — question detail with answers
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      answers: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}
