"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts:
 *   Ctrl+N  — New page
 *   Ctrl+K  — Focus search (dispatches custom event)
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // Skip if focus is inside an input/textarea/select/contenteditable
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;

      if (e.key === "n" && !isEditable) {
        e.preventDefault();
        router.push("/new");
      }

      if (e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("wiki:focus-search"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
