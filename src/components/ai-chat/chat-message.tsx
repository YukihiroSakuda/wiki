import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/stores/chat-store";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      {/* Role label */}
      <div className="flex items-center gap-1 px-1">
        {!isUser && <Sparkles size={10} className="text-[var(--color-accent)]" />}
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {isUser ? "You" : "AI"}
        </span>
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded px-3 py-2 font-mono text-sm leading-relaxed",
          isUser
            ? "bg-[var(--color-accent)] text-white"
            : "border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle" />
          )}
        </p>
      </div>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {message.sources.map((s) => (
            <Link
              key={s.slug}
              href={`/wiki/${s.slug}`}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)] transition-colors duration-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <FileText size={9} />
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
