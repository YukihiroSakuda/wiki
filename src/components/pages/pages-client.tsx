"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Eye,
  ThumbsUp,
  FileText,
  Search,
  Zap,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageItem {
  slug: string;
  title: string;
  updatedAt: string;
  author: { name: string };
  tags: { tag: { name: string } }[];
  _count: { pageViews: number; likes: number };
}

interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  updatedAt: string;
  score: number;
}

interface TagItem {
  name: string;
  _count: { pages: number };
}

type SortKey = "updated" | "created" | "title" | "views";
type SearchMode = "fulltext" | "semantic";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PagesClientProps {
  initialPages: PageItem[];
  initialTotal: number;
  allTags: TagItem[];
}

// ─── Column header with sort button ──────────────────────────────────────────

function ColHeader({
  label,
  sortKey,
  current,
  onClick,
}: {
  label: string;
  sortKey?: SortKey;
  current: SortKey;
  onClick?: (k: SortKey) => void;
}) {
  const active = sortKey && current === sortKey;
  if (!sortKey || !onClick) {
    return (
      <th className="px-4 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </th>
    );
  }
  return (
    <th className="px-4 py-2 text-left">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          "flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-100",
          active
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        )}
      >
        {label}
        {active ? <ChevronDown size={11} /> : <ChevronUp size={11} className="opacity-30" />}
      </button>
    </th>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PagesClient({ initialPages, initialTotal, allTags }: PagesClientProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("fulltext");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("updated");
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isSearching = query.trim().length > 0;

  const fetchPages = useCallback(async (tags: string[], sortKey: SortKey, signal: AbortSignal) => {
    const params = new URLSearchParams({ sort: sortKey, limit: "200" });
    if (tags.length > 0) params.set("tags", tags.join(","));
    const res = await fetch(`/api/pages?${params}`, { signal });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return { pages: data.pages as PageItem[], total: data.total as number };
  }, []);

  const fetchSearch = useCallback(
    async (q: string, searchMode: SearchMode, tags: string[], signal: AbortSignal) => {
      const params = new URLSearchParams({ q, mode: searchMode, limit: "50" });
      if (tags.length > 0) params.set("tag", tags[0]);
      const res = await fetch(`/api/search?${params}`, { signal });
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      let results = data.results as SearchResult[];
      if (tags.length > 1) {
        results = results.filter((r) => tags.every((t) => r.tags.includes(t)));
      }
      return results;
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    debounceRef.current = setTimeout(
      async () => {
        setLoading(true);
        try {
          if (isSearching) {
            const results = await fetchSearch(query, mode, selectedTags, ctrl.signal);
            if (!ctrl.signal.aborted) {
              setSearchResults(results);
              setTotal(results.length);
            }
          } else {
            const { pages: p, total: t } = await fetchPages(selectedTags, sort, ctrl.signal);
            if (!ctrl.signal.aborted) {
              setPages(p);
              setSearchResults(null);
              setTotal(t);
            }
          }
        } catch {
          // ignore aborts
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      },
      isSearching ? 280 : 0
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, selectedTags, sort, isSearching, fetchPages, fetchSearch]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Title + count */}
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            All Pages
          </h1>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {loading ? <Spinner size="sm" /> : `${total} ページ`}
          </span>
        </div>

        {/* Search bar — grows to fill space */}
        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded border px-3 py-1.5",
            "border-[var(--color-border)] bg-[var(--color-bg-primary)]",
            "min-w-48 transition-colors duration-150 focus-within:border-[var(--color-accent)]"
          )}
        >
          <Search size={13} className="shrink-0 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・本文を検索…"
            className="flex-1 bg-transparent font-mono text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Search mode toggle */}
        <div className="flex items-center rounded border border-[var(--color-border)] font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode("fulltext")}
            title="全文検索"
            className={cn(
              "flex items-center gap-1 rounded-l px-2.5 py-1.5 transition-colors duration-100",
              mode === "fulltext"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)]"
            )}
          >
            <Search size={11} />
            全文
          </button>
          <button
            type="button"
            onClick={() => setMode("semantic")}
            title="ベクトル検索（意味検索）"
            className={cn(
              "flex items-center gap-1 rounded-r px-2.5 py-1.5 transition-colors duration-100",
              mode === "semantic"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)]"
            )}
          >
            <Zap size={11} />
            意味
          </button>
        </div>

        {/* New page */}
        <Link
          href="/editor"
          className={cn(
            "flex items-center gap-1.5 rounded border px-3 py-1.5",
            "border-[var(--color-border)] font-mono text-xs text-[var(--color-text-secondary)]",
            "transition-colors duration-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          )}
        >
          <Plus size={12} />
          新規作成
        </Link>
      </div>

      {/* ── Tag filter pills ── */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">Tags:</span>
          {allTags.map((t) => {
            const active = selectedTags.includes(t.name);
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => toggleTag(t.name)}
                className={cn(
                  "inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs transition-colors duration-100",
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                )}
              >
                {t.name}
                <span className="opacity-50">{t._count.pages}</span>
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X size={10} />
              クリア
            </button>
          )}
          {isSearching && mode === "semantic" && (
            <span className="ml-auto font-mono text-xs text-[var(--color-accent)]">
              · 意味検索モード
            </span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded border border-[var(--color-border)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
              <ColHeader
                label="タイトル"
                sortKey="title"
                current={sort}
                onClick={!isSearching ? setSort : undefined}
              />
              <th className="px-4 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Tags
              </th>
              <th className="w-28 px-4 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                作成者
              </th>
              <ColHeader
                label="更新日"
                sortKey="updated"
                current={sort}
                onClick={!isSearching ? setSort : undefined}
              />
              <ColHeader
                label="閲覧"
                sortKey="views"
                current={sort}
                onClick={!isSearching ? setSort : undefined}
              />
              <th className="w-16 px-4 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                いいね
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {/* Empty states */}
            {!loading && isSearching && searchResults !== null && searchResults.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-mono text-sm text-[var(--color-text-secondary)]"
                >
                  該当するページが見つかりませんでした。
                </td>
              </tr>
            )}
            {!loading && !isSearching && pages.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-mono text-sm text-[var(--color-text-secondary)]"
                >
                  ページがありません。{" "}
                  <Link href="/editor" className="text-[var(--color-accent)] hover:underline">
                    作成する
                  </Link>
                </td>
              </tr>
            )}

            {/* Search results */}
            {isSearching &&
              searchResults?.map((r) => (
                <tr
                  key={r.slug}
                  className="group transition-colors duration-100 hover:bg-[var(--color-bg-sidebar)]"
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/wiki/${r.slug}`} className="block">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={12}
                          className="shrink-0 text-[var(--color-text-secondary)]"
                        />
                        <span className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                          {r.title}
                        </span>
                      </div>
                      {r.excerpt && (
                        <p className="mt-0.5 line-clamp-1 pl-[22px] font-mono text-xs text-[var(--color-text-muted)]">
                          {r.excerpt}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    —
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {timeAgo(r.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    —
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    —
                  </td>
                </tr>
              ))}

            {/* Page list */}
            {!isSearching &&
              pages.map((page) => (
                <tr
                  key={page.slug}
                  className="group transition-colors duration-100 hover:bg-[var(--color-bg-sidebar)]"
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/wiki/${page.slug}`} className="flex items-center gap-2">
                      <FileText size={12} className="shrink-0 text-[var(--color-text-secondary)]" />
                      <span className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                        {page.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {page.tags.map((pt) => (
                        <Badge key={pt.tag.name}>{pt.tag.name}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {page.author.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {timeAgo(page.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Eye size={11} />
                      {page._count.pageViews}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={11} />
                      {page._count.likes}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
