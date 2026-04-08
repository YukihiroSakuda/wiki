"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Check, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "@/stores/toast-store";

// ─── Diff types ──────────────────────────────────────────────────────────────

type CharOp = { type: "eq" | "ins" | "del"; text: string };
type LinePair =
  | { kind: "unchanged"; text: string }
  | { kind: "changed"; removed: string; added: string; charDiff: CharOp[] }
  | { kind: "removed"; text: string }
  | { kind: "added"; text: string };

// ─── Myers character-level diff ──────────────────────────────────────────────

function charDiff(a: string, b: string): CharOp[] {
  const m = a.length;
  const n = b.length;
  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Backtrack
  const ops: CharOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: "eq", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "ins", text: b[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "del", text: a[i - 1] });
      i--;
    }
  }
  // Merge consecutive same-type ops
  return ops.reduce<CharOp[]>((acc, op) => {
    const last = acc[acc.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      acc.push({ ...op });
    }
    return acc;
  }, []);
}

// ─── Line-level diff with inline char diff for changed pairs ─────────────────

function computeLinePairs(oldText: string, newText: string): LinePair[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Collect raw operations
  type RawOp = { type: "eq" | "del" | "ins"; text: string };
  const raw: RawOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      raw.unshift({ type: "eq", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: "ins", text: newLines[j - 1] });
      j--;
    } else {
      raw.unshift({ type: "del", text: oldLines[i - 1] });
      i--;
    }
  }

  // Pair consecutive del+ins as "changed"
  const pairs: LinePair[] = [];
  let k = 0;
  while (k < raw.length) {
    const cur = raw[k];
    if (cur.type === "del" && k + 1 < raw.length && raw[k + 1].type === "ins") {
      const removed = cur.text;
      const added = raw[k + 1].text;
      pairs.push({ kind: "changed", removed, added, charDiff: charDiff(removed, added) });
      k += 2;
    } else if (cur.type === "del") {
      pairs.push({ kind: "removed", text: cur.text });
      k++;
    } else if (cur.type === "ins") {
      pairs.push({ kind: "added", text: cur.text });
      k++;
    } else {
      pairs.push({ kind: "unchanged", text: cur.text });
      k++;
    }
  }
  return pairs;
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

function InlineCharDiff({ ops }: { ops: CharOp[] }) {
  return (
    <>
      {ops.map((op, i) => {
        if (op.type === "eq") return <span key={i}>{op.text}</span>;
        if (op.type === "del")
          return (
            <span
              key={i}
              className="rounded bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            >
              {op.text}
            </span>
          );
        return (
          <span
            key={i}
            className="rounded bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300"
          >
            {op.text}
          </span>
        );
      })}
    </>
  );
}

