"use client";

import { cn } from "@/lib/utils";
import { Header } from "./header";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { CommandPalette } from "./command-palette";
import { StatusBar } from "./status-bar";
import { ToastHost } from "@/components/ui/toast-host";
import { useEffect } from "react";
import { env } from "@/lib/env";
import { useLayoutStore } from "@/stores/layout-store";

interface MainLayoutProps {
  children: React.ReactNode;
  showRightSidebar?: boolean;
  rightSidebarProps?: React.ComponentProps<typeof RightSidebar>;
  /** Editor mode: removes scroll, makes content fill viewport height */
  fullHeight?: boolean;
}

export function MainLayout({
  children,
  showRightSidebar = false,
  rightSidebarProps,
  fullHeight = false,
}: MainLayoutProps) {
  const { sidebarOpen, setSidebarOpen, toggleSidebar, initialize } = useLayoutStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div
      className={cn(
        "bg-[var(--color-bg-primary)] font-mono",
        fullHeight ? "h-screen overflow-hidden" : "min-h-screen"
      )}
    >
      <Header onToggleSidebar={toggleSidebar} appName={env.APP_NAME} />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <LeftSidebar isOpen={sidebarOpen} />

      {showRightSidebar && <RightSidebar {...rightSidebarProps} />}

      <main
        className={cn(
          "pb-6 pt-10 transition-all duration-200 sm:transition-[margin]",
          sidebarOpen ? "sm:ml-56" : "sm:ml-0",
          showRightSidebar ? "sm:mr-60" : "sm:mr-0",
          fullHeight && "flex h-screen flex-col"
        )}
      >
        {fullHeight ? (
          <div className="flex flex-1 flex-col overflow-hidden px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
            {children}
          </div>
        ) : (
          <div className="p-4 sm:p-6">{children}</div>
        )}
      </main>

      <CommandPalette />
      <StatusBar />
      <ToastHost />
    </div>
  );
}
