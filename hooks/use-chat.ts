"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { appToast } from "@/lib/client/toast";
import type { Conversation, Message } from "@/lib/db/types";
import type { ChatConversation, ChatMessage } from "@/components/chat/chat-types";
import type { Citation, StreamMetadata } from "@/lib/streaming/types";
import { parseSSEEvent } from "@/lib/streaming/types";
import {
  createChatAction,
  editMessageAction,
  deleteConversationAction,
  renameConversationAction,
  pinConversationAction,
} from "@/lib/actions/chat-actions";

// ── Helpers: DB row → UI type ──

function toUiConversation(row: Conversation): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    lastMessageAt: row.last_message_at ?? row.created_at,
    pinned: row.pinned,
    preview: row.summary ?? undefined,
  };
}

function toUiMessage(row: Message): ChatMessage {
  return {
    id: row.id,
    role: row.role === "system" || row.role === "tool" ? "assistant" : row.role,
    content: row.content,
    createdAt: row.created_at,
    edited: false,
    error: row.status === "error",
    model: row.model ?? undefined,
    citations: parseCitationsFromMetadata(row.metadata),
  };
}

function parseCitationsFromMetadata(
  metadata: Record<string, unknown>,
): Citation[] | undefined {
  if (metadata?.citations && Array.isArray(metadata.citations)) {
    return metadata.citations as Citation[];
  }
  return undefined;
}

// ── Hook ──

type UseChatOptions = {
  initialConversations?: Conversation[];
  initialMessages?: Message[];
  activeConversationId?: string | null;
};

