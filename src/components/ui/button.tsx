import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded border font-mono font-medium cursor-pointer",
          "transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Sizes
          size === "sm" && "px-2 py-1 text-sm",
          size === "md" && "px-3 py-1.5 text-base",
          size === "lg" && "px-4 py-2 text-md",
          // Variants
          variant === "primary" && [
            "bg-[var(--color-accent)] text-white border-[var(--color-accent)]",
            "hover:bg-[var(--color-accent-hover)] hover:border-[var(--color-accent-hover)]",
          ],
          variant === "secondary" && [
            "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]",
            "hover:bg-[var(--color-bg-sidebar)] hover:border-[var(--color-text-secondary)]",
          ],
          variant === "ghost" && [
            "bg-transparent text-[var(--color-text-secondary)] border-transparent",
            "hover:bg-[var(--color-bg-sidebar)] hover:text-[var(--color-text-primary)]",
          ],
          variant === "danger" && [
            "bg-transparent text-red-500 border-red-300",
            "hover:bg-red-50 dark:hover:bg-red-950",
          ],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
