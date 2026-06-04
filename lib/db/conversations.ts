"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Conversation, ConversationInsert, ConversationUpdate } from "@/lib/db/types";

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

/**
 * Get all conversations for the current user, ordered by pinned first
 * then by most-recent activity.
 */
export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return sortConversations((data ?? []) as Conversation[]);
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

/**
 * Create a new conversation and return it.
 */
export async function createConversation(input: ConversationInsert): Promise<Conversation> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("conversations").insert(input).select().single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Update a conversation (title, pinned state, etc.).
 */
export async function updateConversation(
  id: string,
  userId: string,
  updates: ConversationUpdate,
): Promise<Conversation> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Hard-delete a conversation (cascade deletes messages, etc.).
 */
export async function deleteConversation(id: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (messageError) throw messageError;

  const messageIds = ((messages ?? []) as { id: string }[]).map((message) => message.id);

  const { data: generations, error: generationError } = await supabase
    .from("ai_generations")
    .select("id")
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (generationError) throw generationError;

  const generationIds = new Set(
    ((generations ?? []) as { id: string }[]).map((generation) => generation.id),
  );

  await supabase
    .from("usage_logs")
    .update({ conversation_id: null, message_id: null, generation_id: null })
    .eq("conversation_id", id)
    .eq("user_id", userId);

  await supabase
    .from("agent_runs")
    .update({ conversation_id: null })
    .eq("conversation_id", id)
    .eq("user_id", userId);

  await supabase
    .from("ai_generations")
    .update({ conversation_id: null })
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (messageIds.length > 0) {
    await supabase
      .from("usage_logs")
      .update({ message_id: null })
      .in("message_id", messageIds)
      .eq("user_id", userId);

    const { data: messageGenerations } = await supabase
      .from("ai_generations")
      .select("id")
      .in("message_id", messageIds)
      .eq("user_id", userId);

    const { data: promptGenerations } = await supabase
      .from("ai_generations")
      .select("id")
      .in("prompt_message_id", messageIds)
      .eq("user_id", userId);

    for (const generation of (messageGenerations ?? []) as { id: string }[]) {
      generationIds.add(generation.id);
    }
    for (const generation of (promptGenerations ?? []) as { id: string }[]) {
      generationIds.add(generation.id);
    }

    await supabase
      .from("ai_generations")
      .update({ message_id: null })
      .in("message_id", messageIds)
      .eq("user_id", userId);

    await supabase
      .from("ai_generations")
      .update({ prompt_message_id: null })
      .in("prompt_message_id", messageIds)
      .eq("user_id", userId);
  }

  if (generationIds.size > 0) {
    await supabase
      .from("usage_logs")
      .update({ generation_id: null })
      .in("generation_id", Array.from(generationIds))
      .eq("user_id", userId);
  }

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Toggle the pinned state of a conversation.
 */
export async function togglePinConversation(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<Conversation> {
  return updateConversation(id, userId, { pinned });
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    const aTime = Date.parse(a.last_message_at ?? a.created_at) || 0;
    const bTime = Date.parse(b.last_message_at ?? b.created_at) || 0;
    return bTime - aTime;
  });
}
