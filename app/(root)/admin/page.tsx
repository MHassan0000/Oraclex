import { requireAdmin } from "@/lib/auth/admin";
import {
  getOverviewStats,
  getTokenUsageByDay,
  getModelUsageStats,
  getUploadStatsByDay,
  getConversationStatsByDay,
  getRecentConversations,
} from "@/lib/db/analytics";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export default async function AdminPage() {
  await requireAdmin();

  const [stats, tokenUsage, modelUsage, uploadStats, conversationStats, recentConversations] =
    await Promise.all([
      getOverviewStats(),
      getTokenUsageByDay(30),
      getModelUsageStats(),
      getUploadStatsByDay(30),
      getConversationStatsByDay(30),
      getRecentConversations(10),
    ]);

  return (
    <div className="light" data-theme="light">
      <AdminDashboardClient
        stats={stats}
        tokenUsage={tokenUsage}
        modelUsage={modelUsage}
        uploadStats={uploadStats}
        conversationStats={conversationStats}
        recentConversations={recentConversations}
      />
    </div>
  );
}
