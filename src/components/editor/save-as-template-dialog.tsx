"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { LayoutTemplate, Save } from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "procedure", label: "Procedure" },
  { value: "meeting", label: "Meeting" },
  { value: "incident", label: "Incident" },
  { value: "design", label: "Design" },
  { value: "onboarding", label: "Onboarding" },
];

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  content: string;
}

export function SaveAsTemplateDialog({
  open,
  onClose,
  defaultName,
  content,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName ? `${defaultName} Template` : "");
      setDescription("");
      setCategory("general");
    }
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          content,
          category,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save template");
      }
      toast.success("Template saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-md flex-col rounded border shadow-xl",
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
          <LayoutTemplate size={14} className="text-[var(--color-accent)]" />
          <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
            Save as template
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                "w-full rounded border font-mono text-sm",
                "border-[var(--color-border)] bg-[var(--color-bg-secondary)]",
                "px-3 py-1.5 text-[var(--color-text-primary)]",
                "outline-none transition-colors duration-150",
                "focus:border-[var(--color-accent)]"
              )}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || saving}
          >
            <Save size={13} />
            save template
          </Button>
        </div>
      </div>
    </div>
  );
}
