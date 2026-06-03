import {
  BarChart3,
  BookOpen,
  Boxes,
  Cpu,
  FileSearch,
  History,
  LifeBuoy,
  Settings,
} from "lucide-react";

export const appShellConfig = {
  sidebar: {
    brand: {
      name: "Oraclex",
      label: "RAG OS",
    },
    nav: [
      {
        title: "Overview",
        href: "/",
        icon: BarChart3,
      },
      {
        title: "Chat Studio",
        href: "/chat",
        icon: Cpu,
      },
      {
        title: "History",
        href: "/history",
        icon: History,
      },
      {
        title: "Knowledge",
        href: "/knowledge",
        icon: BookOpen,
      },
      {
        title: "Retrieval",
        href: "/retrieval",
        icon: FileSearch,
      },
      {
        title: "Agents",
        href: "/agents",
        icon: Boxes,
      },
    ],
    footer: [
      {
        title: "Support",
        href: "/support",
        icon: LifeBuoy,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
} as const;

export type AppShellConfig = typeof appShellConfig;
