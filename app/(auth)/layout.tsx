import type * as React from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <Brand name="Oraclex" label="RAG OS" />
          <div className="flex items-center gap-4">
            <div className="hidden text-sm text-muted-foreground md:block">
              Secure access portal
            </div>
            <ThemeToggle />
          </div>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-between rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/60 p-8 lg:flex">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Oraclex Auth
              </p>
              <h2 className="mt-6 text-3xl font-semibold text-foreground">
                Secure your RAG deployments with zero-friction access.
              </h2>
              <p className="mt-4 text-sm text-muted-foreground">
                Built-in risk controls, adaptive policies, and enterprise-ready session handling.
              </p>
            </div>
            <div className="mt-10 rounded-2xl border border-border/60 bg-card/80 p-5 text-sm text-muted-foreground">
              "The auth flow is fast, consistent, and secure. Our team shipped in days."
              <div className="mt-3 text-xs uppercase tracking-[0.3em]">Security Lead</div>
            </div>
          </div>
          <div className="flex items-center justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
