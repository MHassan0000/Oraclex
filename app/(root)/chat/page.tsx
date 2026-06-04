import { ChatPageClient } from "@/components/chat/chat-page-client";
import { getDocumentsAction } from "@/lib/actions/document-actions";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import type { Conversation, Document } from "@/lib/db/types";

export default async function ChatPage() {
  await requireUser("/chat");

  let conversations: Conversation[] = [];
  let documents: Document[] = [];
  try {
    conversations = await getConversations();
  } catch {
    // Keep the chat usable even if history is temporarily unavailable.
  }

  try {
    documents = await getDocumentsAction();
  } catch {
    // Keep report generation optional if document metadata is unavailable.
  }

  return <ChatPageClient key="new-chat" initialConversations={conversations} initialDocuments={documents} />;
}
