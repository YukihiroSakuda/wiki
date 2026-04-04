import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import Link from "next/link";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SortKey = "updated" | "created" | "title";

interface Props {
  searchParams: { sort?: string; tag?: string };
}

async function getPages(sort: SortKey, tag?: string) {
  const orderBy =
    sort === "title"
      ? { title: "asc" as const }
      : sort === "created"
        ? { createdAt: "desc" as const }
        : { updatedAt: "desc" as const };

  return prisma.page.findMany({
    where: tag
      ? { tags: { some: { tag: { name: tag } } } }
      : undefined,
    orderBy,
    include: {
      tags: { include: { tag: true } },
      author: { select: { name: true } },
      _count: { select: { pageViews: true } },
    },
  });
}

export default async function PagesPage({ searchParams }: Props) {
  const sort = (searchParams.sort as SortKey) ?? "updated";
  const tag = searchParams.tag;
  const pages = await getPages(sort, tag);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "updated", label: "Updated" },
    { key: "created", label: "Created" },
    { key: "title", label: "Title A–Z" },
  ];

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              All Pages
            </h1>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]">
              {pages.length} page{pages.length !== 1 ? "s" : ""}
              {tag && (
                <>
                  {" "}
                  tagged{" "}
                  <span className="text-[var(--color-accent)]">#{tag}</span>
                  {" — "}
                  <Link href="/pages" className="underline">
                    clear
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Sort + New */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-muted)]">
              Sort:
              {sortOptions.map((o) => (
                <Link
                  key={o.key}
                  href={`/pages?sort=${o.key}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                  className={
                    sort === o.key
                      ? "text-[var(--color-accent)]"
                      : "hover:text-[var(--color-text-primary)]"
                  }
                >
                  {o.label}
                </Link>
              ))}
            </div>
            <Link
              href="/new"
              className="font-mono text-sm text-[var(--color-accent)] hover:underline"
            >
              + New
            </Link>
          </div>
        </div>

        {/* Page list */}
        <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
          {pages.length === 0 ? (
            <p className="px-4 py-6 text-center font-mono text-sm text-[var(--color-text-secondary)]">
              No pages yet.{" "}
              <Link href="/new" className="text-[var(--color-accent)] hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            pages.map((page) => (
              <Link
                key={page.slug}
                href={`/wiki/${page.slug}`}
                className="flex items-start justify-between gap-4 px-4 py-3 transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="shrink-0 text-[var(--color-text-secondary)]" />
                    <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {page.title}
                    </span>
                  </div>
                  {page.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 pl-[22px]">
                      {page.tags.map((pt) => (
                        <Badge key={pt.tagId}>{pt.tag.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono text-xs text-[var(--color-text-muted)]">
                  <div>{timeAgo(new Date(page.updatedAt))}</div>
                  <div className="mt-0.5">{page.author.name}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
