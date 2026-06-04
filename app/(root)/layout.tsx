import type * as React from "react";

import { AppShell } from "@/components/app-shell/app-shell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
