"use client";

import { useThemeStore } from "@/stores/theme-store";
import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColorName, getAccentColor } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    // Apply dark/light class
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply accent color CSS variables
    const accent = getAccentColor();
    root.style.setProperty("--color-accent", accent.value);
    root.style.setProperty("--color-accent-hover", accent.hover);
  }, [theme, accentColorName, getAccentColor]);

  return <>{children}</>;
}
