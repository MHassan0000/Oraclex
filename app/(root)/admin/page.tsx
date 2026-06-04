import { requireAdmin } from "@/lib/auth/admin";
import {
  getOverviewStats,
  getTokenUsageByDay,
  getModelUsageStats,
  getUploadStatsByDay,
  getConversationStatsByDay,
  getRecentConversations,
  getRecentDocuments,
  getSystemHealth,
} from "@/lib/db/analytics";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export default async function AdminPage() {
  await requireAdmin();

  const [
    stats,
    tokenUsage,
    modelUsage,
    uploadStats,
    conversationStats,
    recentConversations,
    recentDocuments,
  ] = await Promise.all([
    getOverviewStats(),
    getTokenUsageByDay(30),
    getModelUsageStats(),
    getUploadStatsByDay(30),
    getConversationStatsByDay(30),
    getRecentConversations(10),
    getRecentDocuments(8),
  ]);
  const health = getSystemHealth(stats);

  return (
    <div className="light" data-theme="light">
      <AdminDashboardClient
        stats={stats}
        health={health}
        tokenUsage={tokenUsage}
        modelUsage={modelUsage}
        uploadStats={uploadStats}
        conversationStats={conversationStats}
        recentConversations={recentConversations}
        recentDocuments={recentDocuments}
        generatedAt={new Date().toISOString()}
      />
    </div>
  );
}
