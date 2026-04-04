"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PageContent } from "@/components/page-view/page-content";
import { FileUpload } from "./file-upload";
import { cn } from "@/lib/utils";
import { Eye, Code, Columns } from "lucide-react";

type ViewMode = "write" | "preview" | "split";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Ref to the internal textarea, forwarded to parent for autocomplete */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  /** Slot to render autocomplete dropdown over the editor */
  autocompleteSlot?: React.ReactNode;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in Markdown...",
  minHeight = 400,
  textareaRef: externalRef,
  autocompleteSlot,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>("split");
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState(value);

  // Debounce preview update (100ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreview(value);
    }, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;

      // Tab → insert 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart, selectionEnd } = ta;
        const next = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
        onChange(next);
        // Restore cursor after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 2;
        });
        return;
      }

      // Enter key: auto-continue list items
      if (e.key === "Enter") {
        const { selectionStart } = ta;
        const before = value.substring(0, selectionStart);
        const lineStart = before.lastIndexOf("\n") + 1;
        const currentLine = before.substring(lineStart);

        // Match unordered list
        const ulMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
        if (ulMatch) {
          if (ulMatch[3].trim() === "") {
            // Empty list item → exit list
            e.preventDefault();
            const newVal =
              value.substring(0, selectionStart - currentLine.length) +
              "\n" +
              value.substring(selectionStart);
            onChange(newVal);
            requestAnimationFrame(() => {
              const pos = selectionStart - currentLine.length + 1;
              ta.selectionStart = ta.selectionEnd = pos;
            });
          } else {
            e.preventDefault();
            const indent = ulMatch[1];
            const bullet = ulMatch[2];
            const ins = `\n${indent}${bullet} `;
            const newVal =
              value.substring(0, selectionStart) + ins + value.substring(selectionStart);
            onChange(newVal);
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
            });
          }
          return;
        }

        // Match ordered list
        const olMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (olMatch) {
          if (olMatch[3].trim() === "") {
            e.preventDefault();
            const newVal =
              value.substring(0, selectionStart - currentLine.length) +
              "\n" +
              value.substring(selectionStart);
            onChange(newVal);
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = selectionStart - currentLine.length + 1;
            });
          } else {
            e.preventDefault();
            const indent = olMatch[1];
            const num = parseInt(olMatch[2]) + 1;
            const ins = `\n${indent}${num}. `;
            const newVal =
              value.substring(0, selectionStart) + ins + value.substring(selectionStart);
            onChange(newVal);
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
            });
          }
          return;
        }
      }
    },
    [value, onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-0 rounded border border-[var(--color-border)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3 py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">Markdown</span>
          <span className="text-[var(--color-border)]">·</span>
          <FileUpload
            onInsert={(md) => {
              const ta = textareaRef.current;
              if (!ta) {
                onChange(value + md);
                return;
              }
              const pos = ta.selectionStart;
              onChange(value.substring(0, pos) + md + value.substring(pos));
              requestAnimationFrame(() => {
                ta.selectionStart = ta.selectionEnd = pos + md.length;
                ta.focus();
              });
            }}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <ModeButton active={mode === "write"} onClick={() => setMode("write")} title="Write">
            <Code size={13} />
          </ModeButton>
          {/* Split only shown on desktop */}
          <span className="hidden sm:contents">
            <ModeButton active={mode === "split"} onClick={() => setMode("split")} title="Split">
              <Columns size={13} />
            </ModeButton>
          </span>
          <ModeButton
            active={mode === "preview"}
            onClick={() => setMode("preview")}
            title="Preview"
          >
            <Eye size={13} />
          </ModeButton>
        </div>
      </div>

      {/* Editor body — on mobile always single pane (split → write) */}
      <div
        className={cn(
          "flex",
          mode === "split" ? "sm:divide-x sm:divide-[var(--color-border)]" : ""
        )}
        style={{ minHeight }}
      >
        {/* Write pane: hidden on mobile when preview mode */}
        {mode !== "preview" && (
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              spellCheck={false}
              className={cn(
                "h-full w-full resize-none bg-[var(--color-bg-primary)] outline-none",
                "font-mono text-sm leading-relaxed text-[var(--color-text-primary)]",
                "px-4 py-3 placeholder:text-[var(--color-text-muted)]"
              )}
              style={{ minHeight }}
            />
            {autocompleteSlot}
          </div>
        )}

        {/* Preview pane: on mobile only show in preview mode; on desktop show in split/preview */}
        {(mode === "preview" || mode === "split") && (
          <div
            className={cn(
              "min-w-0 flex-1 overflow-auto px-4 py-3",
              "bg-[var(--color-bg-primary)]",
              // On mobile, hide split preview — only show full preview
              mode === "split" ? "hidden sm:block" : "block"
            )}
            style={{ minHeight }}
          >
            {preview.trim() ? (
              <PageContent content={preview} />
            ) : (
              <p className="text-sm italic text-[var(--color-text-muted)]">Nothing to preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors duration-100",
        active
          ? "bg-[var(--color-accent)] text-white"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {children}
    </button>
  );
}
