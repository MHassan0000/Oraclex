import * as React from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-xl",
        className,
      )}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
