"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Message, MessageInsert, MessageUpdate } from "@/lib/db/types";

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

/**
 * Get a single message by id.
 */
export async function getMessage(id: string): Promise<Message | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Message) ?? null;
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

/**
 * Insert a new message and update the parent conversation's
 * last_message_at timestamp.
 */
export async function createMessage(input: MessageInsert): Promise<Message> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  // Update conversation last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", input.conversation_id);

  return data as Message;
}

/**
 * Update a message (content, status, etc.).
 */
export async function updateMessage(
  id: string,
  updates: MessageUpdate,
): Promise<Message> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Delete a message by id.
 */
export async function deleteMessage(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw error;
}
