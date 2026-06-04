"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/session";
import {
  createConversation,
  deleteConversation,
  updateConversation,
  togglePinConversation,
} from "@/lib/db/conversations";
import { updateMessage } from "@/lib/db/messages";
import { sanitizeText } from "@/lib/security/schemas";

// ──────────────────────────────────────────
// Conversation actions
// ──────────────────────────────────────────

export async function createConversationAction(title: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  const safeTitle = sanitizeText(title).slice(0, 255) || "New conversation";

  const conversation = await createConversation({
    user_id: user.id,
    title: safeTitle,
  });

  return conversation;
}

export async function renameConversationAction(id: string, title: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  const safeTitle = sanitizeText(title).slice(0, 255);
  if (!safeTitle) throw new Error("Title required");

  const conversation = await updateConversation(id, user.id, { title: safeTitle });
  revalidatePath("/chat");
  revalidatePath("/history");
  return conversation;
}

export async function deleteConversationAction(id: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await deleteConversation(id, user.id);
  revalidatePath("/chat");
  revalidatePath("/history");
}

export async function pinConversationAction(id: string, pinned: boolean) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const conversation = await togglePinConversation(id, user.id, pinned);
  revalidatePath("/chat");
  revalidatePath("/history");
  return conversation;
}

// ──────────────────────────────────────────
// Message actions
// ──────────────────────────────────────────

export async function editMessageAction(id: string, content: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  const safeContent = sanitizeText(content);
  if (!safeContent) throw new Error("Message cannot be empty");

  const message = await updateMessage(id, user.id, { content: safeContent });
  revalidatePath("/chat");
  return message;
}
