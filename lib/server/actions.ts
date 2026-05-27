"use server";

import "server-only";

import { revalidatePath } from "next/cache";

export async function revalidateApp(path: string) {
  revalidatePath(path);
}
