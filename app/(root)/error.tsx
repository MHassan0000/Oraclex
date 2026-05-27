"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Something broke</p>
      <h1 className="text-3xl font-semibold">We hit a snag</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Refresh the experience or reach out to support if this keeps happening.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
