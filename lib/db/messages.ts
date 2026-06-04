"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Message, MessageUpdate } from "@/lib/db/types";

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

/**
 * Get all messages for a conversation, ordered chronologically.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

/**
 * Update a message (content, status, etc.).
 */
export async function updateMessage(
  id: string,
  userId: string,
  updates: MessageUpdate,
): Promise<Message> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}
