"use client";

import { cn } from "@/lib/utils";
import { FileText, Home, MessageSquare, Plus, Settings, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LeftSidebarProps {
  isOpen: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pages", label: "All Pages", icon: FileText },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-10 z-20 flex flex-col",
        "border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)]",
        "overflow-y-auto font-mono transition-all duration-200",
        isOpen ? "w-52" : "w-0 overflow-hidden"
      )}
    >
      <div className="flex min-w-52 flex-col gap-1 p-3">
        {/* New page */}
        <Link
          href="/editor"
          className={cn(
            "mb-2 flex items-center gap-2 rounded border px-3 py-1.5 text-sm",
            "border-[var(--color-border)] text-[var(--color-text-secondary)]",
            "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
            "transition-colors duration-150"
          )}
        >
          <Plus size={12} />
          New Page
        </Link>

        {/* Nav items */}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon size={13} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
