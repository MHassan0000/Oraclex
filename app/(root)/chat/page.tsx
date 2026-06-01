import { ChatPageClient } from "@/components/chat/chat-page-client";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import type { Conversation } from "@/lib/db/types";

export default async function ChatPage() {
  await requireUser("/chat");

  let conversations: Conversation[] = [];
  try {
    conversations = await getConversations();
  } catch {
    // Fall through with empty array
  }

  return (
    <ChatPageClient
      initialConversations={conversations}
    />
  );
}
