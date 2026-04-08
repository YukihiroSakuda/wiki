import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { AiQuickAsk } from "@/components/dashboard/ai-quick-ask";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import Link from "next/link";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="font-bold text-[var(--color-accent)]">{value}</div>
    </div>
  );
}

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

async function getDashboardData() {
  const [recentPages, popularPages] = await Promise.all([
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { tags: { include: { tag: true } } },
    }),
    prisma.page.findMany({
      orderBy: { pageViews: { _count: "desc" } },
      take: 10,
      include: {
        tags: { include: { tag: true } },
        _count: { select: { pageViews: true } },
      },
    }),
  ]);

  return { recentPages, popularPages };
}

export default async function DashboardPage() {
  const { recentPages, popularPages } = await getDashboardData();

  const totalPages = recentPages.length;
  const totalViews = popularPages.reduce((s, p) => s + p._count.pageViews, 0);

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-8">
        {/* HUD banner */}
        <div className="relative overflow-hidden rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] p-4 shadow-[0_0_30px_var(--color-accent-glow)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--color-accent) 1px, transparent 0)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent-glow)]" />
                system online
              </div>
              <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                <span className="text-[var(--color-accent)]">$</span> dashboard{" "}
                <span className="text-[var(--color-accent)]">--init</span>
              </h1>
              <p className="mt-1 font-mono text-[11px] text-[var(--color-text-muted)]">
                wiki kernel ready · press{" "}
                <kbd className="rounded border border-[var(--color-border)] px-1 text-[var(--color-accent)]">
                  ⌘K
                </kbd>{" "}
                to open command palette
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 font-mono text-[11px]">
              <Stat label="PAGES" value={totalPages} />
              <Stat label="VIEWS" value={totalViews} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            // dashboard
          </h2>
          <Link
            href="/editor"
            className="font-mono text-sm text-[var(--color-accent)] hover:underline"
          >
            + new-page
          </Link>
        </div>

        {/* Recently Updated */}
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            Recently Updated
          </h2>
          <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
            {recentPages.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">No pages yet.</p>
            ) : (
              recentPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText size={12} className="shrink-0 text-[var(--color-text-secondary)]" />
                    <span className="truncate text-sm text-[var(--color-text-primary)]">
                      {page.title}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {page.tags.slice(0, 2).map((pt) => (
                        <Badge key={pt.tagId}>{pt.tag.name}</Badge>
                      ))}
                    </span>
                  </span>
                  <span className="ml-4 shrink-0 text-sm text-[var(--color-text-secondary)]">
                    {timeAgo(new Date(page.updatedAt))}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Frequently Viewed */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
              Frequently Viewed
            </h2>
            <Link
              href="/ranking"
              className="font-mono text-sm text-[var(--color-accent)] hover:underline"
            >
              Full Ranking →
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
            {popularPages.filter((p) => p._count.pageViews > 0).length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">No views yet.</p>
            ) : (
              popularPages
                .filter((p) => p._count.pageViews > 0)
                .map((page) => (
                  <Link
                    key={page.slug}
                    href={`/wiki/${page.slug}`}
                    className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText size={12} className="shrink-0 text-[var(--color-text-secondary)]" />
                      <span className="truncate text-sm text-[var(--color-text-primary)]">
                        {page.title}
                      </span>
                    </span>
                    <span className="ml-4 shrink-0 text-sm text-[var(--color-text-secondary)]">
                      {page._count.pageViews} views
                    </span>
                  </Link>
                ))
            )}
          </div>
        </section>

        {/* AI Quick Ask */}
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            AI Quick Ask
          </h2>
          <AiQuickAsk />
        </section>
      </div>
    </MainLayout>
  );
}
