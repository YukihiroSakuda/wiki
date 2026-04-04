"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DiffViewer } from "@/components/history/diff-viewer";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Revision {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; email: string };
}

export default function HistoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${slug}/revisions`)
      .then((r) => r.json())
      .then((data) => {
        const revs: Revision[] = data.revisions ?? [];
        setRevisions(revs);
        // Default: compare latest two
        if (revs.length >= 2) {
          setSelectedA(revs[1].id);
          setSelectedB(revs[0].id);
        } else if (revs.length === 1) {
          setSelectedA(revs[0].id);
          setSelectedB(revs[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const revA = revisions.find((r) => r.id === selectedA);
  const revB = revisions.find((r) => r.id === selectedB);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] font-mono">
      {/* Minimal header */}
      <div className="fixed top-0 left-0 right-0 z-30 h-10 flex items-center px-4 gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <Link
          href={`/wiki/${slug}`}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
        >
          <ArrowLeft size={13} />
          Back to page
        </Link>
        <span className="text-[var(--color-text-muted)] text-sm">/ Revision History</span>
      </div>

      <div className="pt-10 flex h-screen">
        {/* Sidebar: revision list */}
        <aside className="w-64 shrink-0 border-r border-[var(--color-border)] overflow-y-auto bg-[var(--color-bg-sidebar)] pt-4 pb-4">
          <p className="px-4 text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Revisions ({revisions.length})
          </p>
          {loading ? (
            <div className="flex justify-center pt-8">
              <Spinner size="sm" />
            </div>
          ) : revisions.length === 0 ? (
            <p className="px-4 text-sm text-[var(--color-text-secondary)]">No revisions.</p>
          ) : (
            <ul className="flex flex-col">
              {revisions.map((rev, idx) => {
                const isA = selectedA === rev.id;
                const isB = selectedB === rev.id;
                return (
                  <li key={rev.id}>
                    <button
                      type="button"
                      onClick={() => {
                        // Click first selects B (newer), second click on different selects A (older)
                        if (selectedB === rev.id) {
                          setSelectedA(rev.id);
                        } else if (selectedA === rev.id) {
                          setSelectedB(rev.id);
                        } else {
                          // Set as new B, push old B to A
                          setSelectedA(selectedB);
                          setSelectedB(rev.id);
                        }
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 border-b border-[var(--color-border)] transition-colors duration-100",
                        (isA || isB)
                          ? "bg-[var(--color-bg-surface)]"
                          : "hover:bg-[var(--color-bg-surface)]"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {isB && (
                          <span className="px-1 py-0.5 rounded text-xs bg-[var(--color-accent)] text-white">
                            B
                          </span>
                        )}
                        {isA && !isB && (
                          <span className="px-1 py-0.5 rounded text-xs bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                            A
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="text-xs text-[var(--color-accent)]">Latest</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
                        <Clock size={10} />
                        {new Date(rev.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--color-text-muted)]">
                        <User size={10} />
                        {rev.author.name}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Main: diff view */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center pt-16">
              <Spinner />
            </div>
          ) : !revA || !revB ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Select two revisions to compare.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4 text-sm text-[var(--color-text-secondary)]">
                <span>
                  Comparing{" "}
                  <strong className="text-[var(--color-text-primary)]">
                    {new Date(revA.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>{" "}
                  →{" "}
                  <strong className="text-[var(--color-text-primary)]">
                    {new Date(revB.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </span>
              </div>
              <DiffViewer oldText={revA.content} newText={revB.content} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
