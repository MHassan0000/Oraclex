"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import type { ChatMessage } from "@/components/chat/chat-types";
import { ChatMessageCard } from "@/components/chat/chat-message";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";

type ChatMessageListProps = {
  messages: ChatMessage[];
  loading?: boolean;
  streamingId?: string | null;
  onEdit?: (id: string, content: string) => void;
  onRegenerate?: (id: string) => void;
};

export function ChatMessageList({
  messages,
  loading,
  streamingId,
  onEdit,
  onRegenerate,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingId]);

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
        />
      ))}
      {streamingId && !messages.some((m) => m.id === streamingId) ? (
        <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card/80 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-xs font-semibold text-primary-foreground">
            AI
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <motion.span
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <motion.span
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
            <span className="ml-2">Thinking…</span>
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
