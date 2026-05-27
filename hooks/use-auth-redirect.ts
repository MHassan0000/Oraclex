"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { AUTH_REDIRECT_PARAM } from "@/lib/auth/constants";

export function useAuthRedirectPath() {
  const searchParams = useSearchParams();

  return useMemo(() => {
    if (!searchParams) return undefined;
    const value = searchParams.get(AUTH_REDIRECT_PARAM);
    if (!value) return undefined;
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
      return undefined;
    }
    return value;
  }, [searchParams]);
}
