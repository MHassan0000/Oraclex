"use client";

import { useState } from "react";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSocial } from "@/components/auth/auth-social";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { signupSchema } from "@/lib/auth/schemas";
import { AuthLoading } from "@/components/auth/auth-loading";

export function SignupForm() {
  const { signUp, loading, initializing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }
    const response = await signUp({ email, password });
    if (response?.error) {
      setError(response.error);
      return;
    }
    setMessage("Check your email to confirm your account.");
    setPassword("");
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
          if (fieldErrors.email) {
            setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }
        }}
        error={fieldErrors.email}
        required
      />
      <AuthInput
        label="Password"
        type="password"
        autoComplete="new-password"
        name="password"
        hint="At least 8 characters"
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Creating account..." : "Create account"}
      </Button>
      <AuthDivider />
      <AuthSocial />
    </form>
  );
}
