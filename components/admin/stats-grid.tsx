"use client";

import {
  MessageSquare,
  FileText,
  Users,
  Coins,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react";
import type { OverviewStats } from "@/lib/db/analytics";

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
};

function StatCard({ label, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

type StatsGridProps = {
  stats: OverviewStats;
};

export function StatsGrid({ stats }: StatsGridProps) {
  const cards: StatCardProps[] = [
    {
      label: "Users",
      value: stats.totalUsers.toLocaleString(),
      subtitle: `${stats.activeUsers.toLocaleString()} active in 30 days`,
      icon: <Users className="h-5 w-5" />,
      color: "#10b981",
    },
    {
      label: "Conversations",
      value: stats.totalConversations.toLocaleString(),
      subtitle: `${stats.totalMessages.toLocaleString()} total messages`,
      icon: <MessageSquare className="h-5 w-5" />,
      color: "#6366f1",
    },
    {
      label: "Documents",
      value: stats.totalDocuments.toLocaleString(),
      subtitle: `${stats.readyDocuments} ready · ${stats.processingDocuments} processing · ${stats.failedDocuments} failed`,
      icon: <FileText className="h-5 w-5" />,
      color: "#3b82f6",
    },
    {
      label: "RAG Index",
      value: stats.totalChunks.toLocaleString(),
      subtitle: `${stats.totalEmbeddings.toLocaleString()} embeddings · ${stats.keywordReadyDocuments} keyword docs`,
      icon: <Database className="h-5 w-5" />,
      color: "#8b5cf6",
    },
    {
      label: "Tokens Used",
      value: stats.totalTokensUsed >= 1000000
        ? `${(stats.totalTokensUsed / 1000000).toFixed(1)}M`
        : stats.totalTokensUsed >= 1000
          ? `${(stats.totalTokensUsed / 1000).toFixed(1)}k`
          : stats.totalTokensUsed.toString(),
      icon: <Activity className="h-5 w-5" />,
      color: "#f59e0b",
    },
    {
      label: "Total Cost",
      value: `$${stats.totalCostUsd.toFixed(4)}`,
      icon: <Coins className="h-5 w-5" />,
      color: "#ef4444",
    },
    {
      label: "Agent Runs",
      value: stats.succeededAgentRuns.toLocaleString(),
      subtitle: `${stats.runningAgentRuns} running · ${stats.failedAgentRuns} failed`,
      icon: stats.failedAgentRuns > 0 ? <AlertCircle className="h-5 w-5" /> : <Bot className="h-5 w-5" />,
      color: stats.failedAgentRuns > 0 ? "#ef4444" : "#14b8a6",
    },
    {
      label: "Ready State",
      value: stats.failedDocuments + stats.failedAgentRuns === 0 ? "Clear" : "Review",
      subtitle: `${stats.vectorReadyDocuments} vector docs ready`,
      icon: stats.failedDocuments + stats.failedAgentRuns === 0
        ? <CheckCircle2 className="h-5 w-5" />
        : <AlertCircle className="h-5 w-5" />,
      color: stats.failedDocuments + stats.failedAgentRuns === 0 ? "#22c55e" : "#f97316",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
