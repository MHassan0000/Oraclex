"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/session";
import {
  createConversation,
  deleteConversation,
  updateConversation,
  togglePinConversation,
} from "@/lib/db/conversations";
import {
  createMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/db/messages";
import type { MessageRole } from "@/lib/db/types";

// ──────────────────────────────────────────
// Conversation actions
// ──────────────────────────────────────────

export async function createConversationAction(title: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const conversation = await createConversation({
    user_id: user.id,
    title,
  });

  revalidatePath("/chat");
  return conversation;
}

export async function renameConversationAction(id: string, title: string) {
  const conversation = await updateConversation(id, { title });
  revalidatePath("/chat");
  return conversation;
}

export async function deleteConversationAction(id: string) {
  await deleteConversation(id);
  revalidatePath("/chat");
}

export async function pinConversationAction(id: string, pinned: boolean) {
  const conversation = await togglePinConversation(id, pinned);
  revalidatePath("/chat");
  return conversation;
}

// ──────────────────────────────────────────
// Message actions
// ──────────────────────────────────────────

export async function sendMessageAction(
  conversationId: string,
  content: string,
  role: MessageRole = "user",
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const message = await createMessage({
    user_id: user.id,
    conversation_id: conversationId,
    role,
    content,
    status: "complete",
  });

  revalidatePath(`/chat/${conversationId}`);
  revalidatePath("/chat");
  return message;
}

export async function editMessageAction(id: string, content: string) {
  const message = await updateMessage(id, { content });
  revalidatePath("/chat");
  return message;
}

export async function deleteMessageAction(id: string) {
  await deleteMessage(id);
  revalidatePath("/chat");
}

/**
 * Creates a new conversation with the first user message in a single flow.
 * Returns both the conversation and the message.
 */
export async function createChatAction(content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  // Generate a title from the first ~50 chars of the prompt
  const title =
    content.length > 50
      ? content.slice(0, 50).trim() + "…"
      : content;

  const conversation = await createConversation({
    user_id: user.id,
    title,
  });

  const message = await createMessage({
    user_id: user.id,
    conversation_id: conversation.id,
    role: "user",
    content,
    status: "complete",
  });

  revalidatePath("/chat");
  return { conversation, message };
}
