import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Reset your password"
        description="We will send a secure reset link to your inbox."
      >
        <ForgotPasswordForm />
        <p className="text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link className="text-foreground hover:underline" href="/login">
            Back to login
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  );
}
