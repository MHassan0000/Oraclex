import * as React from "react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
};

export function MetricCard({ label, value, icon, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/70">
          {icon}
        </div>
      </div>
      <p className="mt-6 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
