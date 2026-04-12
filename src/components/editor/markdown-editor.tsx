"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PageContent } from "@/components/page-view/page-content";
import { FileUpload } from "./file-upload";
import { cn } from "@/lib/utils";
import { Eye, Code, Columns, Undo2, Redo2 } from "lucide-react";

// ─── Undo / Redo hook ────────────────────────────────────────────────────────

interface HistoryEntry {
  value: string;
  cursor: number;
}

const MAX_HISTORY = 200;
const DEBOUNCE_MS = 300;

function useUndoRedo(
  value: string,
  onChange: (v: string) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const pastRef = useRef<HistoryEntry[]>([{ value, cursor: 0 }]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedRef = useRef(value);

  // Push current state to history (debounced to batch rapid keystrokes)
  const pushHistory = useCallback(
    (newValue: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (newValue === lastPushedRef.current) return;
        const cursor = textareaRef.current?.selectionStart ?? 0;
        pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), { value: newValue, cursor }];
        futureRef.current = [];
        lastPushedRef.current = newValue;
      }, DEBOUNCE_MS);
    },
    [textareaRef]
  );

  const undo = useCallback(() => {
    // Flush any pending debounced push
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const past = pastRef.current;
    if (past.length <= 1) return;

    // If current value differs from top of past, push it to future first
    const currentCursor = textareaRef.current?.selectionStart ?? 0;
    if (value !== past[past.length - 1].value) {
      futureRef.current = [{ value, cursor: currentCursor }, ...futureRef.current];
      const entry = past[past.length - 1];
      onChange(entry.value);
      lastPushedRef.current = entry.value;
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) ta.selectionStart = ta.selectionEnd = entry.cursor;
      });
      return;
    }

    const entry = past[past.length - 1];
    futureRef.current = [entry, ...futureRef.current];
    pastRef.current = past.slice(0, -1);
    const prev = pastRef.current[pastRef.current.length - 1];
    onChange(prev.value);
    lastPushedRef.current = prev.value;
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) ta.selectionStart = ta.selectionEnd = prev.cursor;
    });
  }, [value, onChange, textareaRef]);

  const redo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const future = futureRef.current;
    if (future.length === 0) return;

    const entry = future[0];
    futureRef.current = future.slice(1);
    const currentCursor = textareaRef.current?.selectionStart ?? 0;
    pastRef.current = [...pastRef.current, { value, cursor: currentCursor }];
    onChange(entry.value);
    lastPushedRef.current = entry.value;
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) ta.selectionStart = ta.selectionEnd = entry.cursor;
    });
  }, [value, onChange, textareaRef]);

  const canUndo =
    pastRef.current.length > 1 || value !== pastRef.current[pastRef.current.length - 1]?.value;
  const canRedo = futureRef.current.length > 0;

  return { pushHistory, undo, redo, canUndo, canRedo };
}

type ViewMode = "write" | "preview" | "split";

interface Template {
  label: string;
  title: string;
  /** Raw snippet to insert at cursor */
  snippet: string;
  /** If set, wraps the current selection (or placeholder) with this string */
  wrap?: string;
  /** Cursor offset from end of snippet after insertion (negative = move left) */
  cursorOffset?: number;
}

const TEMPLATES: Template[] = [
  // Headings
  { label: "H1", title: "Heading 1", snippet: "# Heading\n" },
  { label: "H2", title: "Heading 2", snippet: "## Heading\n" },
  { label: "H3", title: "Heading 3", snippet: "### Heading\n" },
  // Inline formatting
  { label: "B", title: "Bold", snippet: "**text**", wrap: "**", cursorOffset: -2 },
  { label: "I", title: "Italic", snippet: "_text_", wrap: "_", cursorOffset: -1 },
  { label: "`code`", title: "Inline code", snippet: "`code`", wrap: "`", cursorOffset: -1 },
  // Links / media
  { label: "Link", title: "Link", snippet: "[link text](https://)", cursorOffset: -1 },
  // Blocks
  {
    label: "Table",
    title: "Table",
    snippet:
      "| col1 | col2 | col3 |\n|---|---|---|\n| cell | cell | cell |\n| cell | cell | cell |\n",
  },
  { label: "• List", title: "Bullet list", snippet: "- item 1\n- item 2\n- item 3\n" },
  { label: "1. List", title: "Numbered list", snippet: "1. item 1\n2. item 2\n3. item 3\n" },
  { label: "☑ Todo", title: "Checklist", snippet: "- [ ] task 1\n- [ ] task 2\n- [x] done\n" },
  { label: "Quote", title: "Blockquote", snippet: "> quote text\n" },
  {
    label: "```Code```",
    title: "Code block",
    snippet: "```\ncode here\n```\n",
    cursorOffset: -5,
  },
  { label: "---", title: "Divider", snippet: "\n---\n" },
];

