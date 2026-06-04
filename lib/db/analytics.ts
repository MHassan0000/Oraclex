import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DocumentStatus } from "@/lib/db/types";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export type OverviewStats = {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  readyDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  runningAgentRuns: number;
  failedAgentRuns: number;
  succeededAgentRuns: number;
  vectorReadyDocuments: number;
  keywordReadyDocuments: number;
};

export type TokenUsageByDay = {
  date: string;
  tokens: number;
  cost: number;
};

export type ModelUsage = {
  model: string;
  count: number;
  tokens: number;
  cost: number;
};

export type UploadStats = {
  date: string;
  uploads: number;
  ready: number;
  processing: number;
  failed: number;
};

export type ConversationStats = {
  date: string;
  conversations: number;
  messages: number;
};

export type SystemHealth = {
  status: "healthy" | "attention" | "degraded";
  label: string;
  description: string;
};

export type RecentConversation = {
  id: string;
  title: string;
  userId: string;
  userEmail: string | null;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string | null;
};

export type RecentDocument = {
  id: string;
  title: string;
  fileName: string | null;
  status: DocumentStatus;
  userId: string;
  userEmail: string | null;
  tokenCount: number | null;
  retrievalMode: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsageLogRow = {
  tokens: number | null;
  cost_usd: number | null;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
};

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string | null;
  user_id: string;
};

type MessageConversationRow = {
  conversation_id: string;
  user_id?: string;
  created_at?: string;
};

type DocumentRow = {
  id: string;
  title: string;
  file_name: string | null;
  status: DocumentStatus;
  user_id: string;
  token_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const DAY_MS = 86_400_000;

function getDateRange(days: number): string[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return date.toISOString().slice(0, 10);
  });
}

function sinceIso(days: number): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));
  return start.toISOString();
}

function emailMap(profiles: ProfileRow[]): Map<string, string | null> {
  return new Map(profiles.map((profile) => [profile.user_id, profile.email]));
}

function getRetrievalMode(metadata: Record<string, unknown> | null): string | null {
  const mode = metadata?.retrieval_mode;
  return typeof mode === "string" ? mode : null;
}

function toNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createAdminSupabaseClient();
  const activeSince = sinceIso(30);

  const [
    convRes,
    msgRes,
    docRes,
    usageRes,
    usersRes,
    readyRes,
    processingRes,
    failedRes,
    chunksRes,
    embeddingsRes,
    runningRunsRes,
    failedRunsRes,
    succeededRunsRes,
    activeConversationsRes,
    activeMessagesRes,
    activeDocumentsRes,
    documentsMetadataRes,
  ] =
    await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("usage_logs").select("tokens, cost_usd"),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "ready"),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "processing"),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("document_chunks").select("id", { count: "exact", head: true }),
      supabase.from("embeddings").select("id", { count: "exact", head: true }),
      supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "running"),
      supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("status", "succeeded"),
      supabase.from("conversations").select("user_id").gte("created_at", activeSince),
      supabase.from("messages").select("user_id").gte("created_at", activeSince),
      supabase.from("documents").select("user_id").gte("created_at", activeSince),
      supabase.from("documents").select("metadata").eq("status", "ready"),
    ]);

  const usageLogs = (usageRes.data ?? []) as UsageLogRow[];
  const totalTokens = usageLogs.reduce((sum, row) => sum + toNumber(row.tokens), 0);
  const totalCost = usageLogs.reduce((sum, row) => sum + toNumber(row.cost_usd), 0);
  const activeUserIds = new Set<string>();

  for (const row of activeConversationsRes.data ?? []) activeUserIds.add((row as { user_id: string }).user_id);
  for (const row of activeMessagesRes.data ?? []) activeUserIds.add((row as { user_id: string }).user_id);
  for (const row of activeDocumentsRes.data ?? []) activeUserIds.add((row as { user_id: string }).user_id);

  const readyDocumentMetadata = (documentsMetadataRes.data ?? []) as Array<{
    metadata: Record<string, unknown> | null;
  }>;
  const vectorReadyDocuments = readyDocumentMetadata.filter(
    (document) => getRetrievalMode(document.metadata) === "vector",
  ).length;
  const keywordReadyDocuments = readyDocumentMetadata.filter(
    (document) => getRetrievalMode(document.metadata) === "keyword",
  ).length;

  return {
    totalUsers: usersRes.count ?? 0,
    activeUsers: activeUserIds.size,
    totalConversations: convRes.count ?? 0,
    totalMessages: msgRes.count ?? 0,
    totalDocuments: docRes.count ?? 0,
    readyDocuments: readyRes.count ?? 0,
    processingDocuments: processingRes.count ?? 0,
    failedDocuments: failedRes.count ?? 0,
    totalChunks: chunksRes.count ?? 0,
    totalEmbeddings: embeddingsRes.count ?? 0,
    totalTokensUsed: totalTokens,
    totalCostUsd: totalCost,
    runningAgentRuns: runningRunsRes.count ?? 0,
    failedAgentRuns: failedRunsRes.count ?? 0,
    succeededAgentRuns: succeededRunsRes.count ?? 0,
    vectorReadyDocuments,
    keywordReadyDocuments,
  };
}

export function getSystemHealth(stats: OverviewStats): SystemHealth {
  if (stats.failedAgentRuns > 0 || stats.failedDocuments > 0) {
    return {
      status: "degraded",
      label: "Needs attention",
      description: `${stats.failedAgentRuns} failed agent runs · ${stats.failedDocuments} failed documents`,
    };
  }

  if (stats.processingDocuments > 0 || stats.runningAgentRuns > 0) {
    return {
      status: "attention",
      label: "Work in progress",
      description: `${stats.runningAgentRuns} active runs · ${stats.processingDocuments} documents processing`,
    };
  }

  return {
    status: "healthy",
    label: "Healthy",
    description: "No failed documents or failed agent runs detected",
  };
}

