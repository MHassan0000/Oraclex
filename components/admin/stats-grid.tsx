"use client";

import {
  MessageSquare,
  FileText,
  Users,
  Coins,
  Zap,
  HardDrive,
  CheckCircle2,
  AlertCircle,
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
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
      label: "Total Conversations",
      value: stats.totalConversations.toLocaleString(),
      icon: <MessageSquare className="h-5 w-5" />,
      color: "#6366f1",
    },
    {
      label: "Total Messages",
      value: stats.totalMessages.toLocaleString(),
      icon: <Zap className="h-5 w-5" />,
      color: "#8b5cf6",
    },
    {
      label: "Active Users",
      value: stats.activeUsers.toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      color: "#10b981",
    },
    {
      label: "Documents",
      value: stats.totalDocuments.toLocaleString(),
      subtitle: `${stats.readyDocuments} ready · ${stats.failedDocuments} failed`,
      icon: <FileText className="h-5 w-5" />,
      color: "#3b82f6",
    },
    {
      label: "Tokens Used",
      value: stats.totalTokensUsed >= 1000000
        ? `${(stats.totalTokensUsed / 1000000).toFixed(1)}M`
        : stats.totalTokensUsed >= 1000
          ? `${(stats.totalTokensUsed / 1000).toFixed(1)}k`
          : stats.totalTokensUsed.toString(),
      icon: <HardDrive className="h-5 w-5" />,
      color: "#f59e0b",
    },
    {
      label: "Total Cost",
      value: `$${stats.totalCostUsd.toFixed(4)}`,
      icon: <Coins className="h-5 w-5" />,
      color: "#ef4444",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
