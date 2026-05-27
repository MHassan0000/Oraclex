"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { AuthLoading } from "@/components/auth/auth-loading";
import { useAuthRedirectPath } from "@/hooks/use-auth-redirect";

export function ResetPasswordForm() {
  const { updatePassword, loading, initializing } = useAuth();
  const router = useRouter();
  const redirectPath = useAuthRedirectPath();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>(
    {},
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }
    const response = await updatePassword(password);
    if (response?.error) {
      setError(response.error);
      return;
    }
    setMessage("Password updated. You can now sign in.");
    setPassword("");
    setConfirmPassword("");
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        router.replace(redirectPath ?? "/login");
      }, 1200);
    } else {
      router.replace(redirectPath ?? "/login");
    }
  }

  if (initializing) {
    return <AuthLoading />;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AuthInput
        label="New password"
        type="password"
        autoComplete="new-password"
        name="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }
        }}
        error={fieldErrors.password}
        required
      />
      <AuthInput
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        name="confirm-password"
        value={confirmPassword}
        onChange={(event) => {
          setConfirmPassword(event.target.value);
          if (fieldErrors.confirmPassword) {
            setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }
        }}
        error={fieldErrors.confirmPassword}
        required
      />
      {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
