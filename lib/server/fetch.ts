import "server-only";

import { serverEnv } from "@/lib/env/server";

export function apiUrl(path: string) {
  const base = serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
