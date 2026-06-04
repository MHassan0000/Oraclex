import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getUserSystemPromptFromRagSettings,
  normalizeUserSystemPrompt,
} from "@/lib/settings/system-prompt";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function getUserSystemPrompt(userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select("rag")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load user system prompt:", error.message);
    return "";
  }

  return getUserSystemPromptFromRagSettings(data?.rag);
}

export async function updateUserSystemPrompt(userId: string, systemPrompt: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const normalizedPrompt = normalizeUserSystemPrompt(systemPrompt);
  const { data, error } = await supabase
    .from("settings")
    .select("rag")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const rag = isRecord(data?.rag) ? { ...data.rag } : {};
  if (normalizedPrompt) {
    rag.systemPrompt = normalizedPrompt;
  } else {
    delete rag.systemPrompt;
  }

  const { error: upsertError } = await supabase.from("settings").upsert(
    {
      user_id: userId,
      rag,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) throw upsertError;
  return normalizedPrompt;
}
