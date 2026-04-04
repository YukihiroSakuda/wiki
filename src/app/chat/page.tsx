"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatMessageBubble } from "@/components/ai-chat/chat-message";
import { type ChatMessage } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import { Send, Trash2, Sparkles } from "lucide-react";

let msgCounter = 0;
function makeId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQ);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQ) inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = (msg: Omit<ChatMessage, "id" | "createdAt">): string => {
    const id = makeId();
    setMessages((prev) => [...prev, { ...msg, id, createdAt: new Date() }]);
    return id;
  };

  const updateMessage = (id: string, content: string, sources?: ChatMessage["sources"]) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content, ...(sources !== undefined && { sources }) } : m
      )
    );
  };

  const sendMessage = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || streamingId) return;

    setInput("");
    const userMsg = { role: "user" as const, content: t };
    addMessage(userMsg);

    const assistantId = addMessage({ role: "assistant", content: "" });
    setStreamingId(assistantId);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.map((m) => ({ role: m.role, content: m.content })), userMsg],
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        updateMessage(assistantId, "エラーが発生しました。もう一度お試しください。");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";
      let sources: { slug: string; title: string }[] | undefined;
      const SOURCE_MARKER = "\n\n__SOURCES__:";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const combined = accumulated + chunk;
        const idx = combined.indexOf(SOURCE_MARKER);

        if (idx !== -1) {
          const textPart = combined.substring(0, idx);
          const sourcePart = combined.substring(idx + SOURCE_MARKER.length);
          try {
            sources = JSON.parse(sourcePart.trim());
          } catch {
            // ignore
          }
          accumulated = textPart;
          updateMessage(assistantId, accumulated, sources ?? []);
          break;
        }

        accumulated = combined;
        updateMessage(assistantId, accumulated);
      }

      if (sources !== undefined) {
        updateMessage(assistantId, accumulated, sources);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        updateMessage(assistantId, "Something went wrong.");
      }
    } finally {
      setStreamingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-accent)]" />
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            AI Chat
          </h1>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles size={28} className="text-[var(--color-accent)] opacity-60" />
            <p className="font-mono text-sm text-[var(--color-text-secondary)]">
              Wikiについて何でも聞いてください。
            </p>
            <p className="font-mono text-xs text-[var(--color-text-muted)]">
              Powered by Claude + Azure AI Search
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isStreaming={streamingId === msg.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力... (Enter で送信、Shift+Enter で改行)"
            rows={2}
            className={cn(
              "flex-1 resize-none rounded border border-[var(--color-border)] px-3 py-2",
              "bg-[var(--color-bg-primary)] font-mono text-sm text-[var(--color-text-primary)]",
              "outline-none transition-colors duration-150 placeholder:text-[var(--color-text-muted)]",
              "focus:border-[var(--color-accent)]"
            )}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || !!streamingId}
            className={cn(
              "flex h-[4.5rem] w-10 shrink-0 items-center justify-center rounded",
              "bg-[var(--color-accent)] text-white transition-colors duration-150",
              "hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="font-mono text-sm text-[var(--color-text-muted)]">Loading...</div>}>
        <ChatPageContent />
      </Suspense>
    </MainLayout>
  );
}
