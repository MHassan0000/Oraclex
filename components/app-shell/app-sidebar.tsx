import { appShellConfig } from "@/config/app-shell";
import { Brand } from "@/components/brand";
import { AppShellNav } from "@/components/app-shell/app-shell-nav";

export function AppSidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-sidebar/70 text-sidebar-foreground lg:flex">
      <div className="flex h-full w-full flex-col gap-6 px-6 py-8">
        <Brand
          name={appShellConfig.sidebar.brand.name}
          label={appShellConfig.sidebar.brand.label}
        />
        <AppShellNav items={appShellConfig.sidebar.nav} />
        <div className="mt-auto flex flex-col gap-1">
          <AppShellNav items={appShellConfig.sidebar.footer} />
        </div>
      </div>
    </aside>
  );
}
