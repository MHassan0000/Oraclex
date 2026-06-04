import { Suspense } from "react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLoading } from "@/components/auth/auth-loading";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Welcome back" description="Sign in to manage your RAG workspaces.">
        <Suspense fallback={<AuthLoading />}>
          <LoginForm />
        </Suspense>
        <p className="text-sm text-muted-foreground">
          No account yet?{" "}
          <Link className="text-foreground hover:underline" href="/signup">
            Create one
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  );
}
