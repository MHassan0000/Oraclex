/**
 * TypeScript types matching the PostgreSQL schema defined in
 * supabase/migrations/20260528120000_rag_schema.sql
 */

// ──────────────────────────────────────────
// Enum types (mirror the SQL custom enums)
// ──────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";
export type MessageStatus = "draft" | "streaming" | "complete" | "error";
export type DocumentStatus = "processing" | "ready" | "failed" | "archived";
export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

// ──────────────────────────────────────────
// Row types
// ──────────────────────────────────────────

export type Profile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  user_id: string;
  theme: string | null;
  rag: Record<string, unknown>;
  notifications: Record<string, unknown>;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  last_message_at: string | null;
  pinned: boolean;
  archived: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  user_id: string;
  conversation_id: string;
  role: MessageRole;
  status: MessageStatus;
  content: string;
  model: string | null;
  token_count: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  title: string;
  source: string | null;
  file_name: string | null;
  file_type: string | null;
  status: DocumentStatus;
  token_count: number | null;
  checksum: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentChunk = {
  id: string;
  user_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Embedding = {
  id: string;
  user_id: string;
  chunk_id: string;
  embedding: number[];
  model: string;
  provider: string | null;
  dimensions: number;
  content_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AiGeneration = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  prompt_message_id: string | null;
  model: string | null;
  provider: string | null;
  temperature: number | null;
  max_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UsageLog = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  generation_id: string | null;
  event_type: string;
  tokens: number | null;
  cost_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentRun = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  document_id: string | null;
  status: AgentRunStatus;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────
// Insert helpers (omit server-set fields)
// ──────────────────────────────────────────

export type ConversationInsert = {
  id?: string;
  user_id: string;
  title: string;
  summary?: string | null;
  pinned?: boolean;
  archived?: boolean;
  metadata?: Record<string, unknown>;
};

export type MessageInsert = {
  id?: string;
  user_id: string;
  conversation_id: string;
  role: MessageRole;
  status?: MessageStatus;
  content: string;
  model?: string | null;
  token_count?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  metadata?: Record<string, unknown>;
};

export type ConversationUpdate = {
  title?: string;
  summary?: string | null;
  pinned?: boolean;
  archived?: boolean;
  last_message_at?: string;
  metadata?: Record<string, unknown>;
};

export type MessageUpdate = {
  content?: string;
  status?: MessageStatus;
  model?: string | null;
  token_count?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  metadata?: Record<string, unknown>;
};

// ──────────────────────────────────────────
// RPC / function return types
// ──────────────────────────────────────────

export type MatchChunkResult = {
  chunk_id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};
