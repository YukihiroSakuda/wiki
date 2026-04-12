"use client";

import { cn } from "@/lib/utils";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  appName?: string;
}

interface QuickResult {
  slug: string;
  title: string;
  excerpt: string;
}

export function Header({ onToggleSidebar, appName = "Knowledge Hub" }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const focusSearch = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("wiki:focus-search", focusSearch);
    return () => window.removeEventListener("wiki:focus-search", focusSearch);
  }, []);

  const fetchResults = useCallback((q: string) => {
    if (fetchRef.current) fetchRef.current.abort();
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    fetchRef.current = ctrl;
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=5`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setResults(data.results ?? []);
          setOpen(true);
          setActiveIdx(-1);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/pages?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const r = results[activeIdx];
      setOpen(false);
      setQuery("");
      router.push(`/wiki/${r.slug}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    searchRef.current?.focus();
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-30 flex h-10 items-center gap-3 px-3",
        "border-b border-[var(--color-border-strong)] bg-[var(--color-bg-surface)]",
        "font-mono shadow-[0_2px_20px_var(--color-accent-glow)]"
      )}
    >
      {/* Traffic lights */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5C7A] shadow-[0_0_4px_#FF5C7A80]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24] shadow-[0_0_4px_#FBBF2480]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_4px_var(--color-accent-glow)]" />
      </div>

      <button
        onClick={onToggleSidebar}
        className="cursor-pointer rounded p-1 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-sidebar)] hover:text-[var(--color-accent)]"
        aria-label="Toggle sidebar"
      >
        <Menu size={14} />
      </button>

      {/* Terminal prompt */}
      <Link
        href="/"
        className="group flex items-center gap-1 whitespace-nowrap font-mono text-[13px] tracking-tight"
      >
        <span className="text-[var(--color-text-muted)]">user@</span>
        <span className="font-bold text-[var(--color-accent)] transition-colors group-hover:text-[var(--color-accent-hover)]">
          {appName.toLowerCase().replace(/\s+/g, "-")}
        </span>
        <span className="text-[var(--color-text-muted)]">:~$</span>
      </Link>

      {/* Search bar — terminal command line */}
      <div className="relative max-w-xl flex-1">
        <form onSubmit={handleSearch}>
          <div
            className={cn(
              "relative flex items-center gap-1.5 rounded border px-2.5 py-1",
              "border-[var(--color-border)] bg-[var(--color-bg-primary)]",
              "transition-colors focus-within:border-[var(--color-accent)]",
              "focus-within:shadow-[0_0_10px_var(--color-accent-glow)]"
            )}
          >
            <span className="select-none font-mono text-[13px] font-bold text-[var(--color-accent)]">
              ❯
            </span>
            <Search size={11} className="text-[var(--color-text-muted)]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="grep wiki --query ..."
              className={cn(
                "flex-1 bg-transparent font-mono text-[13px]",
                "text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-dim)]"
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={clear}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="hidden select-none items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-muted)] sm:flex">
                Ctrl+K
              </kbd>
            )}
          </div>
        </form>

        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-0.5 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-md">
            {results.map((r, i) => (
              <Link
                key={r.slug}
                href={`/wiki/${r.slug}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "block px-3 py-2 transition-colors duration-100",
                  i === activeIdx
                    ? "bg-[var(--color-accent)] text-black"
                    : "hover:bg-[var(--color-bg-hover)]"
                )}
              >
                <p
                  className={cn(
                    "truncate text-sm font-bold",
                    i === activeIdx ? "text-black" : "text-[var(--color-text-primary)]"
                  )}
                >
                  {r.title}
                </p>
                {r.excerpt && (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      i === activeIdx ? "text-black/80" : "text-[var(--color-text-muted)]"
                    )}
                  >
                    {r.excerpt}
                  </p>
                )}
              </Link>
            ))}
            <Link
              href={`/pages?q=${encodeURIComponent(query)}`}
              onClick={() => setOpen(false)}
              className="block border-t border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-accent)]"
            >
              See all results for &ldquo;{query}&rdquo; →
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