function DiffLines({ pairs }: { pairs: LinePair[] }) {
  const allUnchanged = pairs.every((p) => p.kind === "unchanged");
  if (allUnchanged) {
    return (
      <p className="py-6 text-center font-mono text-sm text-[var(--color-text-muted)]">
        変更箇所なし
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-[var(--color-border)] font-mono text-xs">
      {/* Column headers */}
      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
        <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          校正前
        </div>
        <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          校正後
        </div>
      </div>

      {pairs.map((pair, idx) => {
        if (pair.kind === "unchanged") {
          return (
            <div
              key={idx}
              className="grid grid-cols-2 divide-x divide-[var(--color-border)] bg-[var(--color-bg-primary)]"
            >
              <div className="whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-text-secondary)]">
                {pair.text || "\u00a0"}
              </div>
              <div className="whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-text-secondary)]">
                {pair.text || "\u00a0"}
              </div>
            </div>
          );
        }

        if (pair.kind === "removed") {
          return (
            <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
              <div className="whitespace-pre-wrap break-all bg-red-50 px-3 py-0.5 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {pair.text || "\u00a0"}
              </div>
              <div className="bg-[var(--color-bg-primary)] px-3 py-0.5">{"\u00a0"}</div>
            </div>
          );
        }

        if (pair.kind === "added") {
          return (
            <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
              <div className="bg-[var(--color-bg-primary)] px-3 py-0.5">{"\u00a0"}</div>
              <div className="whitespace-pre-wrap break-all bg-green-50 px-3 py-0.5 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                {pair.text || "\u00a0"}
              </div>
            </div>
          );
        }

        // changed — left: del chars highlighted, right: ins chars highlighted
        return (
          <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            <div className="whitespace-pre-wrap break-all bg-red-50 px-3 py-0.5 text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <InlineCharDiff ops={pair.charDiff.filter((op) => op.type !== "ins")} />
            </div>
            <div className="whitespace-pre-wrap break-all bg-green-50 px-3 py-0.5 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <InlineCharDiff ops={pair.charDiff.filter((op) => op.type !== "del")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

interface ProofreadDialogProps {
  open: boolean;
  onClose: () => void;
  currentTitle: string;
  currentContent: string;
  onApply: (title: string, content: string) => void;
}

type Phase = "idle" | "loading" | "review" | "error";

export function ProofreadDialog({
  open,
  onClose,
  currentTitle,
  currentContent,
  onApply,
}: ProofreadDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  // "after" values returned by AI
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  // "before" values shown in the diff (may be overridden by mock's originalTitle/originalContent)
  const [displayTitle, setDisplayTitle] = useState(currentTitle);
  const [displayContent, setDisplayContent] = useState(currentContent);
  const [applyTitle, setApplyTitle] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Start proofread when dialog opens
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setError(null);
    setNewTitle("");
    setNewContent("");
    setDisplayTitle(currentTitle);
    setDisplayContent(currentContent);
    setApplyTitle(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch("/api/ai/proofread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: currentTitle, content: currentContent }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const afterTitle = data.title ?? currentTitle;
        const afterContent = data.content ?? currentContent;
        setNewTitle(afterTitle);
        setNewContent(afterContent);
        // Use mock-provided originals when the editor was empty
        if (data.originalTitle !== undefined) setDisplayTitle(data.originalTitle);
        if (data.originalContent !== undefined) setDisplayContent(data.originalContent);
        setApplyTitle(afterTitle !== (data.originalTitle ?? currentTitle));
        setPhase("review");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "エラーが発生しました。";
        setError(msg);
        setPhase("error");
        toast.error(`AI校正に失敗: ${msg}`);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    abortRef.current?.abort();
    onClose();
  }

  function handleApply() {
    const titleToApply = applyTitle ? newTitle : currentTitle;
    onApply(titleToApply, newContent);
    toast.success("AI校正を適用しました");
    onClose();
  }

  if (!open) return null;

  const titleChanged = newTitle !== displayTitle;
  const contentPairs = phase === "review" ? computeLinePairs(displayContent, newContent) : [];
  const contentChanged = contentPairs.some((p) => p.kind !== "unchanged");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-3xl flex-col rounded border shadow-xl",
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "max-h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-[var(--color-text-primary)]">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            AI 校正
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <RefreshCw size={22} className="animate-spin text-[var(--color-accent)]" />
              <p className="font-mono text-sm text-[var(--color-text-muted)]">
                AIが校正中です。しばらくお待ちください...
              </p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-3 font-mono text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Review */}
          {phase === "review" && (
            <div className="flex flex-col gap-5">
              {/* Title section */}
              {titleChanged ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      タイトル提案
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={applyTitle}
                        onChange={(e) => setApplyTitle(e.target.checked)}
                        className="accent-[var(--color-accent)]"
                      />
                      このタイトルを適用する
                    </label>
                  </div>
                  <div className="rounded border border-[var(--color-border)] font-mono text-sm">
                    <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-red-50 px-3 py-2 dark:bg-red-900/20">
                      <span className="mt-0.5 shrink-0 text-xs text-red-600 dark:text-red-400">
                        −
                      </span>
                      <span className="text-red-700 opacity-75 dark:text-red-300">
                        {displayTitle}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 bg-green-50 px-3 py-2 dark:bg-green-900/20">
                      <span className="mt-0.5 shrink-0 text-xs text-green-600 dark:text-green-400">
                        +
                      </span>
                      <span className="text-green-700 dark:text-green-300">{newTitle}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-muted)]">
                  <Check size={12} className="text-green-600" />
                  タイトルは変更なし
                </div>
              )}

              {/* Content diff */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  本文の変更差分
                </span>
                {contentChanged ? (
                  <DiffLines pairs={contentPairs} />
                ) : (
                  <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-muted)]">
                    <Check size={12} className="text-green-600" />
                    本文は変更なし
                  </div>
                )}
              </div>

              {!titleChanged && !contentChanged && (
                <p className="py-4 text-center font-mono text-sm text-[var(--color-text-muted)]">
                  修正は不要でした。文章・マークダウンに問題はありません。
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" size="md" onClick={handleClose}>
            キャンセル
          </Button>
          {phase === "review" && (contentChanged || (titleChanged && applyTitle)) && (
            <Button variant="primary" size="md" onClick={handleApply}>
              <Check size={13} />
              適用
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
