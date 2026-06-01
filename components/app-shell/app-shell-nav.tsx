import * as React from "react";
import Link from "next/link";

import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type AppShellNavProps = {
  items: readonly NavItem[];
  className?: string;
};

export function AppShellNav({ items, className }: AppShellNavProps) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground",
              "transition-colors hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
