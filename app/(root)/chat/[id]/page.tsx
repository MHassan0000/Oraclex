import { ChatPageClient } from "@/components/chat/chat-page-client";
import { requireUser } from "@/lib/auth/session";
import { getMessages } from "@/lib/db/messages";
import type { Message } from "@/lib/db/types";

type ChatThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { id } = await params;
  await requireUser(`/chat/${id}`);

  let messages: Message[] = [];
  try {
    messages = await getMessages(id);
  } catch {
    // Fall through with empty array
  }

  return (
    <ChatPageClient
      activeConversationId={id}
      initialConversations={[]}
      initialMessages={messages}
    />
  );
}
