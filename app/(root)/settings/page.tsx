import Link from "next/link";
import { KeyRound, Settings, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await requireUser("/settings");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          <Settings className="h-3.5 w-3.5" /> Settings
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Workspace settings
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Manage account settings and production configuration for Oraclex.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <UserCircle className="h-5 w-5 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user.email ?? "authenticated user"}.
          </p>
          <Button asChild className="mt-5">
            <Link href="/profile">Manage profile</Link>
          </Button>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Environment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Production requires Supabase, OpenRouter, UploadThing, and admin allowlist environment
            variables.
          </p>
        </div>
      </section>
    </div>
  );
}
