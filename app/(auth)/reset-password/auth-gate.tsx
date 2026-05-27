"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthLoading } from "@/components/auth/auth-loading";
import { AUTH_REDIRECT_PARAM } from "@/lib/auth/constants";
import { useAuth } from "@/hooks/use-auth";

type AuthGateProps = {
  children: React.ReactNode;
};

export function ResetPasswordAuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initializing } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initializing) return;

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const hasAccessToken = Boolean(params.get("access_token"));
    const redirectValue = searchParams?.get(AUTH_REDIRECT_PARAM) ?? "/";

    if (!user && !hasAccessToken) {
      router.replace(`/login?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(redirectValue)}`);
      return;
    }

    setReady(true);
  }, [initializing, router, searchParams, user]);

  if (initializing || !ready) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
