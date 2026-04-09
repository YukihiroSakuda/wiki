"use client";

import { cn } from "@/lib/utils";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Home,
  MessageSquare,
  Plus,
  Settings,
  Trophy,
  Hash,
  Search,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface LeftSidebarProps {
  isOpen: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "README.md", icon: Home },
  { href: "/pages", label: "pages/", icon: FileText },
  { href: "/questions", label: "questions/", icon: HelpCircle },
  { href: "/ranking", label: "ranking.md", icon: Trophy },
  { href: "/chat", label: "ai-chat.sh", icon: MessageSquare },
  { href: "/settings", label: "config.json", icon: Settings },
];

interface RecentPage {
  slug: string;
  title: string;
}

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [recent, setRecent] = useState<RecentPage[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pages?limit=10")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.pages) return;
        setRecent(
          d.pages.map((p: { slug: string; title: string }) => ({
            slug: p.slug,
            title: p.title,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <aside
      className={cn(
        "fixed bottom-6 left-0 top-10 z-20 flex flex-col",
        "border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)]",
        "overflow-y-auto font-mono transition-all duration-200",
        isOpen ? "w-56" : "w-0 overflow-hidden"
      )}
    >
      <div className="flex min-w-56 flex-col">
        {/* Explorer header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            Explorer
          </span>
          <Link
            href="/editor"
            className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            title="New Page"
          >
            <Plus size={12} />
          </Link>
        </div>

        {/* Section: Navigation */}
        <Section
          label="WIKI-OS"
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          icon={navOpen ? FolderOpen : Folder}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <TreeRow key={href} href={href} label={label} icon={Icon} active={active} depth={1} />
            );
          })}
        </Section>

        {/* Section: Recent pages */}
        <Section
          label="RECENT"
          open={recentOpen}
          onToggle={() => setRecentOpen((v) => !v)}
          icon={recentOpen ? FolderOpen : Folder}
          count={recent.length}
        >
          {recent.length === 0 && (
            <div className="px-6 py-1 text-[10px] text-[var(--color-text-dim)]">empty</div>
          )}
          {recent.map((p) => {
            const href = `/wiki/${p.slug}`;
            const active = pathname === href;
            return (
              <TreeRow
                key={p.slug}
                href={href}
                label={p.title}
                icon={Hash}
                active={active}
                depth={1}
              />
            );
          })}
        </Section>

        {/* Section: Quick actions */}
        <Section label="ACTIONS" open icon={FolderOpen}>
          <TreeRow
            href="/search"
            label="search"
            icon={Search}
            active={pathname === "/search"}
            depth={1}
          />
          <TreeRow
            href="/editor"
            label="new-page"
            icon={Plus}
            active={pathname === "/editor"}
            depth={1}
          />
        </Section>
      </div>
    </aside>
  );
}

function Section({
  label,
  open,
  onToggle,
  icon: Icon,
  count,
  children,
}: {
  label: string;
  open: boolean;
  onToggle?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-[var(--color-border)]/50 border-b">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ChevronRight size={10} className={cn("transition-transform", open && "rotate-90")} />
        <Icon size={11} className="text-[var(--color-accent)]" />
        <span className="font-bold">{label}</span>
        {typeof count === "number" && (
          <span className="ml-auto text-[var(--color-text-dim)]">{count}</span>
        )}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

function TreeRow({
  href,
  label,
  icon: Icon,
  active,
  depth,
}: {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  active: boolean;
  depth: number;
}) {
  return (
    <Link
      href={href}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      className={cn(
        "relative flex items-center gap-1.5 py-0.5 pr-2 text-[12px] transition-colors",
        active
          ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-0 h-full w-0.5 bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent-glow)]" />
      )}
      <Icon size={11} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
