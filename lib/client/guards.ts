"use client";

export function assertClient(): void {
  if (typeof window === "undefined") {
    throw new Error("This module must only be used on the client.");
  }
}
