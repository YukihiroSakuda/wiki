"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: "default" | "danger";
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-md rounded border p-6 shadow-lg font-mono",
          "bg-[var(--color-bg-surface)] border-[var(--color-border)]"
        )}
      >
        <h2 className="text-md font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
        {description && (
          <p className="text-base text-[var(--color-text-secondary)] mb-6">{description}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={() => { onConfirm?.(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
