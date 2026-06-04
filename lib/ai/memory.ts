import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCompletion, estimateTokens, type ChatCompletionMessage } from "@/lib/ai/openrouter";
import { DEFAULT_MODEL } from "@/lib/ai/models";

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────

const MAX_CONTEXT_TOKENS = 6000;
const SUMMARY_TRIGGER_MESSAGES = 20;
const SHORT_TERM_WINDOW = 10;

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export type MemoryContext = {
  /** System-level summary of conversation so far */
  longTermSummary: string | null;
  /** Recent messages within the short-term window */
  shortTermMessages: ChatCompletionMessage[];
  /** Total estimated tokens in the context */
  totalTokens: number;
};

// ──────────────────────────────────────────
// Core: Build memory context for a conversation
// ──────────────────────────────────────────

/**
 * Build a memory context for the LLM, combining long-term summarized
 * memory with recent short-term messages, trimmed to fit within
 * the token budget.
 */
export async function buildMemoryContext(
  conversationId: string,
  maxTokens: number = MAX_CONTEXT_TOKENS,
): Promise<MemoryContext> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch conversation summary (long-term memory)
  const { data: conversation } = await supabase
    .from("conversations")
    .select("summary")
    .eq("id", conversationId)
    .single();

  const longTermSummary = conversation?.summary ?? null;

  // 2. Fetch recent messages (short-term memory)
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(SHORT_TERM_WINDOW * 2);

  const recentMessages: ChatCompletionMessage[] = (messages ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // 3. Token-aware trimming
  const trimmed = trimToTokenBudget(recentMessages, longTermSummary, maxTokens);

  return {
    longTermSummary,
    shortTermMessages: trimmed.messages,
    totalTokens: trimmed.totalTokens,
  };
}

// ──────────────────────────────────────────
// Summarization
// ──────────────────────────────────────────

/**
 * Summarize a conversation and persist the summary.
 * Called automatically when message count exceeds the threshold.
 */
export async function summarizeConversation(
  conversationId: string,
): Promise<string> {
  const supabase = await createServerSupabaseClient();

  // Fetch all messages for summarization
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  if (!messages?.length) return "";

  // Fetch existing summary for incremental summarization
  const { data: conversation } = await supabase
    .from("conversations")
    .select("summary")
    .eq("id", conversationId)
    .single();

  const existingSummary = conversation?.summary ?? "";

  // Build messages for the summarizer
  const transcript = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`,
    )
    .join("\n\n");

  const prompt = existingSummary
    ? `Previous summary:\n${existingSummary}\n\nNew messages to incorporate:\n${transcript}`
    : `Conversation transcript:\n${transcript}`;

  const result = await createCompletion({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: prompt }],
    systemPrompt:
      "You are a conversation summarizer. Create a concise, factual summary of the conversation that captures: 1) Key topics discussed, 2) Important facts or decisions, 3) User preferences revealed, 4) Any outstanding questions. Output ONLY the summary, 3-5 sentences max.",
    temperature: 0.3,
    maxTokens: 400,
  });

  const summary = result.content.trim();

  // Persist the summary
  await supabase
    .from("conversations")
    .update({ summary })
    .eq("id", conversationId);

  return summary;
}

/**
 * Check if a conversation needs summarization and trigger it if so.
 */
export async function maybeUpdateSummary(
  conversationId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (count && count >= SUMMARY_TRIGGER_MESSAGES) {
    // Check if we've summarized recently
    const { data: conv } = await supabase
      .from("conversations")
      .select("summary, updated_at")
      .eq("id", conversationId)
      .single();

    const lastUpdate = conv?.updated_at ? new Date(conv.updated_at).getTime() : 0;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;

    // Only re-summarize if it's been more than 5 minutes
    if (lastUpdate < fiveMinAgo) {
      await summarizeConversation(conversationId);
    }
  }
}

// ──────────────────────────────────────────
// Token-aware trimming
// ──────────────────────────────────────────

function trimToTokenBudget(
  messages: ChatCompletionMessage[],
  summary: string | null,
  maxTokens: number,
): { messages: ChatCompletionMessage[]; totalTokens: number } {
  // Trim from the oldest messages first
  const trimmed: ChatCompletionMessage[] = [];
  let totalTokens = summary ? estimateTokens(summary) : 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (totalTokens + msgTokens > maxTokens) break;
    trimmed.unshift(messages[i]);
    totalTokens += msgTokens;
  }

  return { messages: trimmed, totalTokens };
}

// ──────────────────────────────────────────
// Context builder for the LLM
// ──────────────────────────────────────────

/**
 * Format memory context into a system prompt prefix.
 */
export function formatMemoryForPrompt(memory: MemoryContext): string {
  let contextBlock = "";

  if (memory.longTermSummary) {
    contextBlock += `\n\n<conversation_memory>\n${memory.longTermSummary}\n</conversation_memory>`;
  }

  return contextBlock;
}
