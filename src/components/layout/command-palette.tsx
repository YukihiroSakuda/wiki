"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Settings,
  Trophy,
  Sun,
  Moon,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";

interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
}

type ActionItem = {
  kind: "action";
  id: string;
  label: string;
  hint?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  onRun: () => void;
};

type PageItem = {
  kind: "page";
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
};

type Item = ActionItem | PageItem;

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleTheme, theme } = useThemeStore();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  // Static actions (always available)
  const actions: ActionItem[] = useMemo(
    () => [
      {
        kind: "action",
        id: "new",
        label: "New Page",
        hint: "Create",
        icon: Plus,
        onRun: () => router.push("/editor"),
      },
      {
        kind: "action",
        id: "home",
        label: "Dashboard",
        hint: "Home",
        icon: Home,
        onRun: () => router.push("/"),
      },
      {
        kind: "action",
        id: "pages",
        label: "All Pages",
        hint: "Pages",
        icon: FileText,
        onRun: () => router.push("/pages"),
      },
      {
        kind: "action",
        id: "chat",
        label: "AI Chat",
        hint: "Chat",
        icon: MessageSquare,
        onRun: () => router.push("/chat"),
      },
      {
        kind: "action",
        id: "ranking",
        label: "Ranking",
        hint: "Top pages",
        icon: Trophy,
        onRun: () => router.push("/ranking"),
      },
      {
        kind: "action",
        id: "settings",
        label: "Settings",
        hint: "Preferences",
        icon: Settings,
        onRun: () => router.push("/settings"),
      },
      {
        kind: "action",
        id: "theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Toggle theme",
        icon: theme === "dark" ? Sun : Moon,
        onRun: () => toggleTheme(),
      },
    ],
    [router, theme, toggleTheme]
  );

  // Filter actions by query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const pageItems: PageItem[] = useMemo(
    () =>
      results.map((r) => ({
        kind: "page" as const,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        tags: r.tags,
      })),
    [results]
  );

  const items: Item[] = useMemo(
    () => [...filteredActions, ...pageItems],
    [filteredActions, pageItems]
  );

  // Keep activeIdx in range
  useEffect(() => {
    if (activeIdx >= items.length) setActiveIdx(Math.max(0, items.length - 1));
  }, [items.length, activeIdx]);

  const runItem = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "action") {
        item.onRun();
      } else {
        router.push(`/wiki/${item.slug}`);
      }
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIdx];
      if (item) runItem(item);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  if (!open) return null;

  const actionCount = filteredActions.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border font-mono",
          "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]",
          "shadow-2xl shadow-[var(--color-accent-glow)]"
        )}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <span className="font-mono text-sm font-bold text-[var(--color-accent)]">❯</span>
          <Search size={14} className="text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="search commands & pages... (type to filter)"
            className={cn(
              "flex-1 bg-transparent font-mono text-sm outline-none",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)]"
            )}
          />
          {loading && (
            <span className="font-mono text-xs text-[var(--color-text-muted)]">loading...</span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            title="Close (Esc)"
          >
            <X size={13} />
          </button>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-10 text-center font-mono text-xs text-[var(--color-text-muted)]">
              no results — try another keyword
            </div>
          )}

          {/* Actions section */}
          {filteredActions.length > 0 && (
            <div>
              <div className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Actions
              </div>
              {filteredActions.map((a, i) => {
                const idx = i;
                const active = idx === activeIdx;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => runItem(a)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left font-mono text-sm transition-colors",
                      active
                        ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)]"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 h-full w-0.5 bg-[var(--color-accent)]" />
                    )}
                    <Icon size={13} className="shrink-0" />
                    <span className="flex-1 truncate">{a.label}</span>
                    {a.hint && (
                      <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-dim)]">
                        {a.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pages section */}
          {pageItems.length > 0 && (
            <div>
              <div className="sticky top-0 border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Pages · {pageItems.length}
              </div>
              {pageItems.map((p, i) => {
                const idx = actionCount + i;
                const active = idx === activeIdx;
                return (
                  <button
                    key={p.slug}
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => runItem(p)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-2 text-left font-mono text-sm transition-colors",
                      active ? "bg-[var(--color-bg-hover)]" : "hover:bg-[var(--color-bg-hover)]"
                    )}
                  >
                    <FileText
                      size={13}
                      className={cn(
                        "mt-1 shrink-0",
                        active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div
                        className={cn(
                          "truncate font-bold",
                          active ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                        )}
                      >
                        {p.title}
                      </div>
                      {p.excerpt && (
                        <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                          {p.excerpt}
                        </div>
                      )}
                      {p.tags.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {p.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="rounded border border-[var(--color-border)] px-1 text-[9px] text-[var(--color-text-muted)]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 font-mono text-[9px] text-[var(--color-text-dim)]">
                      /wiki/{p.slug}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint bar */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5 font-mono text-[10px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp size={10} />
              <ArrowDown size={10} /> navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={10} /> select
            </span>
            <span>esc close</span>
          </div>
          <span className="text-[var(--color-text-dim)]">Ctrl+K · command palette</span>
        </div>
      </div>
    </div>
  );
}
