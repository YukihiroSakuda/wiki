"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({
  value,
  onChange,
  placeholder: _placeholder,
  maxTags = 10,
}: TagInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!inputVal.trim()) {
      setSuggestions([]);
      return;
    }

    if (fetchRef.current) fetchRef.current.abort();
    const ctrl = new AbortController();
    fetchRef.current = ctrl;

    fetch(`/api/tags?q=${encodeURIComponent(inputVal.trim())}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!ctrl.signal.aborted) {
          const names: string[] = (data.tags ?? [])
            .map((t: { name: string }) => t.name)
            .filter((n: string) => !value.includes(n));
          setSuggestions(names.slice(0, 8));
          setShowSuggestions(names.length > 0);
          setActiveIdx(-1);
        }
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [inputVal, value]);

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!normalized || value.includes(normalized) || value.length >= maxTags) return;
    onChange([...value, normalized]);
    setInputVal("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        addTag(suggestions[activeIdx]);
      } else if (inputVal.trim()) {
        addTag(inputVal);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const canAdd = inputVal.trim().length > 0 && value.length < maxTags;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1 px-2 py-1",
          "rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)]",
          "cursor-text transition-colors duration-150 focus-within:border-[var(--color-accent)]"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} onRemove={() => removeTag(tag)}>
            {tag}
          </Badge>
        ))}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setFocused(false);
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder={value.length === 0 ? "タグを入力…" : "タグを追加…"}
            className={cn(
              "min-w-28 flex-1 bg-transparent font-mono text-sm outline-none",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            )}
          />
        )}
        {/* + button — visible when there is text to commit */}
        {canAdd && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              addTag(inputVal);
            }}
            className={cn(
              "flex items-center gap-0.5 rounded px-1.5 py-0.5",
              "font-mono text-xs text-[var(--color-accent)]",
              "transition-colors duration-100 hover:bg-[var(--color-bg-hover)]"
            )}
            title="追加 (Enter)"
          >
            <Plus size={11} />
            追加
          </button>
        )}
      </div>

      {/* Hint — shown when focused and no suggestions */}
      {focused && !showSuggestions && (
        <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
          入力後に{" "}
          <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 text-xs">
            Enter
          </kbd>{" "}
          または{" "}
          <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 text-xs">,</kbd>{" "}
          で追加
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-0.5 shadow-md">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={cn(
                "w-full truncate px-3 py-1.5 text-left font-mono text-xs transition-colors duration-100",
                i === activeIdx
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
