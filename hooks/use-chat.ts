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
  createConversationAction,
  editMessageAction,
  deleteConversationAction,
  renameConversationAction,
  pinConversationAction,
} from "@/lib/actions/chat-actions";

const CLIENT_STREAM_IDLE_TIMEOUT_MS = 45_000;

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

function getConversationTime(row: Conversation): number {
  return Date.parse(row.last_message_at ?? row.created_at) || 0;
}

function sortDbConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return getConversationTime(b) - getConversationTime(a);
  });
}

async function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("The AI provider did not send a response in time. Try again or select another model.")),
          CLIENT_STREAM_IDLE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
  const [sendPending, setSendPending] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    options.activeConversationId ?? null,
  );
  const [loading, setLoading] = useState(!options.initialConversations);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const conversations = useMemo(
    () => sortDbConversations(dbConversations).map(toUiConversation),
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

  useEffect(() => {
    setCurrentConversationId(options.activeConversationId ?? null);
    if (!options.activeConversationId && options.initialMessages === undefined) {
      setDbMessages([]);
    }
  }, [options.activeConversationId, options.initialMessages]);

  useEffect(() => {
    if (options.initialConversations) {
      setDbConversations(options.initialConversations);
    }
  }, [options.initialConversations]);

  useEffect(() => {
    if (options.initialMessages) {
      setDbMessages(options.initialMessages);
    }
  }, [options.initialMessages]);

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
          setDbConversations((prev) =>
            prev.some((conversation) => conversation.id === (payload.new as Conversation).id)
              ? prev
              : [payload.new as Conversation, ...prev],
          );
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
    (content: string, model?: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent || sendPending || streamingId) return;

      setSendPending(true);

      void (async () => {
        let assistantId: string | null = null;
        try {
          let conversationId = currentConversationId;

          if (!conversationId) {
            const conversation = await createConversationAction(
              trimmedContent.length > 50 ? `${trimmedContent.slice(0, 50).trim()}...` : trimmedContent,
            );
            const now = new Date().toISOString();
            const activeConversation = { ...conversation, last_message_at: now };
            conversationId = conversation.id;
            setCurrentConversationId(conversation.id);
            setDbConversations((prev) =>
              prev.some((item) => item.id === conversation.id) ? prev : [activeConversation, ...prev],
            );
            window.history.replaceState(null, "", `/chat/${conversation.id}`);
          } else {
            const now = new Date().toISOString();
            setDbConversations((prev) =>
              prev.map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, last_message_at: now }
                  : conversation,
              ),
            );
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
            content: trimmedContent,
            model: null,
            token_count: null,
            prompt_tokens: null,
            completion_tokens: null,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Optimistic assistant placeholder
          assistantId = `temp-assistant-${Date.now()}`;
          const optimisticAssistant: Message = {
            id: assistantId,
            user_id: "",
            conversation_id: conversationId,
            role: "assistant",
            status: "streaming",
            content: "",
            model: model ?? null,
            token_count: null,
            prompt_tokens: null,
            completion_tokens: null,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setStreamingId(assistantId);
          setStreamCitations([]);
          setDbMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);
          setSendPending(false);

          try {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId,
                message: trimmedContent,
                model,
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
            let streamFinished = false;

            try {
              while (!streamFinished) {
                const { done, value } = await readStreamChunk(reader);
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
                      // Replace optimistic rows with DB ids once the server persists them.
                      setDbMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                id: event.metadata?.messageId ?? m.id,
                                content: fullContent,
                                status: "complete" as const,
                                model: event.metadata?.model ?? m.model,
                                metadata: {
                                  citations: event.citations ?? [],
                                },
                              }
                            : m,
                        ),
                      );
                      setDbMessages((prev) =>
                        prev.map((m) =>
                          m.id === optimisticUser.id
                            ? {
                                ...m,
                                id: event.metadata?.userMessageId ?? m.id,
                                status: "complete" as const,
                              }
                            : m,
                        ),
                      );
                      if (event.citations) setStreamCitations(event.citations);
                      streamFinished = true;
                      break;

                    case "error":
                      setDbMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                content: event.error ?? "An error occurred",
                                status: "error" as const,
                              }
                            : m,
                        ),
                      );
                      streamFinished = true;
                      break;
                  }

                  if (streamFinished) break;
                }
              }

              if (streamFinished) {
                await reader.cancel().catch(() => undefined);
              }
            } finally {
              reader.releaseLock();
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
            if ((err as Error).name === "AbortError") {
              setDbMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: "Generation stopped.", status: "error" as const }
                    : m,
                ),
              );
              return;
            }

            const message = err instanceof Error
              ? err.message
              : "Unable to reach the AI service. Please try again.";

            setDbMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: message,
                      status: "error" as const,
                    }
                  : m,
              ),
            );
          } finally {
            setStreamingId(null);
            setSendPending(false);
            abortRef.current = null;
          }
        } catch (err) {
          appToast.error(err instanceof Error ? err.message : "Failed to send message");
          setSendPending(false);
          if (assistantId) setStreamingId(null);
        }
      })();
    },
    [currentConversationId, sendPending, streamingId],
  );

  const editMessage = useCallback((id: string, content: string) => {
    setDbMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
    startTransition(async () => {
      try { await editMessageAction(id, content); }
      catch { appToast.error("Failed to edit message"); }
    });
  }, []);

  const regenerateMessage = useCallback((id: string, model?: string) => {
    // Find the last user message before the assistant message
    const msgIndex = dbMessages.findIndex((m) => m.id === id);
    const userMessages = dbMessages.slice(0, msgIndex).filter((m) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];

    if (lastUserMsg && currentConversationId) {
      // Remove the assistant message and resend
      setDbMessages((prev) => prev.filter((m) => m.id !== id));
      sendMessage(lastUserMsg.content, model);
    }
  }, [dbMessages, currentConversationId, sendMessage]);

  const removeConversation = useCallback((id: string) => {
    const previousConversations = dbConversations;
    setDbConversations((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        await deleteConversationAction(id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setDbMessages([]);
          router.push("/chat");
        }
        router.refresh();
        appToast.success("Conversation deleted");
      } catch {
        setDbConversations(previousConversations);
        appToast.error("Failed to delete conversation");
      }
    });
  }, [currentConversationId, dbConversations, router]);

  const renameConversation = useCallback((id: string, title: string) => {
    const previousConversations = dbConversations;
    setDbConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    startTransition(async () => {
      try {
        const conversation = await renameConversationAction(id, title);
        setDbConversations((prev) => prev.map((c) => (c.id === id ? conversation : c)));
        router.refresh();
      }
      catch {
        setDbConversations(previousConversations);
        appToast.error("Failed to rename conversation");
      }
    });
  }, [dbConversations, router]);

  const pinConversation = useCallback((id: string, pinned: boolean) => {
    const previousConversations = dbConversations;
    setDbConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
    startTransition(async () => {
      try {
        const conversation = await pinConversationAction(id, pinned);
        setDbConversations((prev) => prev.map((c) => (c.id === id ? conversation : c)));
        router.refresh();
      }
      catch {
        setDbConversations(previousConversations);
        appToast.error("Failed to pin conversation");
      }
    });
  }, [dbConversations, router]);

  return {
    conversations,
    messages,
    currentConversationId,
    streamingId,
    loading,
    error,
    isPending: isPending || sendPending,
    sendMessage,
    editMessage,
    regenerateMessage,
    removeConversation,
    renameConversation,
    pinConversation,
    cancelStream,
  };
}
