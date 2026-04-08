"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, ThumbsUp, GitCommit, FileText } from "lucide-react";

type PageRankItem = {
  slug: string;
  title: string;
  author: { name: string };
  viewCount: number;
  likeCount: number;
  editCount: number;
  updatedAt: string;
};

type AuthorRankItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  pageCount: number;
  totalViews: number;
  totalLikes: number;
};

type Category = "pages" | "authors";
type PageMetric = "views" | "likes" | "edits";
type AuthorMetric = "count" | "views" | "likes";
type Period = "all" | "month" | "week";

const PAGE_METRICS: { value: PageMetric; label: string }[] = [
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "edits", label: "Edits" },
];

const AUTHOR_METRICS: { value: AuthorMetric; label: string }[] = [
  { value: "count", label: "Pages Created" },
  { value: "views", label: "Total Views" },
  { value: "likes", label: "Total Likes" },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

export function RankingClient() {
  const [category, setCategory] = useState<Category>("pages");
  const [pageMetric, setPageMetric] = useState<PageMetric>("views");
  const [authorMetric, setAuthorMetric] = useState<AuthorMetric>("count");
  const [period, setPeriod] = useState<Period>("all");
  const [items, setItems] = useState<PageRankItem[] | AuthorRankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const metric = category === "pages" ? pageMetric : authorMetric;

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ranking?category=${category}&metric=${metric}&period=${period}`
      );
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [category, metric, period]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const tabBtn = (active: boolean) =>
    `px-4 py-2 text-sm transition-colors duration-150 ${
      active
        ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    }`;

  const filterBtn = (active: boolean) =>
    `rounded px-3 py-1 text-sm transition-colors duration-150 ${
      active
        ? "bg-[var(--color-accent)] text-white"
        : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    }`;

  const periodBtn = (active: boolean) =>
    `rounded px-3 py-1 text-sm transition-colors duration-150 ${
      active
        ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    }`;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Ranking</h1>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button className={tabBtn(category === "pages")} onClick={() => setCategory("pages")}>
          Pages
        </button>
        <button className={tabBtn(category === "authors")} onClick={() => setCategory("authors")}>
          Authors
        </button>
      </div>

      {/* Metric + Period row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {(category === "pages" ? PAGE_METRICS : AUTHOR_METRICS).map(({ value, label }) => (
            <button
              key={value}
              className={filterBtn(metric === value)}
              onClick={() => {
                if (category === "pages") setPageMetric(value as PageMetric);
                else setAuthorMetric(value as AuthorMetric);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              className={periodBtn(period === value)}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-[var(--color-bg-sidebar)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No data yet.</p>
      ) : category === "pages" ? (
        <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
          {(items as PageRankItem[]).map((item, i) => (
            <Link
              key={item.slug}
              href={`/wiki/${item.slug}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)]"
            >
              <span className="w-6 shrink-0 text-right text-sm font-bold text-[var(--color-text-secondary)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[var(--color-text-primary)]">
                  {item.title}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  by {item.author?.name ?? "unknown"}
                </span>
              </span>
              <span className="flex shrink-0 gap-3 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <Eye size={11} />
                  {item.viewCount}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp size={11} />
                  {item.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <GitCommit size={11} />
                  {item.editCount}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)]">
          {(items as AuthorRankItem[]).map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 px-4 py-3">
              <span className="w-6 shrink-0 text-right text-sm font-bold text-[var(--color-text-secondary)]">
                {i + 1}
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-bg-surface)] text-xs font-medium text-[var(--color-text-secondary)]">
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl} alt={item.name} className="h-8 w-8 object-cover" />
                ) : (
                  (item.name?.charAt(0) ?? "?").toUpperCase()
                )}
              </div>
              <span className="min-w-0 flex-1 text-sm text-[var(--color-text-primary)]">
                {item.name}
              </span>
              <span className="flex shrink-0 gap-3 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {item.pageCount}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={11} />
                  {item.totalViews}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp size={11} />
                  {item.totalLikes}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
