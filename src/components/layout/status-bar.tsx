"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useThemeStore } from "@/stores/theme-store";
import { Activity, GitBranch, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const pathname = usePathname();
  const { theme, accentColorName } = useThemeStore();
  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Mode label derived from path
  const mode = (() => {
    if (pathname === "/") return "DASHBOARD";
    if (pathname.startsWith("/editor")) return "EDIT";
    if (pathname.startsWith("/wiki/")) return "READ";
    if (pathname.startsWith("/chat")) return "CHAT";
    if (pathname.startsWith("/pages")) return "BROWSE";
    if (pathname.startsWith("/ranking")) return "RANK";
    if (pathname.startsWith("/settings")) return "CONFIG";
    return "MAIN";
  })();

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 flex h-6 items-center justify-between gap-4 px-3",
        "border-t border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)]",
        "font-mono text-[10px] text-[var(--color-text-muted)]",
        "shadow-[0_-4px_20px_var(--color-accent-glow)]"
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent-glow)]" />
          <span className="font-bold text-[var(--color-accent)]">{mode}</span>
        </span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span className="flex items-center gap-1">
          <GitBranch size={10} />
          main
        </span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span>utf-8</span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span>LF</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Activity size={10} className="text-[var(--color-accent)]" />
          <span>AI: claude-sonnet</span>
        </span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span>{theme}</span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span className="text-[var(--color-accent)]">@{accentColorName}</span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span>Ctrl+K</span>
        <span className="text-[var(--color-text-dim)]">·</span>
        <span className="flex items-center gap-1">
          <Wifi size={10} className="text-[var(--color-accent)]" />
          {mounted ? time : "--:--:--"}
        </span>
      </div>
    </div>
  );
}
