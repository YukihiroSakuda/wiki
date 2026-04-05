import { searchPages, semanticSearch } from "@/lib/search";
import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, FileText, Sparkles } from "lucide-react";
import { env } from "@/lib/env";

interface Props {
  searchParams: { q?: string; tag?: string; mode?: string };
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-[var(--color-accent)] px-0.5 text-white">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q ?? "";
  const tag = searchParams.tag;
  const mode = searchParams.mode === "semantic" ? "semantic" : "fulltext";
  const isSemanticAvailable = env.isAzureSearchConfigured();

  const searchResult = await (mode === "semantic" ? semanticSearch(q) : searchPages(q, { tag }));
  const { results, total } = searchResult;

  const buildUrl = (newMode: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    params.set("mode", newMode);
    return `/search?${params.toString()}`;
  };

  return (
    <MainLayout>
      <div className="max-w-3xl">
        {/* Header */}
        <header className="mb-4 border-b border-[var(--color-border)] pb-4">
          <h1 className="font-mono text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            {q ? (
              <>
                Search results for{" "}
                <span className="text-[var(--color-accent)]">&ldquo;{q}&rdquo;</span>
              </>
            ) : tag ? (
              <>
                Pages tagged <span className="text-[var(--color-accent)]">#{tag}</span>
              </>
            ) : (
              "Search"
            )}
          </h1>
          {total > 0 && (
            <p className="mt-1 font-mono text-sm text-[var(--color-text-muted)]">
              {total} result{total !== 1 ? "s" : ""}
            </p>
          )}

          {/* Mode tabs */}
          {q && (
            <div className="mt-3 flex items-center gap-1">
              <Link
                href={buildUrl("fulltext")}
                className={`rounded border px-3 py-1 font-mono text-xs transition-colors duration-100 ${
                  mode === "fulltext"
                    ? "border-[var(--color-accent)] bg-[var(--color-bg-surface)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]"
                }`}
              >
                Full-text
              </Link>
              <Link
                href={isSemanticAvailable ? buildUrl("semantic") : "#"}
                className={`flex items-center gap-1 rounded border px-3 py-1 font-mono text-xs transition-colors duration-100 ${
                  !isSemanticAvailable
                    ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50"
                    : mode === "semantic"
                      ? "border-[var(--color-accent)] bg-[var(--color-bg-surface)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]"
                }`}
                title={
                  !isSemanticAvailable
                    ? "Configure Azure AI Search to enable semantic search"
                    : undefined
                }
              >
                <Sparkles size={10} />
                Semantic
              </Link>
            </div>
          )}
        </header>

        {/* Results */}
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText size={32} className="text-[var(--color-text-muted)]" />
            <p className="font-mono text-sm text-[var(--color-text-secondary)]">
              {q || tag ? "No pages found." : "Enter a search query above."}
            </p>
            {(q || tag) && (
              <Link
                href="/editor"
                className="font-mono text-sm text-[var(--color-accent)] hover:underline"
              >
                Create a new page →
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {results.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/wiki/${r.slug}`}
                  className="block rounded px-1 py-4 transition-colors duration-100 hover:bg-[var(--color-bg-hover)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-mono text-md font-bold leading-tight text-[var(--color-text-primary)]">
                      {highlight(r.title, q)}
                    </h2>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-xs text-[var(--color-text-muted)]">
                      <Clock size={11} />
                      {new Date(r.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {r.excerpt && (
                    <p className="mt-1.5 line-clamp-2 font-mono text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {highlight(r.excerpt, q)}
                    </p>
                  )}

                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <Badge key={t}>{t}</Badge>
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
