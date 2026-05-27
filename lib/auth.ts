import "server-only";

import { requireUser } from "@/lib/auth/session";

export async function requireAuth() {
  const user = await requireUser();
  return { userId: user.id, email: user.email ?? null };
}
