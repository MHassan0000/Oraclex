"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        richColors
        closeButton
        theme="system"
        position="bottom-right"
      />
    </ThemeProvider>
  );
}
