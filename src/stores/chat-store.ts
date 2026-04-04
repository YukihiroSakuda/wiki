import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { slug: string; title: string }[];
  createdAt: Date;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  pendingInput: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "createdAt">) => string;
  updateMessage: (id: string, content: string, sources?: ChatMessage["sources"]) => void;
  setPendingInput: (input: string) => void;
  clear: () => void;
}

let _idCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++_idCounter}`;
}

export const useChatStore = create<ChatState>()((set) => ({
  isOpen: false,
  messages: [],
  pendingInput: "",

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  addMessage: (msg) => {
    const id = nextId();
    set((s) => ({
      messages: [...s.messages, { ...msg, id, createdAt: new Date() }],
    }));
    return id;
  },

  updateMessage: (id, content, sources) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content, ...(sources !== undefined ? { sources } : {}) } : m
      ),
    })),

  setPendingInput: (input) => set({ pendingInput: input }),

  clear: () => set({ messages: [] }),
}));
