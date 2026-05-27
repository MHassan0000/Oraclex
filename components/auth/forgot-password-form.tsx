"use client";

import { useState } from "react";

import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthRedirectPath } from "@/hooks/use-auth-redirect";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { AuthLoading } from "@/components/auth/auth-loading";

export function ForgotPasswordForm() {
  const { requestPasswordReset, loading, initializing } = useAuth();
  const redirectPath = useAuthRedirectPath();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    setMessage(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email.");
      return;
    }
    const response = await requestPasswordReset(email, redirectPath);
    if (response?.error) {
      setError(response.error);
      return;
    }
    setMessage("Check your email for the reset link.");
  }

  if (initializing) {
    return <AuthLoading />;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        name="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (fieldError) {
            setFieldError(null);
          }
        }}
        error={fieldError ?? undefined}
        required
      />
      {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Sending link..." : "Send reset link"}
      </Button>
    </form>
  );
}
