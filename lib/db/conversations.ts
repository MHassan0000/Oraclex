"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Conversation,
  ConversationInsert,
  ConversationUpdate,
} from "@/lib/db/types";

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
  return (data ?? []) as Conversation[];
}

/**
 * Get a single conversation by id.
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Conversation) ?? null;
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

/**
 * Create a new conversation and return it.
 */
export async function createConversation(
  input: ConversationInsert,
): Promise<Conversation> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Update a conversation (title, pinned state, etc.).
 */
export async function updateConversation(
  id: string,
  updates: ConversationUpdate,
): Promise<Conversation> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Hard-delete a conversation (cascade deletes messages, etc.).
 */
export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Toggle the pinned state of a conversation.
 */
export async function togglePinConversation(
  id: string,
  pinned: boolean,
): Promise<Conversation> {
  return updateConversation(id, { pinned });
}
