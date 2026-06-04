import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/session";

export default async function SupportPage() {
  await requireUser("/support");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          <LifeBuoy className="h-3.5 w-3.5" /> Support
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspace support</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use these checks when validating production readiness, authentication, upload ingestion,
          retrieval, and streaming responses.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Operational help</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check Supabase auth, UploadThing tokens, OpenRouter credits, and document status if a
            workflow stalls.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-4 font-semibold text-foreground">Security checks</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin access is gated by trusted metadata or env allowlists. Rotate exposed local
            secrets before deployment.
          </p>
        </div>
      </section>
    </div>
  );
}
