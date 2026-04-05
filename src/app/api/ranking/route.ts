import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function getPeriodDate(period: string): Date | null {
  if (period === "week") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

async function getAuthorTotals(
  type: "views" | "likes",
  authorIds: string[],
  dateFrom: Date | null
): Promise<Map<string, number>> {
  const pages = await prisma.page.findMany({
    where: { authorId: { in: authorIds } },
    select: { id: true, authorId: true },
  });
  const pageToAuthor = new Map(pages.map((p) => [p.id, p.authorId]));
  const pageIds = pages.map((p) => p.id);
  const result = new Map<string, number>();

  if (type === "views") {
    const grouped = await prisma.pageView.groupBy({
      by: ["pageId"],
      where: { pageId: { in: pageIds }, ...(dateFrom ? { viewedAt: { gte: dateFrom } } : {}) },
      _count: { pageId: true },
    });
    for (const g of grouped) {
      const authorId = pageToAuthor.get(g.pageId);
      if (authorId) result.set(authorId, (result.get(authorId) ?? 0) + g._count.pageId);
    }
  } else {
    const grouped = await prisma.pageLike.groupBy({
      by: ["pageId"],
      where: { pageId: { in: pageIds }, ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}) },
      _count: { pageId: true },
    });
    for (const g of grouped) {
      const authorId = pageToAuthor.get(g.pageId);
      if (authorId) result.set(authorId, (result.get(authorId) ?? 0) + g._count.pageId);
    }
  }

  return result;
}

// GET /api/ranking?category=pages|authors&metric=views|likes|edits|count&period=all|week|month
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? "pages";
  const metric = searchParams.get("metric") ?? "views";
  const period = searchParams.get("period") ?? "all";
  const limit = 20;
  const dateFrom = getPeriodDate(period);

  try {
    // ── Page rankings ─────────────────────────────────────────────────────────
    if (category === "pages") {
      let topPageIds: string[] = [];

      if (metric === "views") {
        const grouped = await prisma.pageView.groupBy({
          by: ["pageId"],
          where: dateFrom ? { viewedAt: { gte: dateFrom } } : {},
          _count: { pageId: true },
          orderBy: { _count: { pageId: "desc" } },
          take: limit,
        });
        topPageIds = grouped.map((g) => g.pageId);
      } else if (metric === "likes") {
        const grouped = await prisma.pageLike.groupBy({
          by: ["pageId"],
          where: dateFrom ? { createdAt: { gte: dateFrom } } : {},
          _count: { pageId: true },
          orderBy: { _count: { pageId: "desc" } },
          take: limit,
        });
        topPageIds = grouped.map((g) => g.pageId);
      } else if (metric === "edits") {
        const grouped = await prisma.revision.groupBy({
          by: ["pageId"],
          where: dateFrom ? { createdAt: { gte: dateFrom } } : {},
          _count: { pageId: true },
          orderBy: { _count: { pageId: "desc" } },
          take: limit,
        });
        topPageIds = grouped.map((g) => g.pageId);
      }

      if (topPageIds.length === 0) return NextResponse.json({ items: [] });

      const pages = await prisma.page.findMany({
        where: { id: { in: topPageIds } },
        include: {
          author: { select: { name: true } },
          _count: { select: { pageViews: true, likes: true, revisions: true } },
        },
      });

      // Preserve rank order from groupBy
      const sorted = topPageIds
        .map((id) => pages.find((p) => p.id === id))
        .filter(Boolean) as typeof pages;

      return NextResponse.json({
        items: sorted.map((p) => ({
          slug: p.slug,
          title: p.title,
          author: p.author,
          viewCount: p._count.pageViews,
          likeCount: p._count.likes,
          editCount: p._count.revisions,
          updatedAt: p.updatedAt.toISOString(),
        })),
      });
    }

    // ── Author rankings ───────────────────────────────────────────────────────
    if (category === "authors") {
      if (metric === "count") {
        const users = await prisma.user.findMany({
          where: { pages: { some: {} } },
          include: { _count: { select: { pages: true } } },
          orderBy: { pages: { _count: "desc" } },
          take: limit,
        });
        const userIds = users.map((u) => u.id);
        const [viewData, likeData] = await Promise.all([
          getAuthorTotals("views", userIds, null),
          getAuthorTotals("likes", userIds, null),
        ]);

        return NextResponse.json({
          items: users.map((u) => ({
            id: u.id,
            name: u.name,
            avatarUrl: u.avatarUrl,
            pageCount: u._count.pages,
            totalViews: viewData.get(u.id) ?? 0,
            totalLikes: likeData.get(u.id) ?? 0,
          })),
        });
      }

      if (metric === "views" || metric === "likes") {
        const allPages = await prisma.page.findMany({ select: { id: true, authorId: true } });
        const pageToAuthor = new Map(allPages.map((p) => [p.id, p.authorId]));

        let countsByPage: Map<string, number>;
        if (metric === "views") {
          const grouped = await prisma.pageView.groupBy({
            by: ["pageId"],
            where: dateFrom ? { viewedAt: { gte: dateFrom } } : {},
            _count: { pageId: true },
          });
          countsByPage = new Map(grouped.map((g) => [g.pageId, g._count.pageId]));
        } else {
          const grouped = await prisma.pageLike.groupBy({
            by: ["pageId"],
            where: dateFrom ? { createdAt: { gte: dateFrom } } : {},
            _count: { pageId: true },
          });
          countsByPage = new Map(grouped.map((g) => [g.pageId, g._count.pageId]));
        }

        const authorTotals = new Map<string, number>();
        countsByPage.forEach((count, pageId) => {
          const authorId = pageToAuthor.get(pageId);
          if (authorId) authorTotals.set(authorId, (authorTotals.get(authorId) ?? 0) + count);
        });

        const topAuthorIds = Array.from(authorTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id);

        if (topAuthorIds.length === 0) return NextResponse.json({ items: [] });

        const users = await prisma.user.findMany({
          where: { id: { in: topAuthorIds } },
          include: { _count: { select: { pages: true } } },
        });
        const [viewData, likeData] = await Promise.all([
          getAuthorTotals("views", topAuthorIds, null),
          getAuthorTotals("likes", topAuthorIds, null),
        ]);

        const sorted = topAuthorIds
          .map((id) => users.find((u) => u.id === id))
          .filter(Boolean) as typeof users;

        return NextResponse.json({
          items: sorted.map((u) => ({
            id: u.id,
            name: u.name,
            avatarUrl: u.avatarUrl,
            pageCount: u._count.pages,
            totalViews: viewData.get(u.id) ?? 0,
            totalLikes: likeData.get(u.id) ?? 0,
          })),
        });
      }
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("GET /api/ranking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
