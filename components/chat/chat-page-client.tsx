"use client";

import { useState } from "react";

import { ChatShell } from "@/components/chat/chat-shell";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { useChat } from "@/hooks/use-chat";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { ChatEditModal } from "@/components/chat/chat-edit-modal";
import { ChatErrorState } from "@/components/chat/error-state";
import type { Conversation, Message } from "@/lib/db/types";

type ChatPageClientProps = {
  activeConversationId?: string | null;
  initialConversations?: Conversation[];
  initialMessages?: Message[];
};

export function ChatPageClient({
  activeConversationId,
  initialConversations,
  initialMessages,
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
  } = useChat({
    initialConversations,
    initialMessages,
    activeConversationId,
  });

  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);

  const hasMessages = messages.length > 0;

  if (error) {
    return (
      <ChatShell
        conversations={conversations}
        activeConversationId={activeConversationId ?? null}
        onDeleteConversation={removeConversation}
        onRenameConversation={renameConversation}
        onPinConversation={pinConversation}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
          <ChatErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      </ChatShell>
    );
  }

  return (
    <ChatShell
      conversations={conversations}
      activeConversationId={activeConversationId ?? conversations[0]?.id ?? null}
      onDeleteConversation={removeConversation}
      onRenameConversation={renameConversation}
      onPinConversation={pinConversation}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        {!hasMessages && !loading ? (
          <EmptyChatState
            onStart={(prompt) =>
              sendMessage(prompt ?? "Give me a quick update on my RAG system.")
            }
          />
        ) : null}

        <div className="flex-1 overflow-y-auto pb-4">
          <ChatMessageList
            messages={messages}
            loading={loading}
            streamingId={streamingId}
            onEdit={(id, content) => setEditing({ id, content })}
            onRegenerate={regenerateMessage}
            onCancelStream={cancelStream}
          />
        </div>

        <div className="sticky bottom-0 pt-2">
          <ChatComposer
            onSend={sendMessage}
            onCancel={cancelStream}
            disabled={isPending || !!streamingId}
            isStreaming={!!streamingId}
          />
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
    </ChatShell>
  );
}
