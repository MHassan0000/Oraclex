import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractText, cleanText } from "@/lib/rag/extract";
import { chunkText, chunkMarkdown } from "@/lib/rag/chunk";
import { generateEmbeddingsBatch, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/rag/embeddings";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";

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

    // 2. Extract text
    const rawText = await extractText(buffer, fileType, fileName);
    if (!rawText.trim()) {
      await updateDocumentStatusAction(documentId, "failed", "No text content found");
      return { documentId, chunksCreated: 0, embeddingsCreated: 0, totalTokens: 0, durationMs: Date.now() - startTime };
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
      return { documentId, chunksCreated: 0, embeddingsCreated: 0, totalTokens: 0, durationMs: Date.now() - startTime };
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

    // 6. Generate embeddings in batches
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    // 7. Store embeddings
    const embeddingInserts = insertedChunks!.map((chunk, index) => ({
      user_id: userId,
      chunk_id: chunk.id,
      embedding: embeddings[index] as unknown as string,
      model: EMBEDDING_MODEL,
      provider: "openai",
      dimensions: EMBEDDING_DIMENSIONS,
      content_hash: null,
      metadata: { documentId, chunkIndex: index },
    }));

    const { error: embeddingError } = await supabase
      .from("embeddings")
      .insert(embeddingInserts);

    if (embeddingError) throw new Error(`Embedding insertion failed: ${embeddingError.message}`);

    // 8. Update document status + token count
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

    await supabase
      .from("documents")
      .update({
        status: "ready",
        token_count: totalTokens,
        metadata: {
          chunks_count: chunks.length,
          embeddings_count: embeddings.length,
          ingested_at: new Date().toISOString(),
        },
      })
      .eq("id", documentId);

    return {
      documentId,
      chunksCreated: chunks.length,
      embeddingsCreated: embeddings.length,
      totalTokens,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await updateDocumentStatusAction(documentId, "failed", message);
    throw error;
  }
}
