import { prisma } from "@/lib/prisma";
import { extractWikiLinks } from "@/lib/slug";
import { syncPageToIndex, removePageFromIndex } from "@/lib/azure/index-sync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/pages/[slug]
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: params.slug },
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
        aiSummary: true,
        incomingLinks: {
          include: { sourcePage: { select: { slug: true, title: true } } },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("GET /api/pages/[slug] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/pages/[slug]
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, tags } = await req.json();

    const existing = await prisma.page.findUnique({ where: { slug: params.slug } });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Remove all existing tags and re-add
    await prisma.pageTag.deleteMany({ where: { pageId: existing.id } });

    const page = await prisma.page.update({
      where: { slug: params.slug },
      data: {
        ...(title && { title: title.trim() }),
        ...(content !== undefined && { content }),
        tags: tags
          ? {
              create: tags.map((tagName: string) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName.trim() },
                    create: { name: tagName.trim() },
                  },
                },
              })),
            }
          : undefined,
        revisions: {
          create: {
            content: content ?? existing.content,
            authorId: session.user.id,
          },
        },
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Update wiki links
    await updatePageLinks(page.id, page.content);

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

    return NextResponse.json(page);
  } catch (error) {
    console.error("PUT /api/pages/[slug] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/pages/[slug]
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await prisma.page.findUnique({ where: { slug: params.slug } });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await prisma.page.delete({ where: { slug: params.slug } });

    // Remove from Azure AI Search (non-blocking)
    removePageFromIndex(existing.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/pages/[slug] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updatePageLinks(pageId: string, content: string) {
  const linkedTitles = extractWikiLinks(content);
  await prisma.pageLink.deleteMany({ where: { sourcePageId: pageId } });
  if (linkedTitles.length === 0) return;

  const targetPages = await prisma.page.findMany({
    where: { title: { in: linkedTitles } },
    select: { id: true },
  });

  if (targetPages.length === 0) return;

  await prisma.pageLink.createMany({
    data: targetPages.map((tp) => ({ sourcePageId: pageId, targetPageId: tp.id })),
  });
}
