"use client";

import { ChatShell } from "@/components/chat/chat-shell";
import { ChatErrorState } from "@/components/chat/error-state";

export default function ChatError() {
  return (
    <ChatShell conversations={[]}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6">
        <ChatErrorState />
      </div>
    </ChatShell>
  );
}
