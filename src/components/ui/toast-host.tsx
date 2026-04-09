"use client";

import { useToastStore, type ToastKind } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<ToastKind, React.ComponentType<any>> = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

const ACCENT: Record<ToastKind, string> = {
  info: "var(--color-accent)",
  success: "var(--color-accent)",
  warn: "#FBBF24",
  error: "#FF5C7A",
};

const TAG: Record<ToastKind, string> = {
  info: "INFO",
  success: " OK ",
  warn: "WARN",
  error: "FAIL",
};

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-8 right-4 z-[70] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        const color = ACCENT[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded border bg-[var(--color-bg-elevated)] px-3 py-2",
              "font-mono text-[12px] text-[var(--color-text-primary)]",
              "animate-[toast-in_180ms_ease-out]"
            )}
            style={{
              borderColor: color,
              boxShadow: `0 0 18px ${color}40, 0 0 4px ${color}80`,
            }}
          >
            <span
              className="mt-0.5 select-none rounded px-1 text-[9px] font-bold"
              style={{ color, border: `1px solid ${color}` }}
            >
              [{TAG[t.kind]}]
            </span>
            <Icon size={13} style={{ color }} className="mt-0.5 shrink-0" />
            <span className="flex-1 break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="mt-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
