"use client";

import Image from "next/image";

import { StatsGrid } from "@/components/admin/stats-grid";
import { TokenUsageChart } from "@/components/admin/token-usage-chart";
import { ModelUsageChart } from "@/components/admin/model-usage-chart";
import { CostChart } from "@/components/admin/cost-chart";
import { ConversationChart } from "@/components/admin/conversation-chart";
import { UploadChart } from "@/components/admin/upload-chart";
import type {
  OverviewStats,
  TokenUsageByDay,
  ModelUsage,
  UploadStats,
  ConversationStats,
} from "@/lib/db/analytics";

type AdminDashboardClientProps = {
  stats: OverviewStats;
  tokenUsage: TokenUsageByDay[];
  modelUsage: ModelUsage[];
  uploadStats: UploadStats[];
  conversationStats: ConversationStats[];
  recentConversations: { id: string; title: string; created_at: string; last_message_at: string | null }[];
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function AdminDashboardClient({
  stats,
  tokenUsage,
  modelUsage,
  uploadStats,
  conversationStats,
  recentConversations,
}: AdminDashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 overflow-hidden">
            <Image
              src="/images/oraclex-logo.png"
              alt="Oraclex"
              width={28}
              height={28}
              className="rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Oraclex Analytics & Monitoring</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              System Healthy
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
        {/* Overview Stats */}
        <StatsGrid stats={stats} />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Token Usage (30 Days)">
            <TokenUsageChart data={tokenUsage} />
          </ChartCard>
          <ChartCard title="AI Cost Tracking (30 Days)">
            <CostChart data={tokenUsage} />
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Model Usage Breakdown">
            <ModelUsageChart data={modelUsage} />
          </ChartCard>
          <ChartCard title="Document Uploads (30 Days)">
            <UploadChart data={uploadStats} />
          </ChartCard>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Conversations & Messages (30 Days)">
            <ConversationChart data={conversationStats} />
          </ChartCard>

          {/* Recent Conversations */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Recent Conversations
            </h3>
            {recentConversations.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-sm text-gray-400">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-100/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No messages"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Model Usage Table */}
        {modelUsage.length > 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Model Cost Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 font-semibold text-gray-500">Model</th>
                    <th className="pb-3 text-right font-semibold text-gray-500">Requests</th>
                    <th className="pb-3 text-right font-semibold text-gray-500">Tokens</th>
                    <th className="pb-3 text-right font-semibold text-gray-500">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {modelUsage.map((row) => (
                    <tr key={row.model} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 font-medium text-gray-800">{row.model}</td>
                      <td className="py-3 text-right text-gray-600">{row.count.toLocaleString()}</td>
                      <td className="py-3 text-right text-gray-600">{row.tokens.toLocaleString()}</td>
                      <td className="py-3 text-right font-medium text-gray-800">${row.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
