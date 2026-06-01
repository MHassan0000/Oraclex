import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export type OverviewStats = {
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  activeUsers: number;
  readyDocuments: number;
  failedDocuments: number;
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
  failed: number;
};

export type ConversationStats = {
  date: string;
  conversations: number;
  messages: number;
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createServerSupabaseClient();

  const [convRes, msgRes, docRes, usageRes, usersRes, readyRes, failedRes] =
    await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("usage_logs").select("tokens, cost_usd"),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "ready"),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ]);

  const usageLogs = usageRes.data ?? [];
  const totalTokens = usageLogs.reduce((sum: number, row: any) => sum + (row.tokens ?? 0), 0);
  const totalCost = usageLogs.reduce((sum: number, row: any) => sum + (row.cost_usd ?? 0), 0);

  return {
    totalConversations: convRes.count ?? 0,
    totalMessages: msgRes.count ?? 0,
    totalDocuments: docRes.count ?? 0,
    totalTokensUsed: totalTokens,
    totalCostUsd: totalCost,
    activeUsers: usersRes.count ?? 0,
    readyDocuments: readyRes.count ?? 0,
    failedDocuments: failedRes.count ?? 0,
  };
}

export async function getTokenUsageByDay(days: number = 30): Promise<TokenUsageByDay[]> {
  const supabase = await createServerSupabaseClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("usage_logs")
    .select("tokens, cost_usd, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, { tokens: number; cost: number }>();
  for (const row of data ?? []) {
    const date = (row as any).created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { tokens: 0, cost: 0 };
    grouped.set(date, {
      tokens: existing.tokens + ((row as any).tokens ?? 0),
      cost: existing.cost + ((row as any).cost_usd ?? 0),
    });
  }

  return Array.from(grouped.entries()).map(([date, vals]) => ({
    date,
    tokens: vals.tokens,
    cost: Math.round(vals.cost * 10000) / 10000,
  }));
}

export async function getModelUsageStats(): Promise<ModelUsage[]> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("usage_logs")
    .select("tokens, cost_usd, metadata");

  const grouped = new Map<string, { count: number; tokens: number; cost: number }>();
  for (const row of data ?? []) {
    const model = (row as any).metadata?.model ?? "unknown";
    const existing = grouped.get(model) ?? { count: 0, tokens: 0, cost: 0 };
    grouped.set(model, {
      count: existing.count + 1,
      tokens: existing.tokens + ((row as any).tokens ?? 0),
      cost: existing.cost + ((row as any).cost_usd ?? 0),
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
  const supabase = await createServerSupabaseClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("documents")
    .select("status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, { uploads: number; ready: number; failed: number }>();
  for (const row of data ?? []) {
    const date = (row as any).created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { uploads: 0, ready: 0, failed: 0 };
    grouped.set(date, {
      uploads: existing.uploads + 1,
      ready: existing.ready + ((row as any).status === "ready" ? 1 : 0),
      failed: existing.failed + ((row as any).status === "failed" ? 1 : 0),
    });
  }

  return Array.from(grouped.entries()).map(([date, vals]) => ({ date, ...vals }));
}

export async function getConversationStatsByDay(days: number = 30): Promise<ConversationStats[]> {
  const supabase = await createServerSupabaseClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

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

  for (const row of convData.data ?? []) {
    const date = (row as any).created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { conversations: 0, messages: 0 };
    grouped.set(date, { ...existing, conversations: existing.conversations + 1 });
  }

  for (const row of msgData.data ?? []) {
    const date = (row as any).created_at?.slice(0, 10) ?? "";
    const existing = grouped.get(date) ?? { conversations: 0, messages: 0 };
    grouped.set(date, { ...existing, messages: existing.messages + 1 });
  }

  return Array.from(grouped.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentConversations(limit: number = 10) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("conversations")
    .select("id, title, created_at, last_message_at, user_id")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return data ?? [];
}
