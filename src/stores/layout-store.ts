import { create } from "zustand";

interface LayoutStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  initialized: boolean;
  initialize: () => void;
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  sidebarOpen: false,
  initialized: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  initialize: () => {
    if (get().initialized) return;
    set({ sidebarOpen: window.innerWidth >= 768, initialized: true });
  },
}));
