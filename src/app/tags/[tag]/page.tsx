import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, FileText } from "lucide-react";

interface Props {
  params: { tag: string };
}

async function getData(tagName: string) {
  return prisma.tag.findUnique({
    where: { name: tagName },
    include: {
      pages: {
        include: {
          page: {
            include: {
              author: { select: { name: true } },
              tags: { include: { tag: true } },
            },
          },
        },
        orderBy: { page: { updatedAt: "desc" } },
      },
    },
  });
}

export default async function TagDetailPage({ params }: Props) {
  const tagName = decodeURIComponent(params.tag);
  const tag = await getData(tagName);

  if (!tag) notFound();

  return (
    <MainLayout>
      <div className="max-w-3xl">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            #{tag.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-[var(--color-text-muted)]">
            {tag.pages.length} page{tag.pages.length !== 1 ? "s" : ""}
          </p>
        </header>

        {tag.pages.length === 0 ? (
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">
            No pages with this tag.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {tag.pages.map(({ page }) => (
              <li key={page.slug}>
                <Link
                  href={`/wiki/${page.slug}`}
                  className="block rounded px-1 py-4 transition-colors duration-100 hover:bg-[var(--color-bg-hover)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                      <h2 className="font-mono text-md font-bold leading-tight text-[var(--color-text-primary)]">
                        {page.title}
                      </h2>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-xs text-[var(--color-text-muted)]">
                      <Clock size={11} />
                      {new Date(page.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="ml-5 mt-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    by {page.author.name}
                  </p>

                  {page.tags.length > 1 && (
                    <div className="ml-5 mt-2 flex flex-wrap gap-1">
                      {page.tags.map((pt) => (
                        <Badge key={pt.tagId}>{pt.tag.name}</Badge>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MainLayout>
  );
}
