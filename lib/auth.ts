import "server-only";

export async function requireAuth() {
  return { userId: "demo" };
}
