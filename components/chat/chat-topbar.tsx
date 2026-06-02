"use client";

import { AlignJustify, MessagesSquare, PanelLeftClose } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthNav } from "@/components/auth/auth-nav";

type ChatTopbarProps = {
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
};

export function ChatTopbar({ onOpenSidebar, onToggleSidebar, sidebarVisible }: ChatTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open sidebar"
            onClick={onOpenSidebar}
          >
            <AlignJustify className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
          >
            {sidebarVisible ? <PanelLeftClose className="h-5 w-5" /> : <AlignJustify className="h-5 w-5" />}
          </Button>
          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground lg:flex">
            <MessagesSquare className="h-4 w-4" />
            Chat Studio
          </div>
        </div>

        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="rounded-full border border-border/60 px-3 py-1">RAG Mode</span>
          <span className="rounded-full border border-border/60 px-3 py-1">Streaming</span>
        </div>

        <div className="flex items-center gap-2">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
