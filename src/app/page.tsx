import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { MainLayout } from "@/components/layout/main-layout";
import { PageContent } from "@/components/page-view/page-content";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { AiQuickAsk } from "@/components/dashboard/ai-quick-ask";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import GithubSlugger from "github-slugger";

async function getStats() {
  const [totalPages, totalTags, totalViews, recentPages] = await Promise.all([
    prisma.page.count(),
    prisma.tag.count(),
    prisma.pageView.count(),
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { slug: true, title: true, updatedAt: true },
    }),
  ]);
  return { totalPages, totalTags, totalViews, recentPages };
}

function extractToc(content: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const toc: { id: string; text: string; level: number }[] = [];
  const slugger = new GithubSlugger();
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    toc.push({ id: slugger.slug(match[2].trim()), text: match[2].trim(), level: match[1].length });
  }
  return toc;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function LandingPage() {
  const { totalPages, totalTags, totalViews, recentPages } = await getStats();

  const readmePath = path.join(process.cwd(), "content", "README.md");
  const raw = fs.readFileSync(readmePath, "utf-8");

  // Replace template placeholders with live data
  const readme = raw
    .replace(/\{\{APP_NAME\}\}/g, env.APP_NAME)
    .replace(/\{\{TOTAL_PAGES\}\}/g, String(totalPages))
    .replace(/\{\{TOTAL_TAGS\}\}/g, String(totalTags))
    .replace(/\{\{TOTAL_VIEWS\}\}/g, String(totalViews));

  const toc = extractToc(readme);

  return (
    <MainLayout showRightSidebar rightSidebarProps={{ toc, backlinks: [] }}>
      <article className="w-full">
        {/* Header — wiki page style */}
        <header className="mb-6 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--color-accent)]" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              README
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              system · pinned
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              always up-to-date
            </span>
          </div>
        </header>

        {/* README content */}
        <PageContent content={readme} />

        {/* AI Quick Ask */}
        <section className="mt-10 border-t border-[var(--color-border)] pt-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            // ai quick ask
          </h2>
          <AiQuickAsk />
        </section>

        {/* Recently updated */}
        {recentPages.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              // recently updated
            </h2>
            <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
              {recentPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)]"
                >
                  <span className="truncate text-sm text-[var(--color-text-primary)]">
                    {page.title}
                  </span>
                  <span className="ml-4 shrink-0 font-mono text-xs text-[var(--color-text-muted)]">
                    {timeAgo(page.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mobile right sidebar */}
        <RightSidebar toc={toc} backlinks={[]} mobileOnly />
      </article>
    </MainLayout>
  );
}
