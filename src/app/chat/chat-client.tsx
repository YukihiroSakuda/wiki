"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatMessageBubble } from "@/components/ai-chat/chat-message";
import { PageContent } from "@/components/page-view/page-content";
import { Spinner } from "@/components/ui/spinner";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import { Send, Trash2, Sparkles, X, ExternalLink, ChevronLeft } from "lucide-react";

// ─── Page preview panel ───────────────────────────────────────────────────────

interface PreviewPage {
  slug: string;
  title: string;
  content: string;
}

function PagePreviewPanel({
  slug: initialSlug,
  title: initialTitle,
  pageMap,
  onClose,
}: {
  slug: string;
  title: string;
  pageMap: Record<string, string>;
  onClose: () => void;
}) {
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [page, setPage] = useState<PreviewPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPage(null);
    fetch(`/api/pages/${currentSlug}`)
      .then((r) => r.json())
      .then((data) => setPage({ slug: data.slug, title: data.title, content: data.content }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentSlug]);

  return (
    <div className="flex w-[460px] shrink-0 flex-col rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
          title="閉じる"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="flex-1 truncate font-mono text-sm font-medium text-[var(--color-text-primary)]">
          {page?.title ?? initialTitle}
        </span>
        <a
          href={`/wiki/${currentSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)]"
          title="ページを開く"
        >
          <ExternalLink size={13} />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
        >
          <X size={13} />
        </button>
      </div>
      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : page ? (
          <PageContent
            content={page.content}
            pageMap={pageMap}
            onWikiLinkClick={(slug) => setCurrentSlug(slug)}
          />
        ) : (
          <p className="font-mono text-sm text-[var(--color-text-muted)]">
            ページを読み込めませんでした。
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Chat content ─────────────────────────────────────────────────────────────

function ChatPageContent({ pageMap }: { pageMap: Record<string, string> }) {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const { messages, addMessage, updateMessage, clear } = useChatStore();
  const [input, setInput] = useState(initialQ);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQ) inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openPage = useCallback((slug: string, title: string) => {
    setPreviewSlug(slug);
    setPreviewTitle(title);
  }, []);

  const sendMessage = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || streamingId) return;

    setInput("");
    const userMsg: Omit<ChatMessage, "id" | "createdAt"> = { role: "user", content: t };
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
    <div className="flex h-[calc(100vh-6rem)] gap-3">
      {/* ── Main chat column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
              AI Chat
            </h1>
          </div>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:border-red-400 hover:text-red-500"
            title="会話をクリア"
          >
            <Trash2 size={11} />
            クリア
          </button>
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
                  onOpenPage={openPage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="mt-3">
          <div className="flex items-end gap-2">
            <AutoResizeTextarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="質問を入力... (Enter で送信、Shift+Enter で改行)"
              className={cn(
                "flex-1 rounded border border-[var(--color-border)] px-3 py-2",
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
                "flex w-10 shrink-0 items-center justify-center self-end rounded py-2",
                "bg-[var(--color-accent)] text-white transition-colors duration-150",
                "hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              )}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right preview panel ── */}
      {previewSlug && (
        <PagePreviewPanel
          slug={previewSlug}
          title={previewTitle}
          pageMap={pageMap}
          onClose={() => setPreviewSlug(null)}
        />
      )}
    </div>
  );
}

export function ChatClient({ pageMap }: { pageMap: Record<string, string> }) {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="font-mono text-sm text-[var(--color-text-muted)]">Loading...</div>
        }
      >
        <ChatPageContent pageMap={pageMap} />
      </Suspense>
    </MainLayout>
  );
}
