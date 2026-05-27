import * as React from "react";

import { cn } from "@/lib/utils";

type PipelineCardProps = {
  title: string;
  status: string;
  trend: string;
  highlight?: boolean;
  className?: string;
};

export function PipelineCard({
  title,
  status,
  trend,
  highlight,
  className,
}: PipelineCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4",
        highlight && "bg-primary/5",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
      <span className="text-sm font-medium text-foreground">{trend}</span>
    </div>
  );
}
