import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Create your account"
        description="Spin up a secure workspace for your RAG systems."
      >
        <SignupForm />
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="text-foreground hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  );
}
