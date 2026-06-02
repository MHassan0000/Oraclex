import { Activity, ArrowUpRight, Bot, Cpu, FileSearch } from "lucide-react";

import { MetricCard } from "@/app/(root)/_components/metric-card";
import { PipelineCard } from "@/app/(root)/_components/pipeline-card";
import { DashboardHero } from "@/components/sections/dashboard-hero";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

const quickStats = [
  { label: "Active agents", value: "12", icon: Bot },
  { label: "Retrieval runs", value: "3,482", icon: FileSearch },
  { label: "GPU minutes", value: "128", icon: Cpu },
  { label: "Signals", value: "98.7%", icon: Activity },
];

const pipelines = [
  {
    title: "Customer Support Copilot",
    status: "Live",
    trend: "+12%",
  },
  {
    title: "Compliance Search",
    status: "Indexing",
    trend: "+4%",
  },
  {
    title: "RAG Benchmark Suite",
    status: "Paused",
    trend: "-2%",
  },
];

export default async function Home() {
  await requireUser("/");
  return (
    <div className="flex flex-col gap-10">
      <DashboardHero />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Active pipelines</h2>
              <p className="text-sm text-muted-foreground">
                Live orchestration across your latest runs.
              </p>
            </div>
            <Button variant="ghost" className="gap-2">
              View all
              <ArrowUpRight className="h-4 w-4" />
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
        <div className="rounded-3xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Retrieval health</h2>
          <p className="text-sm text-muted-foreground">
            Ambient signals across your critical indices.
          </p>
          <div className="mt-6 space-y-4">
            {["Vector store", "Chunk overlap", "Latency", "Token burn"].map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 p-4">
                <p className="text-sm font-medium text-foreground">{item}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
