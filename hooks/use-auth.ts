"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Provider, User } from "@supabase/supabase-js";

import { appToast } from "@/lib/client/toast";
import { clientEnv } from "@/lib/env/client";
import { AUTH_REDIRECT_PARAM } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";

type AuthResponse = {
  error?: string;
};

export function useAuth() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setInitializing(false);
      }
    });
    const timeout =
      typeof window !== "undefined"
        ? window.setTimeout(() => {
            if (mounted) setInitializing(false);
          }, 1500)
        : undefined;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setInitializing(false);
    });
    return () => {
      mounted = false;
      if (typeof window !== "undefined" && timeout) {
        window.clearTimeout(timeout);
      }
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }): Promise<AuthResponse> => {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
        return { error: error.message };
      }
      appToast.success("Welcome back.");
      return {};
    },
    [supabase],
  );

  const signUp = useCallback(
    async ({ email, password }: { email: string; password: string }): Promise<AuthResponse> => {
      setLoading(true);
      const emailRedirectTo =
        clientEnv.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ??
        (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
        return { error: error.message };
      }
      appToast.success("Check your email to confirm your account.");
      return {};
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      appToast.error(error.message);
      return;
    }
    appToast.success("Signed out successfully.");
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }, [supabase]);

  const signInWithProvider = useCallback(
    async (provider: Provider, redirectPath?: string) => {
      setLoading(true);
      const callbackUrl =
        clientEnv.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`;
      const redirectTo = redirectPath
        ? `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}${
            AUTH_REDIRECT_PARAM
          }=${encodeURIComponent(redirectPath)}`
        : callbackUrl;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
      }
    },
    [supabase],
  );

  const requestPasswordReset = useCallback(
    async (email: string, redirectPath?: string): Promise<AuthResponse> => {
      setLoading(true);
      const callbackUrl =
        clientEnv.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`;
      const resetPath = redirectPath
        ? `/reset-password?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(redirectPath)}`
        : "/reset-password";
      const redirectTo = `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}${
        AUTH_REDIRECT_PARAM
      }=${encodeURIComponent(resetPath)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
        return { error: error.message };
      }
      appToast.success("Reset email sent.");
      return {};
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResponse> => {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
        return { error: error.message };
      }
      appToast.success("Password updated.");
      return {};
    },
    [supabase],
  );

  const updateProfile = useCallback(
    async (data: { fullName?: string }) => {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.fullName },
      });
      setLoading(false);
      if (error) {
        appToast.error(error.message);
        return { error: error.message };
      }
      appToast.success("Profile updated.");
      return {};
    },
    [supabase],
  );

  return {
    user,
    loading,
    initializing,
    signInWithPassword,
    signUp,
    signOut,
    signInWithProvider,
    requestPasswordReset,
    updatePassword,
    updateProfile,
  };
}
