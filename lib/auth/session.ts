import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AUTH_REDIRECT_PARAM } from "@/lib/auth/constants";

export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async (redirectPath?: string) => {
  const user = await getUser();
  if (!user) {
    const redirectTo = redirectPath
      ? `/login?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(redirectPath)}`
      : "/login";
    redirect(redirectTo);
  }
  return user;
});
