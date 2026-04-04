import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[var(--color-text-secondary)] pointer-events-none">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 rounded border font-mono text-base",
              "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
              "border-[var(--color-border)] placeholder-[var(--color-text-secondary)]",
              "focus:outline-none focus:border-[var(--color-accent)]",
              "transition-colors duration-150",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-1.5 rounded border font-mono text-base",
          "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
          "border-[var(--color-border)] placeholder-[var(--color-text-secondary)]",
          "focus:outline-none focus:border-[var(--color-accent)]",
          "transition-colors duration-150",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
