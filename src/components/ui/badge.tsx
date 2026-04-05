import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export function Badge({ children, className, onClick, removable, onRemove }: BadgeProps) {
  const hasRemove = removable || !!onRemove;
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-sm",
        "bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)]",
        "border border-[var(--color-border)]",
        onClick &&
          "cursor-pointer transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
        className
      )}
      onClick={onClick}
    >
      {children}
      {hasRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 cursor-pointer opacity-0 transition-opacity duration-100 hover:text-[var(--color-text-primary)] group-hover:opacity-100"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
