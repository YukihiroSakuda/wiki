"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessageBubble } from "./chat-message";
import { PageContent } from "@/components/page-view/page-content";
import { Spinner } from "@/components/ui/spinner";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { cn } from "@/lib/utils";
import { Send, Trash2, X, Sparkles, ChevronLeft, ExternalLink } from "lucide-react";

const chatTransport = new DefaultChatTransport({ api: "/api/ai/chat" });

// ─── Page preview (drilldown within the panel) ───────────────────────────────

interface PreviewPage {
  slug: string;
  title: string;
  content: string;
}

function PanelPagePreview({
  slug: initialSlug,
  title: initialTitle,
  pageMap,
  onBack,
}: {
  slug: string;
  title: string;
  pageMap: Record<string, string>;
  onBack: () => void;
}) {
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [page, setPage] = useState<PreviewPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPage(null);
    fetch(`/api/pages/${currentSlug}`)
      .then((r) => r.json())
      .then((d) => setPage({ slug: d.slug, title: d.title, content: d.content }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentSlug]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
          title="back to chat"
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
          className="rounded p-1 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)]"
          title="open page"
        >
          <ExternalLink size={13} />
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : page ? (
          <PageContent
            content={page.content}
            pageMap={pageMap}
            onWikiLinkClick={(slug) => setCurrentSlug(slug)}
          />
        ) : (
          <p className="font-mono text-sm text-[var(--color-text-muted)]">failed to load page.</p>
        )}
      </div>
    </>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ChatPanel() {
  const {
    isOpen,
    close,
    setMessages: persistMessages,
    clear: clearPersisted,
    pendingInput,
    setPendingInput,
  } = useChatStore();

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
    messages: useChatStore.getState().messages,
    onFinish: () => {
      persistMessages(chatRef.current);
    },
  });

  const chatRef = useRef(messages);
  chatRef.current = messages;

  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<{ slug: string; title: string } | null>(null);
  const [pageMap, setPageMap] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming";

  useEffect(() => {
    fetch("/api/pages/map")
      .then((r) => r.json())
      .then((map: Record<string, string>) => setPageMap(map))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pendingInput && isOpen) {
      setInput(pendingInput);
      setPendingInput("");
      inputRef.current?.focus();
    }
  }, [pendingInput, isOpen, setPendingInput]);

  useEffect(() => {
    if (!preview) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, preview]);

  useEffect(() => {
    if (isOpen && !preview) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen, preview]);

  const openPage = useCallback((slug: string, title: string) => {
    setPreview({ slug, title });
  }, []);

  const handleClear = () => {
    setMessages([]);
    clearPersisted();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={close} />}

      <div
        className={cn(
          "fixed bottom-0 right-0 z-40 flex flex-col",
          "border-l border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl",
          "transition-transform duration-300",
          "w-full sm:w-96",
          "h-[70vh] sm:top-10 sm:h-[calc(100vh-40px)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {preview ? (
          <PanelPagePreview
            slug={preview.slug}
            title={preview.title}
            pageMap={pageMap}
            onBack={() => setPreview(null)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2">
              <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--color-text-primary)]">
                <Sparkles size={13} className="text-[var(--color-accent)]" />
                AI Chat
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClear}
                  title="clear conversation"
                  className="flex items-center gap-1 rounded px-1.5 py-1 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-danger)]"
                >
                  <Trash2 size={12} />
                  clear
                </button>
                <button
                  type="button"
                  onClick={close}
                  title="Close"
                  className="rounded p-1 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Sparkles size={24} className="text-[var(--color-accent)]" />
                  <p className="font-mono text-sm text-[var(--color-text-secondary)]">
                    Ask anything about the wiki.
                  </p>
                  <p className="font-mono text-xs text-[var(--color-text-muted)]">
                    Powered by Claude · agentic-rag
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={
                        isStreaming &&
                        msg.id === messages[messages.length - 1]?.id &&
                        msg.role === "assistant"
                      }
                      onOpenPage={openPage}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[var(--color-border)] p-3">
              <div className="flex items-end gap-2">
                <AutoResizeTextarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question... (Enter to send)"
                  className={cn(
                    "flex-1 rounded border border-[var(--color-border)] px-3 py-2",
                    "bg-[var(--color-bg-primary)] font-mono text-sm text-[var(--color-text-primary)]",
                    "outline-none transition-colors duration-150 placeholder:text-[var(--color-text-muted)]",
                    "focus:border-[var(--color-accent)]"
                  )}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center self-end rounded",
                    "bg-[var(--color-accent)] text-white transition-colors duration-150",
                    "hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
                Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