export async function getTokenUsageByDay(days: number = 30): Promise<TokenUsageByDay[]> {
  const supabase = createAdminSupabaseClient();
  const since = sinceIso(days);

  const { data } = await supabase
    .from("usage_logs")
    .select("tokens, cost_usd, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, { tokens: number; cost: number }>();
  for (const row of (data ?? []) as UsageLogRow[]) {
    const date = row.created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { tokens: 0, cost: 0 };
    grouped.set(date, {
      tokens: existing.tokens + toNumber(row.tokens),
      cost: existing.cost + toNumber(row.cost_usd),
    });
  }

  return getDateRange(days).map((date) => {
    const vals = grouped.get(date) ?? { tokens: 0, cost: 0 };
    return {
      date,
      tokens: vals.tokens,
      cost: Math.round(vals.cost * 10000) / 10000,
    };
  });
}

export async function getModelUsageStats(): Promise<ModelUsage[]> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("usage_logs")
    .select("tokens, cost_usd, metadata");

  const grouped = new Map<string, { count: number; tokens: number; cost: number }>();
  for (const row of (data ?? []) as UsageLogRow[]) {
    const rawModel = row.metadata?.model;
    const model = typeof rawModel === "string" && rawModel.trim() ? rawModel : "unknown";
    const existing = grouped.get(model) ?? { count: 0, tokens: 0, cost: 0 };
    grouped.set(model, {
      count: existing.count + 1,
      tokens: existing.tokens + toNumber(row.tokens),
      cost: existing.cost + toNumber(row.cost_usd),
    });
  }

  return Array.from(grouped.entries())
    .map(([model, vals]) => ({
      model: model.split("/").pop() ?? model,
      ...vals,
      cost: Math.round(vals.cost * 10000) / 10000,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getUploadStatsByDay(days: number = 30): Promise<UploadStats[]> {
  const supabase = createAdminSupabaseClient();
  const since = sinceIso(days);

  const { data } = await supabase
    .from("documents")
    .select("status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, { uploads: number; ready: number; processing: number; failed: number }>();
  for (const row of (data ?? []) as Array<{ status: DocumentStatus; created_at: string }>) {
    const date = row.created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { uploads: 0, ready: 0, processing: 0, failed: 0 };
    grouped.set(date, {
      uploads: existing.uploads + 1,
      ready: existing.ready + (row.status === "ready" ? 1 : 0),
      processing: existing.processing + (row.status === "processing" ? 1 : 0),
      failed: existing.failed + (row.status === "failed" ? 1 : 0),
    });
  }

  return getDateRange(days).map((date) => ({
    date,
    ...(grouped.get(date) ?? { uploads: 0, ready: 0, processing: 0, failed: 0 }),
  }));
}

export async function getConversationStatsByDay(days: number = 30): Promise<ConversationStats[]> {
  const supabase = createAdminSupabaseClient();
  const since = sinceIso(days);

  const [convData, msgData] = await Promise.all([
    supabase
      .from("conversations")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("messages")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  const grouped = new Map<string, { conversations: number; messages: number }>();

  for (const row of (convData.data ?? []) as Array<{ created_at: string }>) {
    const date = row.created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { conversations: 0, messages: 0 };
    grouped.set(date, { ...existing, conversations: existing.conversations + 1 });
  }

  for (const row of (msgData.data ?? []) as Array<{ created_at: string }>) {
    const date = row.created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { conversations: 0, messages: 0 };
    grouped.set(date, { ...existing, messages: existing.messages + 1 });
  }

  return getDateRange(days).map((date) => ({
    date,
    ...(grouped.get(date) ?? { conversations: 0, messages: 0 }),
  }));
}

export async function getRecentConversations(limit: number = 10): Promise<RecentConversation[]> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("conversations")
    .select("id, title, created_at, last_message_at, user_id")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const conversations = (data ?? []) as ConversationRow[];
  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((conversation) => conversation.id);
  const userIds = [...new Set(conversations.map((conversation) => conversation.user_id))];

  const [profilesRes, messagesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, email").in("user_id", userIds),
    supabase.from("messages").select("conversation_id").in("conversation_id", conversationIds),
  ]);

  const profiles = emailMap((profilesRes.data ?? []) as ProfileRow[]);
  const messageCounts = new Map<string, number>();
  for (const message of (messagesRes.data ?? []) as MessageConversationRow[]) {
    messageCounts.set(message.conversation_id, (messageCounts.get(message.conversation_id) ?? 0) + 1);
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    userId: conversation.user_id,
    userEmail: profiles.get(conversation.user_id) ?? null,
    messageCount: messageCounts.get(conversation.id) ?? 0,
    createdAt: conversation.created_at,
    lastMessageAt: conversation.last_message_at,
  }));
}

export async function getRecentDocuments(limit: number = 8): Promise<RecentDocument[]> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("documents")
    .select("id, title, file_name, status, user_id, token_count, metadata, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  const documents = (data ?? []) as DocumentRow[];
  if (documents.length === 0) return [];

  const userIds = [...new Set(documents.map((document) => document.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds);
  const profiles = emailMap((profilesData ?? []) as ProfileRow[]);

  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    fileName: document.file_name,
    status: document.status,
    userId: document.user_id,
    userEmail: profiles.get(document.user_id) ?? null,
    tokenCount: document.token_count,
    retrievalMode: getRetrievalMode(document.metadata),
    createdAt: document.created_at,
    updatedAt: document.updated_at,
  }));
}