// Separator indices (after these template indices, render a separator)
const SEPARATORS_AFTER = [2, 5, 6, 7];

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Ref to the internal textarea, forwarded to parent for autocomplete */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  /** Slot to render autocomplete dropdown over the editor */
  autocompleteSlot?: React.ReactNode;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in Markdown...",
  textareaRef: externalRef,
  autocompleteSlot,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>("split");
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState(value);
  const { pushHistory, undo, redo, canUndo, canRedo } = useUndoRedo(value, onChange, textareaRef);

  // Debounce preview update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreview(value), 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Insert template at cursor, wrapping selection if applicable
  const insertTemplate = useCallback(
    (tpl: Template) => {
      const ta = textareaRef.current;
      if (!ta) {
        onChange(value + tpl.snippet);
        return;
      }

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.substring(start, end);

      let insertion: string;
      let newCursor: number;

      if (tpl.wrap && selected) {
        // Wrap selection
        insertion = `${tpl.wrap}${selected}${tpl.wrap}`;
        newCursor = start + insertion.length;
      } else if (tpl.wrap && !selected) {
        // Insert with placeholder, cursor before closing delimiter
        insertion = tpl.snippet;
        const delimLen = tpl.wrap.length;
        // Position cursor inside the delimiters
        const inner = tpl.snippet.slice(delimLen, -delimLen);
        newCursor = start + delimLen + inner.length;
      } else {
        insertion = tpl.snippet;
        newCursor =
          tpl.cursorOffset !== undefined
            ? start + insertion.length + tpl.cursorOffset
            : start + insertion.length;
      }

      const newVal = value.substring(0, start) + insertion + value.substring(end);
      onChange(newVal);
      pushHistory(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = newCursor;
        ta.focus();
      });
    },
    [value, onChange, textareaRef, pushHistory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart, selectionEnd } = ta;
        const next = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
        onChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 2;
        });
        return;
      }

      if (e.key === "Enter") {
        const { selectionStart } = ta;
        const before = value.substring(0, selectionStart);
        const lineStart = before.lastIndexOf("\n") + 1;
        const currentLine = before.substring(lineStart);

        const ulMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
        if (ulMatch) {
          if (ulMatch[3].trim() === "") {
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
            const ins = `\n${ulMatch[1]}${ulMatch[2]} `;
            onChange(value.substring(0, selectionStart) + ins + value.substring(selectionStart));
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
            });
          }
          return;
        }

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
            const ins = `\n${olMatch[1]}${parseInt(olMatch[2]) + 1}. `;
            onChange(value.substring(0, selectionStart) + ins + value.substring(selectionStart));
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
            });
          }
          return;
        }
      }
    },
    [value, onChange, undo, redo]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    pushHistory(v);
  };

  return (
    <div className="flex flex-1 flex-col rounded border border-[var(--color-border)]">
      {/* ── Row 1: mode + upload ─────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3 py-1.5">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">Markdown</span>
          <span className="text-[var(--color-border)]">·</span>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors duration-100 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors duration-100 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 size={13} />
          </button>
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

      {/* ── Row 2: template buttons ───────────────────────── */}
      <div className="scrollbar-thin flex items-center gap-0.5 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-2 py-1.5">
        {TEMPLATES.map((tpl, i) => (
          <div key={tpl.label} className="flex items-center gap-0.5">
            <button
              type="button"
              title={tpl.title}
              onClick={() => insertTemplate(tpl)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded px-2 py-0.5 font-mono text-xs",
                "border border-transparent text-[var(--color-text-secondary)]",
                "transition-colors duration-100",
                "hover:border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
                // Bold/Italic/code buttons get special style
                tpl.label === "B" && "font-bold",
                tpl.label === "I" && "italic"
              )}
            >
              {tpl.label}
            </button>
            {SEPARATORS_AFTER.includes(i) && (
              <span className="mx-1 h-4 w-px shrink-0 bg-[var(--color-border)]" />
            )}
          </div>
        ))}
      </div>

      {/* ── Editor body ───────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-1",
          mode === "split" ? "sm:divide-x sm:divide-[var(--color-border)]" : ""
        )}
      >
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
            />
            {autocompleteSlot}
          </div>
        )}

        {(mode === "preview" || mode === "split") && (
          <div
            className={cn(
              "min-w-0 flex-1 overflow-auto px-4 py-3",
              "bg-[var(--color-bg-primary)]",
              mode === "split" ? "hidden sm:block" : "block"
            )}
          >
            {preview.trim() ? (
              <PageContent content={preview} />
            ) : (
              <p className="font-mono text-sm italic text-[var(--color-text-muted)]">
                nothing to preview.
              </p>
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
