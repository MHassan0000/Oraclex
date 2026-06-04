import type * as React from "react";

import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <div className={cn("w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300", className)}>
      {children}
    </div>
  );
}
