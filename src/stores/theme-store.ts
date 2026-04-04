import { create } from "zustand";
import { persist } from "zustand/middleware";

// Tailwind colors available as accent (excluding gray variants)
export const ACCENT_COLORS = [
  { name: "blue", value: "#2563EB", hover: "#1D4ED8" },
  { name: "indigo", value: "#4F46E5", hover: "#4338CA" },
  { name: "violet", value: "#7C3AED", hover: "#6D28D9" },
  { name: "purple", value: "#9333EA", hover: "#7E22CE" },
  { name: "fuchsia", value: "#C026D3", hover: "#A21CAF" },
  { name: "pink", value: "#DB2777", hover: "#BE185D" },
  { name: "rose", value: "#E11D48", hover: "#BE123C" },
  { name: "red", value: "#DC2626", hover: "#B91C1C" },
  { name: "orange", value: "#EA580C", hover: "#C2410C" },
  { name: "amber", value: "#D97706", hover: "#B45309" },
  { name: "yellow", value: "#CA8A04", hover: "#A16207" },
  { name: "lime", value: "#65A30D", hover: "#4D7C0F" },
  { name: "green", value: "#16A34A", hover: "#15803D" },
  { name: "emerald", value: "#059669", hover: "#047857" },
  { name: "teal", value: "#0D9488", hover: "#0F766E" },
  { name: "cyan", value: "#0891B2", hover: "#0E7490" },
  { name: "sky", value: "#0284C7", hover: "#0369A1" },
] as const;

export type Theme = "light" | "dark";
export type AccentColorName = typeof ACCENT_COLORS[number]["name"];

interface ThemeState {
  theme: Theme;
  accentColorName: AccentColorName;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccentColor: (name: AccentColorName) => void;
  getAccentColor: () => typeof ACCENT_COLORS[number];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      accentColorName: "blue",

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

      setAccentColor: (name) => set({ accentColorName: name }),

      getAccentColor: () => {
        const { accentColorName } = get();
        return ACCENT_COLORS.find((c) => c.name === accentColorName) ?? ACCENT_COLORS[0];
      },
    }),
    {
      name: "wiki-theme",
    }
  )
);
