export type ChatRole = "assistant" | "user" | "system";

export type ChatAttachment = {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  edited?: boolean;
  error?: boolean;
  citations?: Array<{ id: string; label: string; url?: string }>;
  attachments?: ChatAttachment[];
};

export type ChatConversation = {
  id: string;
  title: string;
  lastMessageAt: string;
  pinned?: boolean;
  preview?: string;
  messageCount?: number;
};

export type ChatSearchResult = {
  id: string;
  title: string;
  snippet?: string;
  lastMessageAt: string;
};
