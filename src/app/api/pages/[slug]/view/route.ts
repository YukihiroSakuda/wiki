import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/pages/[slug]/view — record a page view (deduplicated per 30 min)
export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false });

  const page = await prisma.page.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ ok: false });

  const since = new Date(Date.now() - 30 * 60 * 1000);
  const recent = await prisma.pageView.findFirst({
    where: { pageId: page.id, userId: session.user.id, viewedAt: { gte: since } },
    select: { id: true },
  });

  if (!recent) {
    await prisma.pageView.create({ data: { pageId: page.id, userId: session.user.id } });
  }

  return NextResponse.json({ ok: true });
}
