import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ResetPasswordAuthGate } from "@/app/(auth)/reset-password/auth-gate";
import { AuthLoading } from "@/components/auth/auth-loading";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Set a new password"
        description="Choose a strong password to secure your account."
      >
        <Suspense fallback={<AuthLoading />}>
          <ResetPasswordAuthGate>
            <ResetPasswordForm />
          </ResetPasswordAuthGate>
        </Suspense>
      </AuthCard>
    </AuthPageShell>
  );
}
