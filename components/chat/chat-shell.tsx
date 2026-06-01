"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ChatConversation, ChatSearchResult } from "@/components/chat/chat-types";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatTopbar } from "@/components/chat/chat-topbar";

type ChatShellProps = {
  conversations: ChatConversation[];
  activeConversationId?: string | null;
  children: React.ReactNode;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
  onPinConversation?: (id: string, pinned: boolean) => void;
};

export function ChatShell({
  conversations,
  activeConversationId,
  children,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
}: ChatShellProps) {
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const searchResults: ChatSearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    return conversations
      .filter((conversation) =>
        `${conversation.title} ${conversation.preview ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .slice(0, 8)
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        snippet: conversation.preview,
        lastMessageAt: conversation.lastMessageAt,
      }));
  }, [conversations, query]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {sidebarVisible ? (
        <div className="hidden w-80 shrink-0 border-r border-border/60 bg-sidebar/80 lg:flex">
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            query={query}
            onQueryChange={setQuery}
            searchResults={searchResults}
            onDeleteConversation={onDeleteConversation}
            onRenameConversation={onRenameConversation}
            onPinConversation={onPinConversation}
          />
        </div>
      ) : null}

      <div className="flex w-full flex-1 flex-col">
        <ChatTopbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleSidebar={() => setSidebarVisible((prev) => !prev)}
          sidebarVisible={sidebarVisible}
        />

        <div className="flex-1 bg-gradient-to-b from-background via-background to-muted/30">
          {children}
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            query={query}
            onQueryChange={setQuery}
            searchResults={searchResults}
            mobile
            onClose={() => setSidebarOpen(false)}
            onDeleteConversation={onDeleteConversation}
            onRenameConversation={onRenameConversation}
            onPinConversation={onPinConversation}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
