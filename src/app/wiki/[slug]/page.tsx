import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MainLayout } from "@/components/layout/main-layout";
import { PageContent } from "@/components/page-view/page-content";
import { PageViewTracker } from "@/components/page-view/page-view-tracker";
import { LikeButton } from "@/components/page-view/like-button";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, Clock, User, Eye } from "lucide-react";

interface Props {
  params: { slug: string };
}

async function getPage(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, email: true } },
      tags: { include: { tag: true } },
      aiSummary: true,
      incomingLinks: {
        include: { sourcePage: { select: { slug: true, title: true } } },
      },
      _count: { select: { pageViews: true, likes: true } },
    },
  });
}

// Extract TOC from markdown content
function extractToc(content: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const toc: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    toc.push({ id, text, level });
  }
  return toc;
}

export default async function PageViewPage({ params }: Props) {
  const [page, session] = await Promise.all([getPage(params.slug), getServerSession(authOptions)]);

  if (!page) notFound();

  let isLikedByMe = false;
  if (session?.user?.id) {
    const like = await prisma.pageLike.findUnique({
      where: { pageId_userId: { pageId: page.id, userId: session.user.id } },
      select: { userId: true },
    });
    isLikedByMe = !!like;
  }

  const toc = extractToc(page.content);
  const backlinks = page.incomingLinks.map((l) => ({
    slug: l.sourcePage.slug,
    title: l.sourcePage.title,
  }));

  return (
    <MainLayout
      showRightSidebar
      rightSidebarProps={{
        toc,
        backlinks,
        aiSummary: page.aiSummary?.summary,
        isLoadingSummary: false,
        pageSlug: page.slug,
      }}
    >
      <article className="w-full">
        {/* Page header */}
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {page.title}
            </h1>
            <Link
              href={`/editor/${page.slug}`}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <Edit size={12} />
              Edit
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1">
              <User size={11} />
              {page.author.name}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(page.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {page._count.pageViews}
            </span>
            <LikeButton
              slug={page.slug}
              initialLiked={isLikedByMe}
              initialCount={page._count.likes}
            />
            <Link
              href={`/wiki/${page.slug}/history`}
              className="transition-colors duration-150 hover:text-[var(--color-accent)]"
            >
              History
            </Link>
          </div>

          {page.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {page.tags.map((pt) => (
                <Link key={pt.tagId} href={`/tags/${encodeURIComponent(pt.tag.name)}`}>
                  <Badge>{pt.tag.name}</Badge>
                </Link>
              ))}
            </div>
          )}
        </header>

        <PageViewTracker slug={page.slug} />

        {/* Page content */}
        <PageContent content={page.content} />

        {/* Mobile-only accordion (desktop handled by MainLayout's fixed aside) */}
        <RightSidebar
          toc={toc}
          backlinks={backlinks}
          aiSummary={page.aiSummary?.summary}
          pageSlug={page.slug}
          mobileOnly
        />
      </article>
    </MainLayout>
  );
}
