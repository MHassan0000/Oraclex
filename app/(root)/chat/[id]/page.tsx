import { ChatPageClient } from "@/components/chat/chat-page-client";
import { getDocumentsAction } from "@/lib/actions/document-actions";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import { getMessages } from "@/lib/db/messages";
import type { Conversation, Document, Message } from "@/lib/db/types";

type ChatThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { id } = await params;
  await requireUser(`/chat/${id}`);

  let conversations: Conversation[] = [];
  let messages: Message[] = [];
  let documents: Document[] = [];
  try {
    conversations = await getConversations();
  } catch {
    // Keep the thread usable even if history is temporarily unavailable.
  }

  try {
    messages = await getMessages(id);
  } catch {
    // Fall through with empty messages.
  }

  try {
    documents = await getDocumentsAction();
  } catch {
    // Keep report generation optional if document metadata is unavailable.
  }

  return (
    <ChatPageClient
      key={id}
      activeConversationId={id}
      initialConversations={conversations}
      initialMessages={messages}
      initialDocuments={documents}
    />
  );
}
