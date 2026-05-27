"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSocial } from "@/components/auth/auth-social";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthRedirectPath } from "@/hooks/use-auth-redirect";
import { loginSchema } from "@/lib/auth/schemas";
import { AuthLoading } from "@/components/auth/auth-loading";

export function LoginForm() {
  const { signInWithPassword, loading, initializing } = useAuth();
  const redirectPath = useAuthRedirectPath();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }
    const response = await signInWithPassword({ email, password });
    if (response?.error) {
      setError(response.error);
      setPassword("");
    }
    if (!response?.error) {
      window.location.assign(redirectPath ?? "/");
    }
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
        autoComplete="current-password"
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
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Forgot your password?</span>
        <Link className="text-foreground hover:underline" href="/forgot-password">
          Reset it
        </Link>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <AuthDivider />
      <AuthSocial />
    </form>
  );
}
