import * as React from "react";

import { cn } from "@/lib/utils";

type AppShellContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShellContainer({ children, className }: AppShellContainerProps) {
  return <div className={cn("mx-auto w-full max-w-7xl min-w-0", className)}>{children}</div>;
}
