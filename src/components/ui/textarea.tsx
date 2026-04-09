import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-y rounded border font-mono text-sm",
          "border-[var(--color-border)] bg-[var(--color-bg-secondary)]",
          "px-3 py-2 text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-dim)]",
          "outline-none transition-colors duration-150",
          "focus:border-[var(--color-accent)]",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
