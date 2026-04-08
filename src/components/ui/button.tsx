import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded border font-mono font-medium",
          "transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-none",
          // Sizes
          size === "sm" && "px-2 py-1 text-sm",
          size === "md" && "px-3 py-1.5 text-base",
          size === "lg" && "px-4 py-2 text-md",
          // Variants
          variant === "primary" && [
            "border-[var(--color-accent)] bg-[var(--color-accent)] text-black",
            "shadow-[0_0_12px_var(--color-accent-glow)]",
            "hover:border-[var(--color-accent-hover)] hover:bg-[var(--color-accent-hover)]",
            "hover:-translate-y-px hover:shadow-[0_0_20px_var(--color-accent-glow)]",
          ],
          variant === "secondary" && [
            "border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
            "hover:border-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)]",
          ],
          variant === "ghost" && [
            "border-transparent bg-transparent text-[var(--color-text-secondary)]",
            "hover:bg-[var(--color-bg-sidebar)] hover:text-[var(--color-text-primary)]",
          ],
          variant === "danger" && [
            "border-red-300 bg-transparent text-red-500",
            "hover:bg-red-50 dark:hover:bg-red-950",
          ],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
