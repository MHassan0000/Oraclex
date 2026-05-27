"use client";

import { useState } from "react";

import { AuthInput } from "@/components/auth/auth-input";
import { AuthLoading } from "@/components/auth/auth-loading";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { profileSchema } from "@/lib/auth/schemas";

type ProfileFormProps = {
  initialName?: string | null;
  email?: string | null;
};

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const { updateProfile, loading, initializing } = useAuth();
  const [fullName, setFullName] = useState(initialName ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setError(null);
    setMessage(null);

    const parsed = profileSchema.safeParse({ fullName });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.fullName?.[0] ?? "Enter your name.");
      return;
    }

    const response = await updateProfile({ fullName });
    if (response?.error) {
      setError(response.error);
      return;
    }

    setMessage("Profile updated.");
  }

  if (initializing) {
    return <AuthLoading />;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AuthInput
        label="Full name"
        type="text"
        autoComplete="name"
        name="full-name"
        value={fullName}
        onChange={(event) => {
          setFullName(event.target.value);
          if (fieldError) setFieldError(null);
        }}
        error={fieldError ?? undefined}
        required
      />
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        name="email"
        value={email ?? ""}
        readOnly
        disabled
      />
      {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
