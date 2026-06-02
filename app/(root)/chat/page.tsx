import { ChatPageClient } from "@/components/chat/chat-page-client";
import { isAdminUser } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import type { Conversation } from "@/lib/db/types";

export default async function ChatPage() {
  const user = await requireUser("/chat");

  let conversations: Conversation[] = [];
  try {
    conversations = await getConversations();
  } catch {
    // Fall through with empty array
  }

  return (
    <ChatPageClient
      initialConversations={conversations}
      isAdmin={isAdminUser(user)}
    />
  );
}
