import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { PagesClient } from "@/components/pages/pages-client";

async function getInitialData() {
  const [pages, tags] = await Promise.all([
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        author: { select: { name: true } },
        _count: { select: { pageViews: true, likes: true } },
      },
    }),
    prisma.tag.findMany({
      include: { _count: { select: { pages: true } } },
      orderBy: { pages: { _count: "desc" } },
    }),
  ]);
  return { pages, tags };
}

export default async function PagesPage() {
  const { pages, tags } = await getInitialData();

  return (
    <MainLayout>
      <PagesClient
        initialPages={pages.map((p) => ({
          slug: p.slug,
          title: p.title,
          updatedAt: p.updatedAt.toISOString(),
          author: p.author,
          tags: p.tags,
          _count: p._count,
        }))}
        initialTotal={pages.length}
        allTags={tags.map((t) => ({ name: t.name, _count: t._count }))}
      />
    </MainLayout>
  );
}
