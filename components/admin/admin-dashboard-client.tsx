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
  RecentConversation,
  RecentDocument,
  SystemHealth,
} from "@/lib/db/analytics";

type AdminDashboardClientProps = {
  stats: OverviewStats;
  health: SystemHealth;
  tokenUsage: TokenUsageByDay[];
  modelUsage: ModelUsage[];
  uploadStats: UploadStats[];
  conversationStats: ConversationStats[];
  recentConversations: RecentConversation[];
  recentDocuments: RecentDocument[];
  generatedAt: string;
};

function ChartCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 min-w-0">
        <h3 className="truncate text-sm font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-xs text-gray-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function healthClasses(status: SystemHealth["status"]): string {
  if (status === "degraded") return "border-red-200 bg-red-50 text-red-700";
  if (status === "attention") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function healthDotClasses(status: SystemHealth["status"]): string {
  if (status === "degraded") return "bg-red-500";
  if (status === "attention") return "bg-amber-500";
  return "bg-emerald-500";
}

function statusPillClasses(status: RecentDocument["status"]): string {
  switch (status) {
    case "ready":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "processing":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "failed":
      return "bg-red-50 text-red-700 ring-red-200";
    case "archived":
      return "bg-gray-100 text-gray-600 ring-gray-200";
  }
}

function formatIsoDate(value: string | null): string {
  if (!value) return "No activity";
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}

function formatGeneratedAt(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function displayUser(email: string | null, userId: string): string {
  return email ?? `User ${userId.slice(0, 8)}`;
}

export function AdminDashboardClient({
  stats,
  health,
  tokenUsage,
  modelUsage,
  uploadStats,
  conversationStats,
  recentConversations,
  recentDocuments,
  generatedAt,
}: AdminDashboardClientProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-50">
              <Image
                src="/images/oraclex-logo.png"
                alt="Oraclex"
                width={30}
                height={30}
                className="rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                Oraclex Admin
              </p>
              <h1 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">
                Operations Dashboard
              </h1>
              <p className="text-xs text-slate-500">
                Supabase service-role analytics · refreshed {formatGeneratedAt(generatedAt)}
              </p>
            </div>
          </div>

          <div className="lg:ml-auto">
            <div className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${healthClasses(health.status)}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${healthDotClasses(health.status)}`} />
              <span className="truncate">{health.label}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-950">System Health</h2>
              <p className="mt-1 text-sm text-slate-500">{health.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[34rem]">
              <HealthMetric label="Running runs" value={stats.runningAgentRuns} />
              <HealthMetric label="Failed runs" value={stats.failedAgentRuns} />
              <HealthMetric label="Processing docs" value={stats.processingDocuments} />
              <HealthMetric label="Failed docs" value={stats.failedDocuments} />
            </div>
          </div>
        </section>

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Token Usage" subtitle="Daily usage over the last 30 days">
            <TokenUsageChart data={tokenUsage} />
          </ChartCard>
          <ChartCard title="AI Cost Tracking" subtitle="Costs recorded from usage logs">
            <CostChart data={tokenUsage} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Model Usage" subtitle="Top models by completed requests">
            <ModelUsageChart data={modelUsage} />
          </ChartCard>
          <ChartCard title="Document Uploads" subtitle="Ready, processing, and failed documents">
            <UploadChart data={uploadStats} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Conversations And Messages" subtitle="Workspace activity over the last 30 days">
            <ConversationChart data={conversationStats} />
          </ChartCard>
          <RecentConversationsCard conversations={recentConversations} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
          <ModelCostTable modelUsage={modelUsage} />
          <RecentDocumentsCard documents={recentDocuments} />
        </div>
      </main>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[0.68rem] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

function RecentConversationsCard({ conversations }: { conversations: RecentConversation[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Recent Conversations</h3>
        <p className="mt-1 text-xs text-gray-400">Latest conversation activity across users</p>
      </div>
      {conversations.length === 0 ? (
        <EmptyPanel label="No conversations yet" />
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{conversation.title}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {displayUser(conversation.userEmail, conversation.userId)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
                  {conversation.messageCount} msgs
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Last activity {formatIsoDate(conversation.lastMessageAt ?? conversation.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentDocumentsCard({ documents }: { documents: RecentDocument[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Recent Documents</h3>
        <p className="mt-1 text-xs text-gray-400">Latest knowledge base ingestion state</p>
      </div>
      {documents.length === 0 ? (
        <EmptyPanel label="No documents uploaded yet" />
      ) : (
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {documents.map((document) => (
            <div key={document.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{document.title}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {document.fileName ?? "Untitled file"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ring-1 ${statusPillClasses(document.status)}`}>
                  {document.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-gray-200">
                  {displayUser(document.userEmail, document.userId)}
                </span>
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-gray-200">
                  {(document.tokenCount ?? 0).toLocaleString()} tokens
                </span>
                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-gray-200">
                  {document.retrievalMode ?? "pending"} retrieval
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ModelCostTable({ modelUsage }: { modelUsage: ModelUsage[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Model Cost Breakdown</h3>
        <p className="mt-1 text-xs text-gray-400">Requests, tokens, and cost from usage logs</p>
      </div>
      {modelUsage.length === 0 ? (
        <EmptyPanel label="No model usage recorded yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
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
                  <td className="max-w-[22rem] truncate py-3 font-medium text-gray-800">{row.model}</td>
                  <td className="py-3 text-right text-gray-600">{row.count.toLocaleString()}</td>
                  <td className="py-3 text-right text-gray-600">{row.tokens.toLocaleString()}</td>
                  <td className="py-3 text-right font-medium text-gray-800">${row.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
