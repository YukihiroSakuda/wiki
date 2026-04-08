"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "./markdown-editor";
import { WikiLinkAutocomplete } from "./wiki-link-autocomplete";
import { TagInput } from "./tag-input";
import { AIAssistToolbar } from "./ai-assist-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProofreadDialog } from "./proofread-dialog";
import { SideBySideDiff, computeLinePairs, countLinePairs } from "./side-by-side-diff";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { Save, Trash2, AlertCircle, Sparkles, ScanText } from "lucide-react";

interface PageEditorFormProps {
  slug?: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  isNew?: boolean;
}

export function PageEditorForm({
  slug,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  isNew = false,
}: PageEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [proofreadOpen, setProofreadOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const baselineRef = useRef(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSuggestTags = async () => {
    if (!slug || suggestingTags) return;
    setSuggestingTags(true);
    try {
      const res = await fetch(`/api/pages/${slug}/suggest-tags`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const newTags = (data.tags as string[]).filter((t) => !tags.includes(t));
        setTags((prev) => [...prev, ...newTags]);
      }
    } finally {
      setSuggestingTags(false);
    }
  };

  const handleSaveClick = () => {
    if (!title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }
    setError(null);
    // New pages: no diff to confirm, save directly.
    if (isNew) {
      void handleSave();
      return;
    }
    // Existing pages: show diff confirmation dialog.
    setConfirmSaveOpen(true);
  };

  const handleSave = async () => {
    setConfirmSaveOpen(false);
    if (!title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { title: title.trim(), content, tags };
      if (isNew) {
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "作成に失敗しました。");
        }
        const page = await res.json();
        toast.success(`ページを作成しました: ${page.title}`);
        router.push(`/wiki/${page.slug}`);
      } else {
        const res = await fetch(`/api/pages/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "保存に失敗しました。");
        }
        const page = await res.json();
        toast.success("変更を保存しました");
        router.push(`/wiki/${page.slug}`);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました。");
      toast.warn("ページを削除しました");
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setError(msg);
      toast.error(msg);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleContentChange = useCallback((val: string) => setContent(val), []);

  const handleInsert = useCallback((newVal: string, cursorPos: number) => {
    setContent(newVal);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos;
        textareaRef.current.focus();
      }
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* ── Top bar: title + actions ── */}
      <div className="flex items-center gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ページタイトル"
          className="h-9 flex-1 font-mono text-base font-bold"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setProofreadOpen(true)}
            disabled={saving || deleting}
            className="flex items-center gap-1 rounded px-2 py-1 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)] disabled:opacity-50"
            title="AIによる文章・マークダウン校正"
          >
            <ScanText size={12} />
            校正
          </button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveClick}
            loading={saving}
            disabled={saving || deleting}
          >
            <Save size={13} />
            {isNew ? "作成" : "保存"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.back()}
            disabled={saving || deleting}
          >
            キャンセル
          </Button>
          {!isNew && (
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              loading={deleting}
              disabled={saving || deleting}
              className={cn(confirmDelete && "animate-pulse")}
            >
              <Trash2 size={13} />
              {confirmDelete ? "確認削除" : "削除"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Tags row ── */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Tags
          </span>
          <div className="flex-1">
            <TagInput value={tags} onChange={setTags} />
          </div>
        </div>
        {!isNew && slug && (
          <button
            type="button"
            onClick={handleSuggestTags}
            disabled={suggestingTags}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            <Sparkles size={10} />
            {suggestingTags ? "提案中..." : "AI提案"}
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 font-mono text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* ── Editor (fills remaining height) ── */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MarkdownEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Markdownでページの内容を書く...&#10;&#10;テンプレートボタンをクリックすると構文が挿入されます。"
          textareaRef={textareaRef}
          autocompleteSlot={
            <WikiLinkAutocomplete
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              value={content}
              onInsert={handleInsert}
            />
          }
        />
        <AIAssistToolbar
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={content}
          onChange={handleContentChange}
          pageTitle={title}
        />
      </div>

      {/* ── Save confirmation modal (shows diff) ── */}
      {confirmSaveOpen && !isNew && (
        <SaveConfirmModal
          baseline={baselineRef.current}
          current={content}
          baselineTitle={initialTitle}
          currentTitle={title}
          saving={saving}
          onCancel={() => setConfirmSaveOpen(false)}
          onConfirm={handleSave}
        />
      )}

      {/* ── Proofread dialog ── */}
      <ProofreadDialog
        open={proofreadOpen}
        onClose={() => setProofreadOpen(false)}
        currentTitle={title}
        currentContent={content}
        onApply={(newTitle, newContent) => {
          setTitle(newTitle);
          setContent(newContent);
        }}
      />
    </div>
  );
}

// ─── Save confirmation modal ─────────────────────────────────────────────────

interface SaveConfirmModalProps {
  baseline: string;
  current: string;
  baselineTitle: string;
  currentTitle: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function SaveConfirmModal({
  baseline,
  current,
  baselineTitle,
  currentTitle,
  saving,
  onCancel,
  onConfirm,
}: SaveConfirmModalProps) {
  const pairs = useMemo(() => computeLinePairs(baseline, current), [baseline, current]);
  const { added, removed } = useMemo(() => countLinePairs(pairs), [pairs]);
  const titleChanged = baselineTitle !== currentTitle;
  const contentChanged = added > 0 || removed > 0;

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [saving, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-4xl flex-col rounded border shadow-xl",
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "max-h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-[var(--color-text-primary)]">
            <Save size={14} className="text-[var(--color-accent)]" />
            保存内容の確認
            {contentChanged && (
              <span className="ml-2 font-mono text-xs font-normal">
                <span className="text-green-600 dark:text-green-400">+{added}</span>
                <span className="mx-1 text-[var(--color-text-muted)]">/</span>
                <span className="text-red-600 dark:text-red-400">−{removed}</span>
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            {/* Title diff */}
            {titleChanged ? (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  タイトルの変更
                </span>
                <div className="rounded border border-[var(--color-border)] font-mono text-sm">
                  <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-red-50 px-3 py-2 dark:bg-red-900/20">
                    <span className="mt-0.5 shrink-0 text-xs text-red-600 dark:text-red-400">
                      −
                    </span>
                    <span className="text-red-700 opacity-75 dark:text-red-300">
                      {baselineTitle || "(空)"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-green-50 px-3 py-2 dark:bg-green-900/20">
                    <span className="mt-0.5 shrink-0 text-xs text-green-600 dark:text-green-400">
                      +
                    </span>
                    <span className="text-green-700 dark:text-green-300">
                      {currentTitle || "(空)"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-muted)]">
                タイトルは変更なし
              </div>
            )}

            {/* Content diff */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                本文の変更差分
              </span>
              {contentChanged ? (
                <SideBySideDiff pairs={pairs} leftLabel="保存済み" rightLabel="編集中" />
              ) : (
                <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-muted)]">
                  本文は変更なし
                </div>
              )}
            </div>

            {!titleChanged && !contentChanged && (
              <p className="py-4 text-center font-mono text-sm text-[var(--color-text-muted)]">
                変更はありません。このまま保存しますか?
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={saving}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            loading={saving}
            disabled={saving}
          >
            <Save size={13} />
            保存する
          </Button>
        </div>
      </div>
    </div>
  );
}
