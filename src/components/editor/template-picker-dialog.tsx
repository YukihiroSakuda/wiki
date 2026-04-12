"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileText, Search, X, LayoutTemplate } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  isBuiltIn: boolean;
  author: { id: string; name: string };
}

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: { name: string; content: string }) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  procedure: "Procedure",
  meeting: "Meeting",
  incident: "Incident",
  design: "Design",
  onboarding: "Onboarding",
};

export function TemplatePickerDialog({
  open,
  onClose,
  onSelect,
}: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.templates) setTemplates(d.templates);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = search.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : templates;

  // Group by category
  const grouped = filtered.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort((a, b) => {
    // built-in categories first
    const order = ["procedure", "meeting", "incident", "design", "onboarding", "general"];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-2xl flex-col rounded border shadow-xl",
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "max-h-[80vh]"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-[var(--color-text-primary)]">
            <LayoutTemplate size={14} className="text-[var(--color-accent)]" />
            Choose a template
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--color-border)] px-5 py-2.5">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter templates..."
              className="h-8 pl-8"
              autoFocus
            />
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Blank page option */}
          <button
            type="button"
            onClick={() => {
              onSelect({ name: "", content: "" });
              onClose();
            }}
            className={cn(
              "mb-4 flex w-full items-center gap-3 rounded border border-dashed border-[var(--color-border)] px-4 py-3 text-left transition-colors",
              "hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-hover)]"
            )}
          >
            <FileText size={16} className="shrink-0 text-[var(--color-text-muted)]" />
            <div>
              <div className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                Blank page
              </div>
              <div className="font-mono text-xs text-[var(--color-text-dim)]">
                Start from scratch
              </div>
            </div>
          </button>

          {loading && (
            <p className="py-8 text-center font-mono text-xs text-[var(--color-text-dim)]">
              Loading templates...
            </p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center font-mono text-xs text-[var(--color-text-dim)]">
              No templates found.
            </p>
          )}

          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <div className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {grouped[cat].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect({ name: t.name, content: t.content });
                      onClose();
                    }}
                    className={cn(
                      "flex flex-col gap-1 rounded border border-[var(--color-border)] px-3 py-2.5 text-left transition-colors",
                      "hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-hover)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutTemplate
                        size={11}
                        className={
                          t.isBuiltIn
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-text-muted)]"
                        }
                      />
                      <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                        {t.name}
                      </span>
                    </div>
                    {t.description && (
                      <span className="line-clamp-2 font-mono text-[10px] text-[var(--color-text-dim)]">
                        {t.description}
                      </span>
                    )}
                    {!t.isBuiltIn && (
                      <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                        by {t.author.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-[var(--color-border)] px-5 py-2.5">
          <Button variant="ghost" size="sm" onClick={onClose}>
            cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
