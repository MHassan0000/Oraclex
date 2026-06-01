"use client";

import { TriangleAlert, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ChatErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ChatErrorState({ message, onRetry }: ChatErrorStateProps) {
  return (
    <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6">
      <div className="flex items-center gap-3 text-destructive">
        <TriangleAlert className="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">Unable to reach the AI service</p>
          <p className="text-xs text-muted-foreground">
            {message ?? "Check your connection or try again in a moment."}
          </p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
