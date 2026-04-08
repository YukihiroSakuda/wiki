"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, PlayCircle, RefreshCw, Languages, Check, X, Loader } from "lucide-react";
import { toast } from "@/stores/toast-store";

type Mode = "idle" | "continue" | "rewrite" | "translate";
type DiffState = "none" | "preview" | "accepted";

interface AIAssistToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (val: string) => void;
  pageTitle?: string;
}

const LANGS = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "de", label: "Deutsch" },
];

export function AIAssistToolbar({ textareaRef, value, onChange, pageTitle }: AIAssistToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" });
  const [mode, setMode] = useState<Mode>("idle");
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [diffState, setDiffState] = useState<DiffState>("none");
  const [showLangs, setShowLangs] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect text selection in textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const handleSelect = () => {
      const { selectionStart, selectionEnd } = ta;
      if (selectionStart === selectionEnd) {
        setVisible(false);
        setDiffState("none");
        return;
      }

      const selected = ta.value.substring(selectionStart, selectionEnd);
      if (selected.trim().length < 10) {
        setVisible(false);
        return;
      }

      setSelection({ start: selectionStart, end: selectionEnd, text: selected });

      // Position toolbar above selection
      const rect = ta.getBoundingClientRect();
      const style = window.getComputedStyle(ta);
      const lineHeight = parseFloat(style.lineHeight) || 20;
      const paddingTop = parseFloat(style.paddingTop) || 12;
      const paddingLeft = parseFloat(style.paddingLeft) || 16;

      const textBefore = ta.value.substring(0, selectionStart);
      const lines = textBefore.split("\n");
      const lineNum = lines.length - 1;

      setPosition({
        top: rect.top + paddingTop + lineNum * lineHeight - 38 + window.scrollY,
        left: rect.left + paddingLeft,
      });
      setVisible(true);
      setMode("idle");
      setDiffState("none");
      setStreamedText("");
    };

    ta.addEventListener("mouseup", handleSelect);
    ta.addEventListener("keyup", handleSelect);
    return () => {
      ta.removeEventListener("mouseup", handleSelect);
      ta.removeEventListener("keyup", handleSelect);
    };
  }, [textareaRef]);

  // Hide on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function runAssist(endpoint: string, body: object) {
    setStreaming(true);
    setStreamedText("");
    setDiffState("preview");
    setShowLangs(false);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error("AI request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamedText(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setStreamedText("[Error: AI request failed]");
        toast.error("AIアシスト失敗");
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleContinue() {
    setMode("continue");
    runAssist("/api/ai/continue", {
      selectedText: selection.text,
      pageTitle,
    });
  }

  function handleRewrite() {
    setMode("rewrite");
    runAssist("/api/ai/rewrite", {
      selectedText: selection.text,
    });
  }

  function handleTranslate(langCode: string) {
    setMode("translate");
    runAssist("/api/ai/translate", {
      selectedText: selection.text,
      targetLang: langCode,
    });
  }

  function handleAccept() {
    const ta = textareaRef.current;
    if (!ta) return;

    let newVal: string;
    if (mode === "continue") {
      newVal = value.substring(0, selection.end) + streamedText + value.substring(selection.end);
    } else {
      // rewrite or translate: replace selection
      newVal = value.substring(0, selection.start) + streamedText + value.substring(selection.end);
    }

    onChange(newVal);
    setDiffState("accepted");
    setVisible(false);
    setStreamedText("");
    const label = mode === "continue" ? "続きを生成" : mode === "rewrite" ? "書き換え" : "翻訳";
    toast.success(`${label}を適用しました`);
  }

  function handleReject() {
    setDiffState("none");
    setMode("idle");
    setStreamedText("");
    setStreaming(false);
    if (abortRef.current) abortRef.current.abort();
  }

  if (!visible) return null;

  return (
    <>
      {/* Toolbar */}
      <div
        ref={toolbarRef}
        className={cn(
          "fixed z-50 flex items-center gap-0.5 px-1.5 py-1",
          "rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-md"
        )}
        style={{ top: position.top, left: position.left }}
      >
        <span className="mr-1 flex items-center gap-1 border-r border-[var(--color-border)] px-1 pr-2 text-xs text-[var(--color-text-muted)]">
          <Sparkles size={11} className="text-[var(--color-accent)]" />
          AI
        </span>

        {diffState === "none" || mode === "idle" ? (
          <>
            <ToolbarBtn
              onClick={handleContinue}
              icon={<PlayCircle size={12} />}
              label="Continue"
              disabled={streaming}
            />
            <ToolbarBtn
              onClick={handleRewrite}
              icon={<RefreshCw size={12} />}
              label="Rewrite"
              disabled={streaming}
            />
            <div className="relative">
              <ToolbarBtn
                onClick={() => setShowLangs((v) => !v)}
                icon={<Languages size={12} />}
                label="Translate"
                disabled={streaming}
              />
              {showLangs && (
                <div className="absolute left-0 top-full z-50 mt-0.5 min-w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-0.5 shadow-md">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className="w-full px-3 py-1 text-left font-mono text-xs text-[var(--color-text-primary)] transition-colors duration-100 hover:bg-[var(--color-bg-hover)]"
                      onClick={() => handleTranslate(l.code)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {streaming && (
              <Loader size={12} className="mx-1 animate-spin text-[var(--color-accent)]" />
            )}
            {!streaming && (
              <>
                <ToolbarBtn
                  onClick={handleAccept}
                  icon={<Check size={12} />}
                  label="Accept"
                  className="text-green-600 hover:text-green-700"
                />
                <ToolbarBtn
                  onClick={handleReject}
                  icon={<X size={12} />}
                  label="Reject"
                  className="text-red-500 hover:text-red-600"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Diff preview overlay */}
      {diffState === "preview" && streamedText && (
        <div
          className={cn(
            "fixed z-40 max-h-48 max-w-lg overflow-auto",
            "rounded border border-[var(--color-accent)] bg-[var(--color-bg-surface)] p-3 shadow-lg",
            "font-mono text-sm text-[var(--color-text-primary)]"
          )}
          style={{ top: position.top + 38, left: position.left }}
        >
          <p className="mb-1.5 text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {mode === "continue" ? "Continuation" : mode === "rewrite" ? "Rewrite" : "Translation"}
            {streaming && " — streaming..."}
          </p>
          <div className="whitespace-pre-wrap leading-relaxed">{streamedText}</div>
        </div>
      )}
    </>
  );
}

function ToolbarBtn({
  onClick,
  icon,
  label,
  disabled,
  className,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
        "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
        "transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
