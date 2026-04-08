import { create } from "zustand";
import { persist } from "zustand/middleware";

// Terminal OS — techy accent presets. First entry is default.
export const ACCENT_COLORS = [
  { name: "mint", value: "#00E5A0", hover: "#00FFB3" },
  { name: "violet", value: "#7C5CFF", hover: "#9478FF" },
  { name: "cyan", value: "#00B4D8", hover: "#22C9EB" },
  { name: "amber", value: "#FBBF24", hover: "#FCD34D" },
  { name: "hotpink", value: "#FF5C7A", hover: "#FF7A93" },
  { name: "lime", value: "#A3E635", hover: "#BEF264" },
  { name: "plasma", value: "#D946EF", hover: "#E879F9" },
  { name: "sky", value: "#38BDF8", hover: "#7DD3FC" },
] as const;

export type Theme = "light" | "dark";
export type AccentColorName = (typeof ACCENT_COLORS)[number]["name"];

interface ThemeState {
  theme: Theme;
  accentColorName: AccentColorName;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccentColor: (name: AccentColorName) => void;
  getAccentColor: () => (typeof ACCENT_COLORS)[number];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      accentColorName: "mint",

      setTheme: (theme) => set({ theme }),

      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

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
