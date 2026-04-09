"use client";

import { useThemeStore, ACCENT_COLORS, type AccentColorName } from "@/stores/theme-store";
import { cn } from "@/lib/utils";
import { Check, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SettingsClient() {
  const { theme, accentColorName, setTheme, setAccentColor } = useThemeStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const persist = async (updates: { accentColor?: string; theme?: string }) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleAccentChange = (name: AccentColorName) => {
    setAccentColor(name);
    persist({ accentColor: name });
  };

  const handleThemeChange = (t: "light" | "dark") => {
    setTheme(t);
    persist({ theme: t });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Theme */}
      <section>
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Appearance
        </h2>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleThemeChange("light")}
          >
            <Sun size={14} />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleThemeChange("dark")}
          >
            <Moon size={14} />
            Dark
          </Button>
        </div>
      </section>

      {/* Accent color */}
      <section>
        <h2 className="mb-1 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Accent Color
        </h2>
        <p className="mb-3 font-mono text-xs text-[var(--color-text-dim)]">
          Currently: <span className="text-[var(--color-accent)]">{accentColorName}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => handleAccentChange(color.name)}
              title={color.name}
              className={cn(
                "relative h-8 w-8 rounded border-2",
                accentColorName === color.name
                  ? "scale-110 border-[var(--color-text-primary)]"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color.value }}
            >
              {accentColorName === color.name && (
                <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section>
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Preview
        </h2>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
          <p className="mb-2 font-mono text-sm text-[var(--color-text-primary)]">
            This is how your Wiki looks with the current settings.
          </p>
          <a
            href="#"
            className="font-mono text-sm text-[var(--color-accent)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Accent colored link →
          </a>
          <div className="mt-3 flex gap-2">
            <span className="rounded bg-[var(--color-accent)] px-2 py-0.5 font-mono text-xs text-black">
              Tag
            </span>
            <span className="rounded border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
              Badge
            </span>
          </div>
        </div>
      </section>

      {/* Save status */}
      {(saving || saved) && (
        <p
          className={cn(
            "font-mono text-xs",
            saved ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
          )}
        >
          {saving ? "Saving..." : "Settings saved."}
        </p>
      )}
    </div>
  );
}
