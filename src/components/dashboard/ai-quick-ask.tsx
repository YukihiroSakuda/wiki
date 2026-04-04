"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight } from "lucide-react";

export function AiQuickAsk() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          "flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-2",
          "bg-[var(--color-bg-surface)] transition-colors duration-150",
          "focus-within:border-[var(--color-accent)]"
        )}
      >
        <Sparkles size={13} className="shrink-0 text-[var(--color-accent)]" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this wiki..."
          className="flex-1 bg-transparent font-mono text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="shrink-0 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)] disabled:opacity-30"
        >
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
