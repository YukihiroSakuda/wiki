import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export function Badge({ children, className, onClick, removable, onRemove }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-mono",
        "bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)]",
        "border border-[var(--color-border)]",
        onClick && "cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-150",
        className
      )}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-0.5 hover:text-[var(--color-text-primary)] cursor-pointer"
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </span>
  );
}
