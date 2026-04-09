import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/questions — list questions
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status"); // open, answered, all
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where = status && status !== "all" ? { status } : {};

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({ questions, total });
}

// POST /api/questions — create question
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  // Ensure user exists in DB
  await prisma.user.upsert({
    where: { id: session.user.id },
    update: { name: session.user.name ?? "Unknown", email: session.user.email ?? "" },
    create: {
      id: session.user.id,
      name: session.user.name ?? "Unknown",
      email: session.user.email ?? `${session.user.id}@unknown`,
    },
  });

  const question = await prisma.question.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(question, { status: 201 });
}
