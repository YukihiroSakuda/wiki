"use client";

import { cn } from "@/lib/utils";
import { Header } from "./header";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { useState, useEffect } from "react";
import { env } from "@/lib/env";

interface MainLayoutProps {
  children: React.ReactNode;
  showRightSidebar?: boolean;
  rightSidebarProps?: React.ComponentProps<typeof RightSidebar>;
}

export function MainLayout({
  children,
  showRightSidebar = false,
  rightSidebarProps,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] font-mono">
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
          "pt-10 transition-all duration-200",
          "sm:transition-[margin]",
          sidebarOpen ? "sm:ml-52" : "sm:ml-0",
          showRightSidebar ? "sm:mr-60" : "sm:mr-0"
        )}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
