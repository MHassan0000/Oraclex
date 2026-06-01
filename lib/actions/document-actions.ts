"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type { Document } from "@/lib/db/types";

/**
 * Create a document record in the database after a successful upload.
 */
export async function createDocumentAction(input: {
  title: string;
  fileName: string;
  fileType: string;
  storageUrl: string;
  fileSize: number;
  checksum?: string;
}): Promise<Document> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();

  // Duplicate detection via checksum
  if (input.checksum) {
    const { data: existing } = await supabase
      .from("documents")
      .select("id, title")
      .eq("checksum", input.checksum)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      throw new Error(`Duplicate document: "${existing.title}" already exists`);
    }
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: input.title,
      file_name: input.fileName,
      file_type: input.fileType,
      storage_path: input.storageUrl,
      checksum: input.checksum ?? null,
      status: "processing",
      metadata: {
        file_size: input.fileSize,
        uploaded_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/knowledge");
  return data as Document;
}

/**
 * Get all documents for the current user.
 */
export async function getDocumentsAction(): Promise<Document[]> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Document[];
}

/**
 * Delete a document and all associated chunks/embeddings.
 */
export async function deleteDocumentAction(id: string): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/knowledge");
}

/**
 * Update a document's status.
 */
export async function updateDocumentStatusAction(
  id: string,
  status: "processing" | "ready" | "failed" | "archived",
  error?: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status,
      metadata: error ? { error } : undefined,
    })
    .eq("id", id);

  if (updateError) throw updateError;
}
