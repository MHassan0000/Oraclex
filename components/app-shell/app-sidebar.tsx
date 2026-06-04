"use client";

import Image from "next/image";

import { appShellConfig } from "@/config/app-shell";
import { Brand } from "@/components/brand";
import { AppShellNav } from "@/components/app-shell/app-shell-nav";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  collapsed?: boolean;
};

export function AppSidebar({ collapsed = false }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-border/60 bg-sidebar/70 text-sidebar-foreground transition-[width] duration-300 lg:flex",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <div className={cn("flex h-full w-full flex-col gap-6 py-8", collapsed ? "px-4" : "px-6")}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-950 dark:bg-foreground/10">
              <Image
                src="/images/oraclex-logo.png"
                alt={appShellConfig.sidebar.brand.name}
                width={28}
                height={28}
                className="rounded-lg"
              />
            </div>
          </div>
        ) : (
          <Brand
            name={appShellConfig.sidebar.brand.name}
            label={appShellConfig.sidebar.brand.label}
          />
        )}
        <AppShellNav items={appShellConfig.sidebar.nav} collapsed={collapsed} />
        <div className="mt-auto flex flex-col gap-1">
          <AppShellNav items={appShellConfig.sidebar.footer} collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
