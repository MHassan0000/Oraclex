import type { appShellConfig } from "@/config/app-shell";

export type NavItem = (typeof appShellConfig.sidebar.nav)[number];
export type FooterNavItem = (typeof appShellConfig.sidebar.footer)[number];
