import { ChatPageClient } from "@/components/chat/chat-page-client";
import { requireUser } from "@/lib/auth/session";

export default async function ChatPage() {
  await requireUser("/chat");

  return (
    <ChatPageClient
      key="new-chat"
      initialConversations={[]}
    />
  );
}
