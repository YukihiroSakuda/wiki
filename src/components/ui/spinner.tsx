"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** "braille" (default) renders an animated braille glyph; "dots" renders cycling dots; "svg" renders the legacy circular spinner */
  variant?: "braille" | "dots" | "svg";
}

const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const DOT_FRAMES = [".  ", ".. ", "...", " ..", "  .", "   "];

export function Spinner({ size = "md", className, variant = "braille" }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (variant === "svg") return;
    const id = setInterval(() => setFrame((f) => f + 1), variant === "braille" ? 80 : 140);
    return () => clearInterval(id);
  }, [variant]);

  if (variant === "svg") {
    return (
      <svg
        className={cn(
          "animate-spin text-[var(--color-accent)]",
          size === "sm" && "h-3 w-3",
          size === "md" && "h-4 w-4",
          size === "lg" && "h-5 w-5",
          className
        )}
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Loading"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    );
  }

  const frames = variant === "braille" ? BRAILLE_FRAMES : DOT_FRAMES;
  const glyph = frames[frame % frames.length];

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block select-none font-mono leading-none text-[var(--color-accent)]",
        "[text-shadow:0_0_8px_var(--color-accent-glow)]",
        size === "sm" && "text-xs",
        size === "md" && "text-base",
        size === "lg" && "text-xl",
        className
      )}
    >
      {glyph}
    </span>
  );
}
