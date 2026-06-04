"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { documentCreateSchema } from "@/lib/security/schemas";
import { validateFileSecure } from "@/lib/security/file-validation";
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

  const parsed = documentCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.flatten().fieldErrors.storageUrl?.[0] ?? "Invalid document input");
  }

  const documentInput = parsed.data;
  const fileValidation = validateFileSecure(
    documentInput.fileName,
    documentInput.fileType,
    documentInput.fileSize,
  );
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error ?? "Invalid document file");
  }

  const supabase = await createServerSupabaseClient();

  // Duplicate detection via checksum
  if (documentInput.checksum) {
    const { data: existing } = await supabase
      .from("documents")
      .select("id, title")
      .eq("checksum", documentInput.checksum)
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
      title: documentInput.title,
      file_name: documentInput.fileName,
      file_type: documentInput.fileType,
      storage_path: documentInput.storageUrl,
      checksum: documentInput.checksum ?? null,
      status: "processing",
      metadata: {
        file_size: documentInput.fileSize,
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
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id);

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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      status,
      metadata: error ? { error } : undefined,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) throw updateError;
}
