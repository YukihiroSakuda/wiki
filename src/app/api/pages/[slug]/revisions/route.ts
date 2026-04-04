import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/pages/[slug]/revisions
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const revisions = await prisma.revision.findMany({
      where: { pageId: page.id },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("GET /api/pages/[slug]/revisions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
