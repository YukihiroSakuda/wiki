import { prisma } from "@/lib/prisma";
import { generateSlug, uniqueSlug, extractWikiLinks } from "@/lib/slug";
import { syncPageToIndex } from "@/lib/azure/index-sync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/pages — list pages
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") ?? "recent";
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    const where = {
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
      ...(q ? { title: { contains: q } } : {}),
    };

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        include: {
          author: { select: { name: true, email: true } },
          tags: { include: { tag: true } },
          _count: { select: { pageViews: true } },
        },
        orderBy: sort === "views" ? { pageViews: { _count: "desc" } } : { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.page.count({ where }),
    ]);

    return NextResponse.json({ pages, total });
  } catch (error) {
    console.error("GET /api/pages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/pages — create page
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content = "", tags = [] } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Ensure user exists in DB
    await prisma.user.upsert({
      where: { email: session.user.email! },
      update: { name: session.user.name ?? "Unknown" },
      create: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name ?? "Unknown",
      },
    });

    // Generate unique slug
    const baseSlug = generateSlug(title.trim());
    const slug = await uniqueSlug(baseSlug, async (s) => {
      const existing = await prisma.page.findUnique({ where: { slug: s } });
      return !!existing;
    });

    // Create page with tags and revision
    const page = await prisma.page.create({
      data: {
        slug,
        title: title.trim(),
        content,
        authorId: session.user.id,
        tags: {
          create: tags.map((tagName: string) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName.trim() },
                create: { name: tagName.trim() },
              },
            },
          })),
        },
        revisions: {
          create: { content, authorId: session.user.id },
        },
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Update wiki links
    await updatePageLinks(page.id, content);

    // Sync to Azure AI Search (non-blocking)
    syncPageToIndex({
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      tags: page.tags.map((pt) => pt.tag.name),
      authorName: session.user.name ?? "Unknown",
      updatedAt: page.updatedAt,
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("POST /api/pages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updatePageLinks(pageId: string, content: string) {
  const linkedTitles = extractWikiLinks(content);

  // Delete existing outgoing links
  await prisma.pageLink.deleteMany({ where: { sourcePageId: pageId } });

  if (linkedTitles.length === 0) return;

  // Find target pages by title
  const targetPages = await prisma.page.findMany({
    where: { title: { in: linkedTitles } },
    select: { id: true },
  });

  if (targetPages.length === 0) return;

  await prisma.pageLink.createMany({
    data: targetPages.map((tp) => ({
      sourcePageId: pageId,
      targetPageId: tp.id,
    })),
  });
}