export function useChat(options: UseChatOptions = {}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();

  const [dbConversations, setDbConversations] = useState<Conversation[]>(
    options.initialConversations ?? [],
  );
  const [dbMessages, setDbMessages] = useState<Message[]>(
    options.initialMessages ?? [],
  );
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamCitations, setStreamCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(!options.initialConversations);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const conversations = useMemo(
    () => dbConversations.map(toUiConversation),
    [dbConversations],
  );

  const messages: ChatMessage[] = useMemo(() => {
    const uiMessages = dbMessages.map(toUiMessage);
    // Attach live streaming citations to the streaming message
    if (streamingId && streamCitations.length > 0) {
      return uiMessages.map((m) =>
        m.id === streamingId ? { ...m, citations: streamCitations } : m,
      );
    }
    return uiMessages;
  }, [dbMessages, streamingId, streamCitations]);

  // ── Initial fetch ──
  useEffect(() => {
    if (options.initialConversations || fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from("conversations")
          .select("*")
          .eq("archived", false)
          .order("pinned", { ascending: false })
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        if (err) throw err;
        setDbConversations((data ?? []) as Conversation[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversations");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, options.initialConversations]);

  // ── Load messages for active conversation ──
  useEffect(() => {
    if (!options.activeConversationId || options.initialMessages) return;

    async function loadMessages() {
      try {
        const { data, error: err } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", options.activeConversationId!)
          .order("created_at", { ascending: true });
        if (err) throw err;
        setDbMessages((data ?? []) as Message[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    }
    loadMessages();
  }, [supabase, options.activeConversationId, options.initialMessages]);

  // ── Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDbConversations((prev) => [payload.new as Conversation, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setDbConversations((prev) =>
            prev.map((c) => (c.id === (payload.new as Conversation).id ? (payload.new as Conversation) : c)),
          );
        } else if (payload.eventType === "DELETE") {
          setDbConversations((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // ── Cancel streaming ──
  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingId(null);
    setStreamCitations([]);
  }, []);

  // ── Send message with streaming ──
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      startTransition(async () => {
        try {
          let conversationId = options.activeConversationId;

          if (!conversationId) {
            const { conversation } = await createChatAction(content);
            conversationId = conversation.id;
            router.push(`/chat/${conversation.id}`);
            return;
          }

          // Cancel existing stream
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;

          // Optimistic user message
          const optimisticUser: Message = {
            id: `temp-${Date.now()}`,
            user_id: "",
            conversation_id: conversationId,
            role: "user",
            status: "complete",
            content,
            model: null,
            token_count: null,
            prompt_tokens: null,
            completion_tokens: null,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setDbMessages((prev) => [...prev, optimisticUser]);

          // Optimistic assistant placeholder
          const assistantId = `temp-assistant-${Date.now()}`;
          const optimisticAssistant: Message = {
            id: assistantId,
            user_id: "",
            conversation_id: conversationId,
            role: "assistant",
            status: "streaming",
            content: "",
            model: null,
            token_count: null,
            prompt_tokens: null,
            completion_tokens: null,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setStreamingId(assistantId);
          setStreamCitations([]);
          setDbMessages((prev) => [...prev, optimisticAssistant]);

          try {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId,
                message: content,
                stream: true,
              }),
              signal: controller.signal,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `API error: ${response.status}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullContent = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const event = parseSSEEvent(line);
                if (!event) continue;

                switch (event.type) {
                  case "content":
                    fullContent += event.content ?? "";
                    setDbMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId ? { ...m, content: fullContent } : m,
                      ),
                    );
                    break;

                  case "citation":
                    if (event.citations) {
                      setStreamCitations(event.citations);
                    }
                    break;

                  case "done":
                    // Replace optimistic with real data
                    if (event.metadata?.messageId) {
                      setDbMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                id: event.metadata!.messageId!,
                                content: fullContent,
                                status: "complete" as const,
                                model: event.metadata?.model ?? null,
                                metadata: {
                                  citations: event.citations ?? [],
                                },
                              }
                            : m,
                        ),
                      );
                    }
                    // Replace optimistic user message
                    setDbMessages((prev) =>
                      prev.map((m) =>
                        m.id === optimisticUser.id
                          ? { ...m, status: "complete" as const }
                          : m,
                      ),
                    );
                    if (event.citations) setStreamCitations(event.citations);
                    break;

                  case "error":
                    setDbMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: event.error ?? "An error occurred", status: "error" as const }
                          : m,
                      ),
                    );
                    break;
                }
              }
            }

            // Ensure content is set if stream ended without done event
            if (fullContent) {
              setDbMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.status !== ("complete" as const)
                    ? { ...m, content: fullContent, status: "complete" as const }
                    : m,
                ),
              );
            }
          } catch (err) {
            if ((err as Error).name === "AbortError") return;

            setDbMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: "Unable to reach the AI service. Please check your API key and try again.",
                      status: "error" as const,
                    }
                  : m,
              ),
            );
          } finally {
            setStreamingId(null);
            abortRef.current = null;
          }
        } catch (err) {
          appToast.error(err instanceof Error ? err.message : "Failed to send message");
          setStreamingId(null);
        }
      });
    },
    [options.activeConversationId, router],
  );

  const editMessage = useCallback((id: string, content: string) => {
    setDbMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
    startTransition(async () => {
      try { await editMessageAction(id, content); }
      catch { appToast.error("Failed to edit message"); }
    });
  }, []);

  const regenerateMessage = useCallback((id: string) => {
    // Find the last user message before the assistant message
    const msgIndex = dbMessages.findIndex((m) => m.id === id);
    const userMessages = dbMessages.slice(0, msgIndex).filter((m) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];

    if (lastUserMsg && options.activeConversationId) {
      // Remove the assistant message and resend
      setDbMessages((prev) => prev.filter((m) => m.id !== id));
      sendMessage(lastUserMsg.content);
    }
  }, [dbMessages, options.activeConversationId, sendMessage]);

  const removeConversation = useCallback((id: string) => {
    setDbConversations((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        await deleteConversationAction(id);
        if (options.activeConversationId === id) router.push("/chat");
        appToast.success("Conversation deleted");
      } catch { appToast.error("Failed to delete conversation"); }
    });
  }, [options.activeConversationId, router]);

  const renameConversation = useCallback((id: string, title: string) => {
    setDbConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    startTransition(async () => {
      try { await renameConversationAction(id, title); }
      catch { appToast.error("Failed to rename conversation"); }
    });
  }, []);

  const pinConversation = useCallback((id: string, pinned: boolean) => {
    setDbConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
    startTransition(async () => {
      try { await pinConversationAction(id, pinned); }
      catch { appToast.error("Failed to pin conversation"); }
    });
  }, []);

  return {
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
  };
}
