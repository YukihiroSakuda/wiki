"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, CheckCircle2, Circle, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string;
  email: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  status: string;
  bestAnswerId: string | null;
  answerCount: number;
  author: Author;
  createdAt: string;
}

interface QuestionsClientProps {
  initialQuestions: Question[];
  total: number;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Filter = "all" | "open" | "answered";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "all" },
  { key: "open", label: "open" },
  { key: "answered", label: "answered" },
];

export function QuestionsClient({ initialQuestions, total }: QuestionsClientProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all" ? initialQuestions : initialQuestions.filter((q) => q.status === filter);

  const openCount = initialQuestions.filter((q) => q.status === "open").length;
  const answeredCount = initialQuestions.filter((q) => q.status === "answered").length;

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            questions/
          </h1>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{total}</span>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center rounded border border-[var(--color-border)]">
          {FILTERS.map(({ key, label }) => {
            const count = key === "all" ? total : key === "open" ? openCount : answeredCount;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition-colors duration-100",
                  key === "all" ? "rounded-l" : key === "answered" ? "rounded-r" : "",
                  filter === key
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded px-1 font-mono text-[10px]",
                    filter === key ? "bg-white/20" : "bg-[var(--color-bg-secondary)]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <Link
          href="/questions/new"
          className="flex items-center gap-1.5 rounded border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-secondary)] transition-colors duration-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus size={12} />
          new question
        </Link>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded border border-[var(--color-border)]">
        {/* Column headers */}
        <div className="grid grid-cols-[24px_1fr_80px_120px_100px] gap-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
          <div />
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            title
          </div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            answers
          </div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            author
          </div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            date
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center font-mono text-xs text-[var(--color-text-dim)]">
            no questions found
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((q) => (
              <Link
                key={q.id}
                href={`/questions/${q.id}`}
                className="group grid grid-cols-[24px_1fr_80px_120px_100px] items-center gap-0 px-4 py-3 transition-colors duration-100 hover:bg-[var(--color-bg-hover)]"
              >
                {/* Status icon */}
                <div>
                  {q.status === "answered" ? (
                    <CheckCircle2 size={14} className="text-[var(--color-success)]" />
                  ) : (
                    <Circle size={14} className="text-[var(--color-text-dim)]" />
                  )}
                </div>

                {/* Title + excerpt */}
                <div className="min-w-0 pr-4">
                  <p className="truncate font-mono text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                    {q.title}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-muted)]">
                    {q.content.slice(0, 80)}
                  </p>
                </div>

                {/* Answer count */}
                <div className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-secondary)]">
                  <MessageSquare size={11} className="shrink-0" />
                  {q.answerCount}
                </div>

                {/* Author */}
                <div className="flex items-center gap-1 truncate font-mono text-xs text-[var(--color-text-secondary)]">
                  <User size={11} className="shrink-0" />
                  <span className="truncate">{q.author.name}</span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-muted)]">
                  <Clock size={11} className="shrink-0" />
                  {timeAgo(q.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
