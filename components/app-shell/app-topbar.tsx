"use client";

import { AlignJustify, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { AuthNav } from "@/components/auth/auth-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { MobileSidebar } from "./mobile-sidebar";

type AppTopbarProps = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function AppTopbar({ sidebarCollapsed, onToggleSidebar }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <MobileSidebar>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <AlignJustify className="h-5 w-5" />
            </Button>
          </MobileSidebar>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
          <div className="hidden text-sm font-medium text-muted-foreground lg:block">
            Workspace
          </div>
        </div>
        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search docs, runs, or agents"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AuthNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
