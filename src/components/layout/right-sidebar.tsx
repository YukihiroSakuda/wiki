"use client";

import { cn } from "@/lib/utils";
import { Link, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface BacklinkItem {
  slug: string;
  title: string;
}

interface RightSidebarProps {
  toc?: TocItem[];
  backlinks?: BacklinkItem[];
  aiSummary?: string;
  isLoadingSummary?: boolean;
  pageSlug?: string;
  /** When true, only renders the mobile accordion (not the desktop fixed aside) */
  mobileOnly?: boolean;
}

export function RightSidebar({
  toc = [],
  backlinks = [],
  aiSummary: initialSummary,
  isLoadingSummary,
  pageSlug,
  mobileOnly = false,
}: RightSidebarProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [regenerating, setRegenerating] = useState(false);
  // Mobile accordion state
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const regenerateSummary = async () => {
    if (!pageSlug || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/pages/${pageSlug}/summary`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } finally {
      setRegenerating(false);
    }
  };

  const inner = (
    <div className="flex flex-col gap-4 p-3">
      {/* Table of Contents */}
      {toc.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            Contents
          </h3>
          <ul className="space-y-0.5">
            {toc.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "w-full cursor-pointer truncate rounded px-2 py-0.5 text-left text-sm",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "transition-colors duration-150 hover:bg-[var(--color-bg-surface)]",
                    item.level === 1 && "font-medium",
                    item.level === 2 && "pl-4",
                    item.level === 3 && "pl-6"
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            Backlinks
          </h3>
          <ul className="space-y-0.5">
            {backlinks.map((bl) => (
              <li key={bl.slug}>
                <NextLink
                  href={`/wiki/${bl.slug}`}
                  className={cn(
                    "flex items-center gap-1.5 truncate rounded px-2 py-0.5 text-sm",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]",
                    "transition-colors duration-150 hover:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <Link size={10} className="shrink-0" />
                  <span className="truncate">{bl.title}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI Summary */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            <Sparkles size={11} className="text-[var(--color-accent)]" />
            AI Summary
          </h3>
          {pageSlug && (
            <button
              type="button"
              onClick={regenerateSummary}
              disabled={regenerating}
              title="Regenerate summary"
              className="text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)] disabled:opacity-40"
            >
              <RefreshCw size={11} className={cn(regenerating && "animate-spin")} />
            </button>
          )}
        </div>
        {isLoadingSummary || regenerating ? (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-2.5 w-5/6 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-2.5 w-4/6 animate-pulse rounded bg-[var(--color-border)]" />
          </div>
        ) : summary ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{summary}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-[var(--color-text-muted)]">No summary yet.</p>
            {pageSlug && (
              <button
                type="button"
                onClick={regenerateSummary}
                className="self-start text-xs text-[var(--color-accent)] hover:underline"
              >
                Generate →
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed right sidebar (skip when mobileOnly) */}
      {!mobileOnly && (
        <aside
          className={cn(
            "fixed bottom-0 right-0 top-10 z-20 hidden w-60 flex-col sm:flex",
            "border-l border-[var(--color-border)] bg-[var(--color-bg-sidebar)]",
            "overflow-y-auto font-mono"
          )}
        >
          {inner}
        </aside>
      )}

      {/* Mobile: accordion below content */}
      <div className="mt-6 border-t border-[var(--color-border)] font-mono sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm text-[var(--color-text-secondary)]"
        >
          <span className="uppercase tracking-widest">Page Info</span>
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200", mobileOpen && "rotate-180")}
          />
        </button>
        {mobileOpen && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
            {inner}
          </div>
        )}
      </div>
    </>
  );
}
