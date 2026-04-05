"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "style"> {
  maxRows?: number;
}

/**
 * Textarea that grows with its content up to `maxRows` lines, then scrolls.
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  function AutoResizeTextarea({ className, maxRows = 8, value, onChange, ...props }, ref) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    // Resize whenever value changes
    useEffect(() => {
      const ta = innerRef.current;
      if (!ta) return;

      // Compute line height from computed style (fallback 20px)
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      const paddingTop = parseFloat(getComputedStyle(ta).paddingTop) || 0;
      const paddingBottom = parseFloat(getComputedStyle(ta).paddingBottom) || 0;
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
      ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [value, maxRows]);

    return (
      <textarea
        ref={innerRef}
        rows={1}
        value={value}
        onChange={onChange}
        className={cn("resize-none", className)}
        {...props}
      />
    );
  }
);
