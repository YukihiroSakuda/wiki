import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import Link from "next/link";
import { Hash } from "lucide-react";

async function getAllTags() {
  return prisma.tag.findMany({
    include: { _count: { select: { pages: true } } },
    orderBy: { pages: { _count: "desc" } },
  });
}

export default async function TagsPage() {
  const allTags = await getAllTags();

  return (
    <MainLayout>
      <div className="max-w-3xl">
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            All Tags
          </h1>
          <p className="mt-1 font-mono text-sm text-[var(--color-text-muted)]">
            {allTags.length} tag{allTags.length !== 1 ? "s" : ""}
          </p>
        </header>

        {allTags.length === 0 ? (
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">No tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Link key={tag.name} href={`/tags/${encodeURIComponent(tag.name)}`}>
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                  <Hash size={11} />
                  {tag.name}
                  <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                    {tag._count.pages}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
