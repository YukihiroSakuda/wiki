"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessageBubble } from "./chat-message";
import { cn } from "@/lib/utils";
import { Send, Trash2, X, Sparkles } from "lucide-react";

export function ChatPanel() {
  const { isOpen, close, messages, addMessage, updateMessage, clear, pendingInput, setPendingInput } =
    useChatStore();
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Consume pending input (from dashboard Quick Ask)
  useEffect(() => {
    if (pendingInput && isOpen) {
      setInput(pendingInput);
      setPendingInput("");
      inputRef.current?.focus();
    }
  }, [pendingInput, isOpen, setPendingInput]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streamingId) return;

    setInput("");
    addMessage({ role: "user", content: text });

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
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        updateMessage(assistantId, "Sorry, an error occurred. Please try again.");
        return;
      }

      // Read streaming response
      // Response format: data lines with text chunks + final JSON with sources
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";
      let sources: { slug: string; title: string }[] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Check for sources marker at the end
        const sourceMarker = "\n\n__SOURCES__:";
        if (chunk.includes(sourceMarker) || accumulated.includes(sourceMarker)) {
          const full = accumulated + chunk;
          const idx = full.indexOf(sourceMarker);
          if (idx !== -1) {
            const textPart = full.substring(0, idx);
            const sourcePart = full.substring(idx + sourceMarker.length);
            try {
              sources = JSON.parse(sourcePart.trim());
            } catch {
              // ignore parse errors
            }
            accumulated = textPart;
            updateMessage(assistantId, accumulated, sources);
            break;
          }
        }

        accumulated += chunk;
        updateMessage(assistantId, accumulated);
      }

      if (sources !== undefined) {
        updateMessage(assistantId, accumulated, sources);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        updateMessage(assistantId, "Sorry, something went wrong.");
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
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={close}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-40 flex flex-col",
          "border-l border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl",
          "transition-transform duration-300",
          "w-full sm:w-96",
          "h-[70vh] sm:h-[calc(100vh-40px)] sm:top-10",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2">
          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--color-text-primary)]">
            <Sparkles size={13} className="text-[var(--color-accent)]" />
            AI Chat
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clear}
              title="Clear conversation"
              className="rounded p-1 text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
            >
              <Trash2 size={13} />
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
                Powered by Claude + Azure AI Search
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question... (Enter to send)"
              rows={2}
              className={cn(
                "flex-1 resize-none rounded border border-[var(--color-border)] px-3 py-2",
                "bg-[var(--color-bg-primary)] font-mono text-sm text-[var(--color-text-primary)]",
                "placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150",
                "focus:border-[var(--color-accent)]"
              )}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || !!streamingId}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded",
                "bg-[var(--color-accent)] text-white transition-colors duration-150",
                "hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
            Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
