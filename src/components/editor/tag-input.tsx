"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ value, onChange, placeholder = "Add tag...", maxTags = 10 }: TagInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
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
    } else if (e.key === "Backspace" && inputVal === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 min-h-9 px-2 py-1",
          "border border-[var(--color-border)] rounded bg-[var(--color-bg-primary)]",
          "focus-within:border-[var(--color-accent)] transition-colors duration-150"
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
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={value.length === 0 ? placeholder : ""}
            className={cn(
              "flex-1 min-w-20 outline-none bg-transparent text-sm font-mono",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            )}
          />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-full mt-0.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-md py-0.5">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-colors duration-100",
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
