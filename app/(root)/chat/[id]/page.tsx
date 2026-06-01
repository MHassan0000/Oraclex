import { ChatPageClient } from "@/components/chat/chat-page-client";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/db/conversations";
import { getMessages } from "@/lib/db/messages";
import type { Conversation, Message } from "@/lib/db/types";

type ChatThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { id } = await params;
  await requireUser(`/chat/${id}`);

  let conversations: Conversation[] = [];
  let messages: Message[] = [];
  try {
    [conversations, messages] = await Promise.all([
      getConversations(),
      getMessages(id),
    ]);
  } catch {
    // Fall through with empty arrays
  }

  return (
    <ChatPageClient
      activeConversationId={id}
      initialConversations={conversations}
      initialMessages={messages}
    />
  );
}
