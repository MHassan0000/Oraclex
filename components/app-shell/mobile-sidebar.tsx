"use client";

import * as React from "react";
import { appShellConfig } from "@/config/app-shell";
import { Brand } from "@/components/brand";
import { AppShellNav } from "@/components/app-shell/app-shell-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type MobileSidebarProps = {
  children: React.ReactNode;
};

export function MobileSidebar({ children }: MobileSidebarProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-6">
        <Brand
          name={appShellConfig.sidebar.brand.name}
          label={appShellConfig.sidebar.brand.label}
        />
        <div className="flex flex-1 flex-col gap-6">
          <AppShellNav items={appShellConfig.sidebar.nav} />
          <AppShellNav items={appShellConfig.sidebar.footer} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
