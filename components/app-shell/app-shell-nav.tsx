"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type AppShellNavProps = {
  items: readonly NavItem[];
  className?: string;
  collapsed?: boolean;
};

export function AppShellNav({ items, className, collapsed = false }: AppShellNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.title : undefined}
            className={cn(
              "flex items-center rounded-xl px-3 py-2 text-sm text-muted-foreground",
              "transition-colors hover:bg-muted/60 hover:text-foreground",
              collapsed ? "justify-center gap-0" : "gap-3",
              active && "bg-primary/10 text-foreground ring-1 ring-primary/15",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={collapsed ? "sr-only" : undefined}>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
