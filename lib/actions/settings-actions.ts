"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/session";
import { updateUserSystemPrompt } from "@/lib/db/settings";
import {
  MAX_USER_SYSTEM_PROMPT_LENGTH,
  normalizeUserSystemPrompt,
} from "@/lib/settings/system-prompt";

export async function updateSystemPromptAction(systemPrompt: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const normalizedPrompt = normalizeUserSystemPrompt(systemPrompt);
  if (normalizedPrompt.length > MAX_USER_SYSTEM_PROMPT_LENGTH) {
    throw new Error(`System prompt must be ${MAX_USER_SYSTEM_PROMPT_LENGTH} characters or fewer`);
  }

  const savedPrompt = await updateUserSystemPrompt(user.id, normalizedPrompt);
  revalidatePath("/settings");

  return { systemPrompt: savedPrompt };
}
