import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractText, cleanText } from "@/lib/rag/extract";
import { chunkText, chunkMarkdown } from "@/lib/rag/chunk";
import {
  generateEmbeddingsBatch,
  formatEmbeddingForPgVector,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
  EMBEDDING_DIMENSIONS,
} from "@/lib/rag/embeddings";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { validateFileSecure } from "@/lib/security/file-validation";

export type IngestionResult = {
  documentId: string;
  chunksCreated: number;
  embeddingsCreated: number;
  totalTokens: number;
  durationMs: number;
};

/**
 * Full ingestion pipeline:
 * 1. Fetch file from URL
 * 2. Extract text
 * 3. Clean text
 * 4. Chunk document
 * 5. Generate embeddings in batches
 * 6. Store chunks + embeddings in Supabase
 * 7. Update document status
 */
export async function ingestDocument(
  documentId: string,
  userId: string,
  fileUrl: string,
  fileName: string,
  fileType: string,
): Promise<IngestionResult> {
  const startTime = Date.now();
  const supabase = await createServerSupabaseClient();

  try {
    // 1. Fetch file
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileValidation = validateFileSecure(fileName, fileType, buffer.byteLength, arrayBuffer);
    if (!fileValidation.valid) {
      const message = fileValidation.error ?? "Invalid file content";
      await updateDocumentStatusAction(documentId, "failed", message);
      throw new Error(message);
    }

    // 2. Extract text
    const rawText = await extractText(buffer, fileType, fileName);
    if (!rawText.trim()) {
      await updateDocumentStatusAction(documentId, "failed", "No text content found");
      return {
        documentId,
        chunksCreated: 0,
        embeddingsCreated: 0,
        totalTokens: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Clean text
    const cleaned = cleanText(rawText);

    // 4. Chunk document
    const isMarkdown = fileType.includes("markdown") || fileName.endsWith(".md");
    const chunks = isMarkdown
      ? await chunkMarkdown(cleaned, {
          metadata: { documentId, fileName, fileType },
        })
      : await chunkText(cleaned, {
          metadata: { documentId, fileName, fileType },
        });

    if (chunks.length === 0) {
      await updateDocumentStatusAction(documentId, "failed", "No chunks produced");
      return {
        documentId,
        chunksCreated: 0,
        embeddingsCreated: 0,
        totalTokens: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // 5. Store chunks in database
    const chunkInserts = chunks.map((chunk) => ({
      user_id: userId,
      document_id: documentId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata,
    }));

    const { data: insertedChunks, error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts)
      .select("id");

    if (chunkError) throw new Error(`Chunk insertion failed: ${chunkError.message}`);

    // 6. Generate embeddings in batches. If embeddings are unavailable, keep
    // the chunks ready so retrieval can fall back to keyword matching.
    const chunkTexts = chunks.map((c) => c.content);
    let embeddingsCreated = 0;
    let retrievalMode = "keyword";
    let embeddingErrorMessage: string | null = null;

    try {
      const embeddings = await generateEmbeddingsBatch(chunkTexts);

      const embeddingInserts = insertedChunks!.map((chunk, index) => ({
        user_id: userId,
        chunk_id: chunk.id,
        embedding: formatEmbeddingForPgVector(embeddings[index]),
        model: EMBEDDING_MODEL,
        provider: EMBEDDING_PROVIDER,
        dimensions: EMBEDDING_DIMENSIONS,
        content_hash: null,
        metadata: { documentId, chunkIndex: index, provider: EMBEDDING_PROVIDER },
      }));

      const { error: embeddingError } = await supabase.from("embeddings").insert(embeddingInserts);

      if (embeddingError) throw new Error(`Embedding insertion failed: ${embeddingError.message}`);

      embeddingsCreated = embeddings.length;
      retrievalMode = "vector";
    } catch (error) {
      embeddingErrorMessage =
        error instanceof Error ? error.message : "Embedding generation failed";
      console.warn(
        "Embedding unavailable; document will use keyword retrieval:",
        embeddingErrorMessage,
      );
    }

    // 8. Update document status + token count
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

    await supabase
      .from("documents")
      .update({
        status: "ready",
        token_count: totalTokens,
        metadata: {
          chunks_count: chunks.length,
          embeddings_count: embeddingsCreated,
          retrieval_mode: retrievalMode,
          embedding_model: EMBEDDING_MODEL,
          embedding_provider: EMBEDDING_PROVIDER,
          embedding_dimensions: EMBEDDING_DIMENSIONS,
          embedding_error: embeddingErrorMessage,
          ingested_at: new Date().toISOString(),
        },
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    return {
      documentId,
      chunksCreated: chunks.length,
      embeddingsCreated,
      totalTokens,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await updateDocumentStatusAction(documentId, "failed", message);
    throw error;
  }
}
