"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PageSuggestion {
  slug: string;
  title: string;
}

interface WikiLinkAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onInsert: (newValue: string, cursorPos: number) => void;
}

interface TriggerState {
  active: boolean;
  query: string;
  /** cursor position just after [[ */
  startPos: number;
}

function detectTrigger(text: string, cursorPos: number): TriggerState {
  const before = text.substring(0, cursorPos);
  const match = before.match(/\[\[([^\]\n]*)$/);
  if (match) {
    return {
      active: true,
      query: match[1],
      startPos: cursorPos - match[1].length,
    };
  }
  return { active: false, query: "", startPos: 0 };
}

export function WikiLinkAutocomplete({ textareaRef, value, onInsert }: WikiLinkAutocompleteProps) {
  const [trigger, setTrigger] = useState<TriggerState>({ active: false, query: "", startPos: 0 });
  const [suggestions, setSuggestions] = useState<PageSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const fetchRef = useRef<AbortController | null>(null);

  // Listen to cursor changes from parent (via onCursorChange)
  // We re-detect on value changes; the parent calls onCursorChange which triggers re-render
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const handle = () => {
      const pos = ta.selectionStart;
      const state = detectTrigger(ta.value, pos);
      setTrigger(state);
      setActiveIdx(0);

      if (state.active) {
        // Calculate approximate pixel position using a mirror div approach
        const rect = ta.getBoundingClientRect();
        const style = window.getComputedStyle(ta);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const paddingTop = parseFloat(style.paddingTop) || 12;
        const paddingLeft = parseFloat(style.paddingLeft) || 16;

        const textBefore = ta.value.substring(0, state.startPos - 2); // before [[
        const lines = textBefore.split("\n");
        const lineNum = lines.length - 1;
        const col = lines[lineNum].length;

        const charWidth = parseFloat(style.fontSize) * 0.6;

        setPosition({
          top: paddingTop + lineNum * lineHeight + lineHeight + ta.scrollTop,
          left: paddingLeft + col * charWidth,
        });
      }
    };

    ta.addEventListener("keyup", handle);
    ta.addEventListener("click", handle);
    return () => {
      ta.removeEventListener("keyup", handle);
      ta.removeEventListener("click", handle);
    };
  }, [textareaRef]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!trigger.active) {
      setSuggestions([]);
      return;
    }

    if (fetchRef.current) fetchRef.current.abort();
    const ctrl = new AbortController();
    fetchRef.current = ctrl;

    const search = trigger.query.trim();
    const url = search
      ? `/api/pages?limit=8&sort=recent&q=${encodeURIComponent(search)}`
      : `/api/pages?limit=8&sort=recent`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setSuggestions(
            (data.pages ?? []).map((p: { slug: string; title: string }) => ({
              slug: p.slug,
              title: p.title,
            }))
          );
        }
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [trigger.active, trigger.query]);

  // Keyboard navigation
  useEffect(() => {
    if (!trigger.active || suggestions.length === 0) return;

    const ta = textareaRef.current;
    if (!ta) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[activeIdx]);
      } else if (e.key === "Escape") {
        setTrigger({ active: false, query: "", startPos: 0 });
      }
    };

    ta.addEventListener("keydown", onKey);
    return () => ta.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, suggestions, activeIdx]);

  function insertSuggestion(page: PageSuggestion) {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursorPos = ta.selectionStart;
    const before = value.substring(0, trigger.startPos - 2); // before [[
    const after = value.substring(cursorPos);
    const newVal = `${before}[[${page.title}]]${after}`;
    const newCursor = before.length + page.title.length + 4; // [[title]]

    onInsert(newVal, newCursor);
    setTrigger({ active: false, query: "", startPos: 0 });
    setSuggestions([]);
  }

  if (!trigger.active || suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute z-50 min-w-48 max-w-64",
        "bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-md",
        "py-0.5 text-sm"
      )}
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.slug}
          type="button"
          className={cn(
            "w-full text-left px-3 py-1.5 font-mono text-xs truncate transition-colors duration-100",
            i === activeIdx
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            insertSuggestion(s);
          }}
          onMouseEnter={() => setActiveIdx(i)}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}
