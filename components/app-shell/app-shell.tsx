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
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        "flex w-full",
        className,
      )}
    >
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <AppShellContainer>{children}</AppShellContainer>
        </main>
      </div>
    </div>
  );
}
