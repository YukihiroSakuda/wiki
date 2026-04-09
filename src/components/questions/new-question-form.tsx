"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export function NewQuestionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "An error occurred");
        return;
      }

      const question = await res.json();
      router.push(`/questions/${question.id}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="mb-6">
        <Link
          href="/questions"
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={11} />
          questions/
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <HelpCircle size={20} className="text-[var(--color-accent)]" />
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            ask a question
          </h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to know?"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              body
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide context, background, and what you've tried..."
              rows={12}
              required
            />
          </div>

          {error && <p className="font-mono text-xs text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting || !title.trim() || !content.trim()}
            >
              <Send size={12} />
              {submitting ? "submitting..." : "post question"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
