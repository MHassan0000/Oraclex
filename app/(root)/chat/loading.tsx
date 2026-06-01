import { ChatShell } from "@/components/chat/chat-shell";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";

export default function ChatLoading() {
  return (
    <ChatShell conversations={[]}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
        <ChatSkeleton />
      </div>
    </ChatShell>
  );
}
