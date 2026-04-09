import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UIMessage } from "ai";

interface ChatState {
  isOpen: boolean;
  messages: UIMessage[];
  pendingInput: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setMessages: (messages: UIMessage[]) => void;
  setPendingInput: (input: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      pendingInput: "",

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      setMessages: (messages) => set({ messages }),

      setPendingInput: (input) => set({ pendingInput: input }),

      clear: () => set({ messages: [] }),
    }),
    {
      name: "wiki-chat-history",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ messages: s.messages }),
    }
  )
);
