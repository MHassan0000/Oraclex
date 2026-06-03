"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, MessagesSquare, Network, Plus, Quote } from "lucide-react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { useChat } from "@/hooks/use-chat";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { ChatEditModal } from "@/components/chat/chat-edit-modal";
import { ChatErrorState } from "@/components/chat/error-state";
import { Button } from "@/components/ui/button";
import type { Conversation, Message } from "@/lib/db/types";
import { DEFAULT_MODEL, MODEL_LIST, type ModelConfig } from "@/lib/ai/models";

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
    messages,
    streamingId,
    loading,
    error,
    isPending,
    sendMessage,
    editMessage,
    regenerateMessage,
    cancelStream,
  } = useChat({
    initialConversations,
    initialMessages,
    activeConversationId,
  });

  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelOptions, setModelOptions] = useState<ModelConfig[]>(MODEL_LIST);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) return;
        const data = (await response.json()) as { models?: ModelConfig[] };
        if (!cancelled && data.models?.length) {
          setModelOptions(data.models);
          setSelectedModel((current) =>
            data.models?.some((model) => model.id === current)
              ? current
              : data.models?.[0]?.id ?? DEFAULT_MODEL,
          );
        }
      } catch {
        // Static model list remains available as a fallback.
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-[2rem] border border-border/60 bg-card/40 shadow-xl shadow-black/5 backdrop-blur">
      <div className="min-h-[calc(100vh-8.5rem)] min-w-0">
        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
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
            <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground md:flex">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
                <Network className="h-3.5 w-3.5" /> RAG
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
                <Quote className="h-3.5 w-3.5" /> Citations
              </span>
              <Button asChild variant="ghost" size="sm" className="gap-2 rounded-full">
                <Link href="/history">
                  <History className="h-3.5 w-3.5" /> History
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2 rounded-full">
                <Link href="/chat">
                  <Plus className="h-3.5 w-3.5" /> New chat
                </Link>
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {error ? (
              <ChatErrorState message={error} onRetry={() => window.location.reload()} />
            ) : !hasMessages && !loading ? (
              <EmptyChatState
                onStart={(prompt) =>
                  sendMessage(prompt ?? "Give me a quick update on my RAG system.", selectedModel)
                }
              />
            ) : (
              <ChatMessageList
                messages={messages}
                loading={loading}
                streamingId={streamingId}
                onEdit={(id, content) => setEditing({ id, content })}
                onRegenerate={(id) => regenerateMessage(id, selectedModel)}
                onCancelStream={cancelStream}
              />
            )}
          </div>

          <div className="border-t border-border/60 bg-background/70 p-4 sm:p-5">
            <ChatComposer
              onSend={(message) => sendMessage(message, selectedModel)}
              onCancel={cancelStream}
              disabled={isPending || !!streamingId}
              isStreaming={!!streamingId}
              selectedModel={selectedModel}
              modelOptions={modelOptions}
              onModelChange={setSelectedModel}
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
