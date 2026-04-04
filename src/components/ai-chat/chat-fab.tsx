"use client";

import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import { MessageSquare, X } from "lucide-react";

export function ChatFab() {
  const { isOpen, toggle } = useChatStore();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Close AI Chat" : "Open AI Chat"}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex h-11 w-11 items-center justify-center rounded-full shadow-lg",
        "transition-all duration-200 hover:scale-105 active:scale-95",
        isOpen
          ? "bg-[var(--color-text-secondary)] text-white"
          : "bg-[var(--color-accent)] text-white"
      )}
    >
      {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
    </button>
  );
}
