"use client";

import * as React from "react";

import { AppShellContainer } from "@/components/app-shell/app-shell-container";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopbar } from "@/components/app-shell/app-topbar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        "flex w-full overflow-x-hidden",
        className,
      )}
    >
      <AppSidebar collapsed={sidebarCollapsed} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppTopbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <AppShellContainer>{children}</AppShellContainer>
        </main>
      </div>
    </div>
  );
}
