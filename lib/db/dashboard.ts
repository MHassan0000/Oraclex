import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WorkspaceDashboardData = {
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  readyDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  totalTokens: number;
  totalCostUsd: number;
  retrievalRuns: number;
};

export async function getWorkspaceDashboardData(): Promise<WorkspaceDashboardData> {
  const supabase = await createServerSupabaseClient();

  const [conversations, messages, documents, ready, processing, failed, usage] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "ready"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("usage_logs").select("tokens, cost_usd"),
  ]);

  const usageLogs = usage.data ?? [];
  const totalTokens = usageLogs.reduce(
    (sum: number, row: { tokens?: number | string | null }) => sum + Number(row.tokens ?? 0),
    0,
  );
  const totalCostUsd = usageLogs.reduce(
    (sum: number, row: { cost_usd?: number | string | null }) => sum + Number(row.cost_usd ?? 0),
    0,
  );

  return {
    totalConversations: conversations.count ?? 0,
    totalMessages: messages.count ?? 0,
    totalDocuments: documents.count ?? 0,
    readyDocuments: ready.count ?? 0,
    processingDocuments: processing.count ?? 0,
    failedDocuments: failed.count ?? 0,
    totalTokens,
    totalCostUsd,
    retrievalRuns: usageLogs.length,
  };
}
