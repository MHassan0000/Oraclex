"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/components/chat/chat-types";
import { ChatMessageCard } from "@/components/chat/chat-message";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";

type ChatMessageListProps = {
  messages: ChatMessage[];
  loading?: boolean;
  streamingId?: string | null;
  onEdit?: (id: string, content: string) => void;
  onRegenerate?: (id: string) => void;
  onCancelStream?: () => void;
};

export function ChatMessageList({
  messages,
  loading,
  streamingId,
  onEdit,
  onRegenerate,
  onCancelStream,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingId, lastMessageContent]);

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessageCard
          key={message.id}
          message={message}
          isStreaming={message.id === streamingId}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          onCancelStream={onCancelStream}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
