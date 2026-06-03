import { ConversationHistoryClient } from "@/components/chat/conversation-history-client";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import type { Conversation } from "@/lib/db/types";

export default async function HistoryPage() {
  await requireUser("/history");

  let conversations: Conversation[] = [];
  try {
    conversations = await getConversations();
  } catch {
    // Fall through with empty state.
  }

  return <ConversationHistoryClient initialConversations={conversations} />;
}
