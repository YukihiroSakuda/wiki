import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tags
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");

  try {
    const tags = await prisma.tag.findMany({
      where: q ? { name: { contains: q } } : undefined,
      include: { _count: { select: { pages: true } } },
      orderBy: { pages: { _count: "desc" } },
      take: 20,
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("GET /api/tags error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
