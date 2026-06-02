"use client";

import { useMemo, useState } from "react";
import { Menu, MessagesSquare, Network, Quote } from "lucide-react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useChat } from "@/hooks/use-chat";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { ChatEditModal } from "@/components/chat/chat-edit-modal";
import { ChatErrorState } from "@/components/chat/error-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ChatSearchResult } from "@/components/chat/chat-types";
import type { Conversation, Message } from "@/lib/db/types";

type ChatPageClientProps = {
  activeConversationId?: string | null;
  initialConversations?: Conversation[];
  initialMessages?: Message[];
  isAdmin?: boolean;
};

export function ChatPageClient({
  activeConversationId,
  initialConversations,
  initialMessages,
  isAdmin = false,
}: ChatPageClientProps) {
  const {
    conversations,
    messages,
    streamingId,
    loading,
    error,
    isPending,
    sendMessage,
    editMessage,
    regenerateMessage,
    removeConversation,
    renameConversation,
    pinConversation,
    cancelStream,
    currentConversationId,
  } = useChat({
    initialConversations,
    initialMessages,
    activeConversationId,
  });

  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [query, setQuery] = useState("");

  const hasMessages = messages.length > 0;
  const activeId = currentConversationId ?? activeConversationId ?? conversations[0]?.id ?? null;
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

  const sidebar = (
    <ChatSidebar
      conversations={conversations}
      activeConversationId={activeId}
      query={query}
      onQueryChange={setQuery}
      searchResults={searchResults}
      onDeleteConversation={removeConversation}
      onRenameConversation={renameConversation}
      onPinConversation={pinConversation}
      isAdmin={isAdmin}
      minimal
    />
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-[2rem] border border-border/60 bg-card/40 shadow-xl shadow-black/5 backdrop-blur">
      <div className="grid min-h-[calc(100vh-8.5rem)] min-w-0 grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border/60 bg-sidebar/70 lg:block">
          {sidebar}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open conversations">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  {sidebar}
                </SheetContent>
              </Sheet>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-foreground">Oraclex Chat</h1>
                <p className="truncate text-xs text-muted-foreground">
                  Ask your knowledge base with memory, retrieval, and citations.
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
                <Network className="h-3.5 w-3.5" /> RAG
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
                <Quote className="h-3.5 w-3.5" /> Citations
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {error ? (
              <ChatErrorState message={error} onRetry={() => window.location.reload()} />
            ) : !hasMessages && !loading ? (
              <EmptyChatState
                onStart={(prompt) =>
                  sendMessage(prompt ?? "Give me a quick update on my RAG system.")
                }
              />
            ) : (
              <ChatMessageList
                messages={messages}
                loading={loading}
                streamingId={streamingId}
                onEdit={(id, content) => setEditing({ id, content })}
                onRegenerate={regenerateMessage}
                onCancelStream={cancelStream}
              />
            )}
          </div>

          <div className="border-t border-border/60 bg-background/70 p-4 sm:p-5">
            <ChatComposer
              onSend={sendMessage}
              onCancel={cancelStream}
              disabled={isPending || !!streamingId}
              isStreaming={!!streamingId}
            />
          </div>
        </section>
      </div>

      <ChatEditModal
        open={Boolean(editing)}
        initialValue={editing?.content ?? ""}
        onCancel={() => setEditing(null)}
        onSave={(value) => {
          if (editing) {
            editMessage(editing.id, value);
          }
          setEditing(null);
        }}
      />
    </div>
  );
}
