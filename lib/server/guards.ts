import "server-only";

export function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("This module must only be used on the server.");
  }
}
