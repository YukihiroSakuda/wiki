"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "./markdown-editor";
import { WikiLinkAutocomplete } from "./wiki-link-autocomplete";
import { TagInput } from "./tag-input";
import { AIAssistToolbar } from "./ai-assist-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Save, Trash2, AlertCircle, Sparkles } from "lucide-react";

interface PageEditorFormProps {
  /** If provided, we're editing an existing page */
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

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
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
          const data = await res.json();
          throw new Error(data.error ?? "Failed to create page.");
        }
        const page = await res.json();
        router.push(`/wiki/${page.slug}`);
      } else {
        const res = await fetch(`/api/pages/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to save page.");
        }
        const page = await res.json();
        router.push(`/wiki/${page.slug}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
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
      if (!res.ok) throw new Error("Failed to delete page.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
  }, []);

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
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          className="h-10 font-mono text-lg font-bold"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
      </div>

      {/* Tags */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Tags
          </label>
          {!isNew && slug && (
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={suggestingTags}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-muted)] transition-colors duration-100 hover:text-[var(--color-accent)] disabled:opacity-50"
            >
              <Sparkles size={10} />
              {suggestingTags ? "Suggesting..." : "AI Suggest"}
            </button>
          )}
        </div>
        <TagInput value={tags} onChange={setTags} />
      </div>

      {/* Editor */}
      <div className="relative">
        <MarkdownEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Write page content in Markdown..."
          minHeight={480}
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 font-mono text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={saving}
            disabled={saving || deleting}
          >
            <Save size={13} />
            {isNew ? "Create Page" : "Save Changes"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.back()}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
        </div>

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
            {confirmDelete ? "Confirm Delete" : "Delete Page"}
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="font-mono text-xs text-[var(--color-text-muted)]">
        Tip: Use{" "}
        <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 text-xs">[[</kbd> to
        link pages,{" "}
        <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 text-xs">Tab</kbd>{" "}
        to indent
      </p>
    </div>
  );
}
