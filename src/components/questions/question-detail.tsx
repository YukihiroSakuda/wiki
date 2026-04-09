"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Send,
  Star,
  BookOpen,
  Clock,
  User,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Author {
  id: string;
  name: string;
  email: string;
}

interface Answer {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  status: string;
  bestAnswerId: string | null;
  author: Author;
  createdAt: string;
  answers: Answer[];
}

interface QuestionDetailProps {
  question: Question;
  currentUserId: string | null;
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

export function QuestionDetail({ question: initial, currentUserId }: QuestionDetailProps) {
  const [question, setQuestion] = useState(initial);
  const [answerContent, setAnswerContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingWiki, setGeneratingWiki] = useState(false);
  const [wikiSlug, setWikiSlug] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const isAuthor = currentUserId === question.author.id;

  function toggleAnswer(id: string) {
    setSelectedAnswerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answerContent.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: answerContent.trim() }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "An error occurred");
        return;
      }
      const newAnswer: Answer = await res.json();
      setQuestion((q) => ({ ...q, answers: [...q.answers, newAnswer] }));
      setAnswerContent("");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmBestAnswer() {
    if (!confirmingId) return;
    const answerId = confirmingId;
    setConfirmingId(null);

    const additionalAnswerIds = Array.from(selectedAnswerIds).filter((id) => id !== answerId);

    const bestRes = await fetch(`/api/questions/${question.id}/best-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId }),
    });
    if (!bestRes.ok) return;
    setQuestion((q) => ({ ...q, bestAnswerId: answerId, status: "answered" }));

    setGeneratingWiki(true);
    setError("");
    try {
      const wikiRes = await fetch(`/api/questions/${question.id}/generate-wiki`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalAnswerIds }),
      });
      if (!wikiRes.ok) {
        setError((await wikiRes.json()).error ?? "Failed to generate wiki");
        return;
      }
      const data = await wikiRes.json();
      setWikiSlug(data.slug);
    } catch {
      setError("Error generating wiki");
    } finally {
      setGeneratingWiki(false);
    }
  }

  const bestAnswer = question.answers.find((a) => a.id === question.bestAnswerId);
  const otherAnswers = question.answers.filter((a) => a.id !== question.bestAnswerId);
  const canSelectBest = isAuthor && question.status === "open";

  return (
    <div className="w-full space-y-5">
      {/* ── Breadcrumb ── */}
      <Link
        href="/questions"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={11} />
        questions/
      </Link>

      {/* ── Question card ── */}
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
          {question.status === "answered" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
          ) : (
            <Circle size={18} className="mt-0.5 shrink-0 text-[var(--color-text-dim)]" />
          )}
          <div>
            <h1 className="font-mono text-base font-bold leading-snug text-[var(--color-text-primary)]">
              {question.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <User size={10} />
                {question.author.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {timeAgo(question.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={10} />
                {question.answers.length} answers
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px]",
                  question.status === "answered"
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                )}
              >
                {question.status === "answered" ? "answered" : "open"}
              </span>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--color-text-primary)]">
            {question.content}
          </p>
        </div>
      </div>

      {/* ── Wiki status banner ── */}
      {wikiSlug ? (
        <div className="border-[var(--color-success)]/40 bg-[var(--color-success)]/5 flex items-center gap-3 rounded border px-4 py-2.5">
          <BookOpen size={13} className="shrink-0 text-[var(--color-success)]" />
          <span className="font-mono text-xs text-[var(--color-success)]">wiki created</span>
          <Link
            href={`/wiki/${wikiSlug}`}
            className="ml-auto font-mono text-xs text-[var(--color-accent)] transition-colors hover:underline"
          >
            /wiki/{wikiSlug} →
          </Link>
        </div>
      ) : generatingWiki ? (
        <div className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 flex items-center gap-3 rounded border px-4 py-2.5">
          <Loader2 size={13} className="shrink-0 animate-spin text-[var(--color-accent)]" />
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            generating wiki...
          </span>
          {error && (
            <span className="ml-auto font-mono text-[10px] text-[var(--color-danger)]">
              {error}
            </span>
          )}
        </div>
      ) : null}

      {/* ── Answers ── */}
      {question.answers.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            {question.answers.length} answers
          </p>
          <div className="space-y-3">
            {bestAnswer && <AnswerCard answer={bestAnswer} isBest />}
            {otherAnswers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                isBest={false}
                showBestButton={canSelectBest && confirmingId !== answer.id}
                onSelectBest={() => setConfirmingId(answer.id)}
                showWikiToggle={canSelectBest && confirmingId !== answer.id}
                isSelectedForWiki={selectedAnswerIds.has(answer.id)}
                onToggleWiki={() => toggleAnswer(answer.id)}
                confirming={confirmingId === answer.id}
                onConfirm={confirmBestAnswer}
                onCancelConfirm={() => setConfirmingId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Answer form ── */}
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="border-b border-[var(--color-border)] px-4 py-2.5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            post an answer
          </p>
        </div>
        <form onSubmit={submitAnswer} className="space-y-3 p-4">
          <Textarea
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
            placeholder="Write your answer..."
            rows={5}
          />
          {error && !generatingWiki && (
            <p className="font-mono text-xs text-[var(--color-danger)]">{error}</p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              disabled={submitting || !answerContent.trim()}
            >
              <Send size={11} />
              {submitting ? "submitting..." : "post answer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Answer card ──────────────────────────────────────────────────────────────

function AnswerCard({
  answer,
  isBest,
  showBestButton,
  onSelectBest,
  showWikiToggle,
  isSelectedForWiki,
  onToggleWiki,
  confirming,
  onConfirm,
  onCancelConfirm,
}: {
  answer: Answer;
  isBest: boolean;
  showBestButton?: boolean;
  onSelectBest?: () => void;
  showWikiToggle?: boolean;
  isSelectedForWiki?: boolean;
  onToggleWiki?: () => void;
  confirming?: boolean;
  onConfirm?: () => void;
  onCancelConfirm?: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border transition-colors duration-150",
        isBest
          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/5"
          : confirming
            ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5"
            : isSelectedForWiki
              ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center gap-3 border-b px-4 py-2.5",
          isBest
            ? "border-[var(--color-success)]/20 bg-[var(--color-success)]/10"
            : confirming
              ? "border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10"
              : isSelectedForWiki
                ? "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10"
                : "bg-[var(--color-bg-primary)]/50 border-[var(--color-border)]"
        )}
      >
        {isBest && (
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">
            <Star size={10} fill="currentColor" />
            best answer
          </span>
        )}
        <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-muted)]">
          <User size={10} />
          {answer.author.name}
        </span>
        <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-dim)]">
          <Clock size={10} />
          {timeAgo(answer.createdAt)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {showWikiToggle && (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={isSelectedForWiki}
                onChange={onToggleWiki}
                className="h-3 w-3 cursor-pointer accent-[var(--color-accent)]"
              />
              <span
                className={cn(
                  "font-mono text-[10px] transition-colors",
                  isSelectedForWiki ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                )}
              >
                include in wiki
              </span>
            </label>
          )}
          {showBestButton && (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={onSelectBest}
              className="hover:border-[var(--color-success)] hover:text-[var(--color-success)]"
            >
              <Star size={9} />
              mark as best
            </Button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-4">
        <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--color-text-primary)]">
          {answer.content}
        </p>
      </div>

      {/* ── Confirmation strip ── */}
      {confirming && (
        <div className="border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 flex items-center gap-3 border-t px-4 py-3">
          <span className="font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Mark this as the best answer and auto-generate a wiki page.
            <br />
            <span className="text-[var(--color-text-dim)]">
              To include other answers, check &quot;include in wiki&quot; first.
            </span>
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={onCancelConfirm}>
              <X size={9} />
              cancel
            </Button>
            <Button type="button" variant="success" size="xs" onClick={onConfirm}>
              <Star size={9} fill="currentColor" />
              confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
