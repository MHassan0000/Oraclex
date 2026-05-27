import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ResetPasswordAuthGate } from "@/app/(auth)/reset-password/auth-gate";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Set a new password"
        description="Choose a strong password to secure your account."
      >
        <ResetPasswordAuthGate>
          <ResetPasswordForm />
        </ResetPasswordAuthGate>
      </AuthCard>
    </AuthPageShell>
  );
}
