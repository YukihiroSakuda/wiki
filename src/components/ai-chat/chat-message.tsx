import { cn } from "@/lib/utils";
import type { UIMessage, DynamicToolUIPart } from "ai";
import { Sparkles } from "lucide-react";
import { ToolStep } from "./tool-step";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  onOpenPage?: (slug: string, title: string) => void;
}

export function ChatMessageBubble({ message, isStreaming, onOpenPage }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Extract text and tool parts
  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const toolParts = message.parts.filter(
    (p): p is DynamicToolUIPart => p.type === "dynamic-tool"
  );

  // Extract source slugs from fetchPage tool results
  const sources: { slug: string; title: string }[] = [];
  if (!isUser) {
    for (const part of toolParts) {
      if (
        part.toolName === "fetchPage" &&
        part.state === "output-available" &&
        typeof part.output === "string"
      ) {
        const titleMatch = part.output.match(/^# (.+)/m);
        const slugMatch = part.output.match(/^Slug: (.+)/m);
        if (titleMatch && slugMatch) {
          const slug = slugMatch[1].trim();
          if (!sources.some((s) => s.slug === slug)) {
            sources.push({ slug, title: titleMatch[1].trim() });
          }
        }
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      {/* Role label */}
      <div className="flex items-center gap-1 px-1">
        {!isUser && <Sparkles size={10} className="text-[var(--color-accent)]" />}
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {isUser ? "You" : "AI"}
        </span>
      </div>

      {/* Tool steps (assistant only) */}
      {!isUser && toolParts.length > 0 && (
        <div className="flex w-full max-w-[85%] flex-col gap-1">
          {toolParts.map((part) => (
            <ToolStep key={part.toolCallId} part={part} />
          ))}
        </div>
      )}

      {/* Text bubble */}
      {(textContent || isStreaming) && (
        <div
          className={cn(
            "max-w-[85%] rounded px-3 py-2 font-mono text-sm leading-relaxed",
            isUser
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
          )}
        >
          <p className="whitespace-pre-wrap break-words">
            {textContent}
            {isStreaming && !textContent && (
              <span className="ml-0.5 inline-block h-3.5 w-[7px] animate-[blink_1s_steps(1)_infinite] bg-[var(--color-accent)] align-middle shadow-[0_0_6px_var(--color-accent-glow)]" />
            )}
          </p>
        </div>
      )}

      {/* Sources (from fetched pages) */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {sources.map((s) =>
            onOpenPage ? (
              <button
                key={s.slug}
                type="button"
                onClick={() => onOpenPage(s.slug, s.title)}
                className="flex items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)] transition-colors duration-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {s.title}
              </button>
            ) : (
              <a
                key={s.slug}
                href={`/wiki/${s.slug}`}
                className="flex items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)] transition-colors duration-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {s.title}
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}
