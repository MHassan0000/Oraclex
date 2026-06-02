import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env/server";

function parseList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;

  const adminIds = parseList(serverEnv.ADMIN_USER_IDS);
  const adminEmails = parseList(serverEnv.ADMIN_EMAILS);
  const email = user.email?.toLowerCase();
  const role = user.app_metadata?.role;
  const roles = user.app_metadata?.roles;

  return (
    adminIds.has(user.id.toLowerCase()) ||
    (email ? adminEmails.has(email) : false) ||
    role === "admin" ||
    (Array.isArray(roles) && roles.includes("admin"))
  );
}

export async function requireAdmin(redirectTo = "/chat") {
  const user = await getUser();
  if (!isAdminUser(user)) redirect(redirectTo);
  return user;
}
