import Link from "next/link";
import { Activity, ArrowUpRight, Bot, Database, FileSearch } from "lucide-react";

import { MetricCard } from "@/app/(root)/_components/metric-card";
import { PipelineCard } from "@/app/(root)/_components/pipeline-card";
import { DashboardHero } from "@/components/sections/dashboard-hero";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/db/dashboard";

function formatNumber(value: number) {
  return value.toLocaleString();
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default async function Home() {
  await requireUser("/");
  const stats = await getWorkspaceDashboardData();
  const readyPercent = percent(stats.readyDocuments, stats.totalDocuments);
  const processingPercent = percent(stats.processingDocuments, stats.totalDocuments);
  const failedPercent = percent(stats.failedDocuments, stats.totalDocuments);

  const quickStats = [
    { label: "Conversations", value: formatNumber(stats.totalConversations), icon: Bot },
    { label: "Messages", value: formatNumber(stats.totalMessages), icon: Activity },
    { label: "Documents", value: formatNumber(stats.totalDocuments), icon: Database },
    { label: "Tokens used", value: formatNumber(stats.totalTokens), icon: FileSearch },
  ];

  const pipelines = [
    {
      title: "Knowledge ingestion",
      status: `${formatNumber(stats.readyDocuments)} of ${formatNumber(stats.totalDocuments)} documents ready`,
      trend: stats.processingDocuments ? `${formatNumber(stats.processingDocuments)} processing` : `${readyPercent}% ready`,
    },
    {
      title: "RAG retrieval",
      status: `${formatNumber(stats.retrievalRuns)} completed chat retrieval runs`,
      trend: `${formatNumber(stats.totalTokens)} tokens`,
    },
    {
      title: "Usage tracking",
      status: "Persisted in Supabase usage logs",
      trend: `$${stats.totalCostUsd.toFixed(4)}`,
    },
  ];

  const retrievalHealth = [
    { label: "Ready documents", value: `${readyPercent}%`, width: readyPercent },
    { label: "Processing queue", value: `${stats.processingDocuments} active`, width: processingPercent },
    { label: "Failed documents", value: `${stats.failedDocuments} failed`, width: failedPercent },
    {
      label: "Token coverage",
      value: formatNumber(stats.totalTokens),
      width: Math.min(100, Math.round(stats.totalTokens / 1000)),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <DashboardHero />

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={<Icon className="h-4 w-4 text-foreground" />}
            />
          );
        })}
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <div className="min-w-0 rounded-3xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Active pipelines</h2>
              <p className="text-sm text-muted-foreground">
                Live orchestration from your Supabase-backed RAG workspace.
              </p>
            </div>
            <Button asChild variant="ghost" className="shrink-0 gap-2">
              <Link href="/retrieval">
                View all
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            {pipelines.map((pipeline, index) => (
              <PipelineCard
                key={pipeline.title}
                title={pipeline.title}
                status={pipeline.status}
                trend={pipeline.trend}
                highlight={index === 0}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-3xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Retrieval health</h2>
          <p className="text-sm text-muted-foreground">
            Current readiness based on your indexed documents and usage logs.
          </p>
          <div className="mt-6 space-y-4">
            {retrievalHealth.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <span className="text-xs text-muted-foreground">{item.value}</span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
