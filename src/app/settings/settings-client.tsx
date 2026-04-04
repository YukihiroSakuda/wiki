"use client";

import { useThemeStore, ACCENT_COLORS, type AccentColorName } from "@/stores/theme-store";
import { cn } from "@/lib/utils";
import { Check, Moon, Sun } from "lucide-react";
import { useState } from "react";

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
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          Appearance
        </h2>
        <div className="flex gap-2">
          <ThemeButton
            active={theme === "light"}
            onClick={() => handleThemeChange("light")}
            icon={<Sun size={14} />}
            label="Light"
          />
          <ThemeButton
            active={theme === "dark"}
            onClick={() => handleThemeChange("dark")}
            icon={<Moon size={14} />}
            label="Dark"
          />
        </div>
      </section>

      {/* Accent color */}
      <section>
        <h2 className="mb-1 font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          Accent Color
        </h2>
        <p className="mb-3 font-mono text-xs text-[var(--color-text-muted)]">
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
                "relative h-8 w-8 rounded border-2 transition-all duration-150",
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
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          Preview
        </h2>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 font-mono text-sm">
          <p className="mb-2 text-[var(--color-text-primary)]">
            This is how your Wiki looks with the current settings.
          </p>
          <a
            href="#"
            className="text-[var(--color-accent)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Accent colored link →
          </a>
          <div className="mt-3 flex gap-2">
            <span className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs text-white">
              Tag
            </span>
            <span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
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
            saved ? "text-green-600" : "text-[var(--color-text-muted)]"
          )}
        >
          {saving ? "Saving..." : "Settings saved."}
        </p>
      )}
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded border px-4 py-2 font-mono text-sm transition-colors duration-150",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-bg-surface)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
