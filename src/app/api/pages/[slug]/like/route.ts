import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/pages/[slug]/like — toggle like
export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await prisma.page.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.pageLike.findUnique({
    where: { pageId_userId: { pageId: page.id, userId: session.user.id } },
  });

  if (existing) {
    await prisma.pageLike.delete({
      where: { pageId_userId: { pageId: page.id, userId: session.user.id } },
    });
  } else {
    await prisma.pageLike.create({ data: { pageId: page.id, userId: session.user.id } });
  }

  const count = await prisma.pageLike.count({ where: { pageId: page.id } });
  return NextResponse.json({ liked: !existing, count });
}
