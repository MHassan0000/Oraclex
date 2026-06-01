import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/rag/embeddings";
import type { MatchChunkResult } from "@/lib/db/types";

export type RetrievalOptions = {
  query: string;
  matchCount?: number;
  filterDocumentId?: string | null;
  filterMetadata?: Record<string, unknown> | null;
  similarityThreshold?: number;
};

export type RetrievalResult = MatchChunkResult & {
  rank: number;
};

/**
 * Retrieve relevant document chunks using pgvector similarity search.
 * Uses the match_document_chunks RPC function defined in the migration.
 */
export async function retrieveChunks(
  options: RetrievalOptions,
): Promise<RetrievalResult[]> {
  const {
    query,
    matchCount = 10,
    filterDocumentId = null,
    filterMetadata = null,
    similarityThreshold = 0.3,
  } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding as unknown as string,
    match_count: matchCount,
    filter_document_id: filterDocumentId,
    filter_metadata: filterMetadata,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  const results = (data ?? []) as MatchChunkResult[];

  // Apply similarity threshold and add rank
  return results
    .filter((r) => r.similarity >= similarityThreshold)
    .map((r, index) => ({
      ...r,
      rank: index + 1,
    }));
}

/**
 * Multi-query retrieval: run multiple queries and merge results.
 * Deduplicates by chunk_id, keeping the highest similarity score.
 */
export async function multiQueryRetrieve(
  queries: string[],
  options: Omit<RetrievalOptions, "query"> = {},
): Promise<RetrievalResult[]> {
  const allResults: Map<string, RetrievalResult> = new Map();

  const results = await Promise.all(
    queries.map((query) =>
      retrieveChunks({ ...options, query, matchCount: options.matchCount ?? 5 }),
    ),
  );

  for (const batch of results) {
    for (const result of batch) {
      const existing = allResults.get(result.chunk_id);
      if (!existing || result.similarity > existing.similarity) {
        allResults.set(result.chunk_id, result);
      }
    }
  }

  // Sort by similarity descending and re-rank
  return Array.from(allResults.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options.matchCount ?? 10)
    .map((r, index) => ({ ...r, rank: index + 1 }));
}

/**
 * Rerank results by combining vector similarity with keyword matching.
 * Simple hybrid scoring: 0.7 * vector_score + 0.3 * keyword_score.
 */
export function rerankResults(
  results: RetrievalResult[],
  query: string,
): RetrievalResult[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) return results;

  const scored = results.map((result) => {
    const content = result.content.toLowerCase();
    const matchedTerms = queryTerms.filter((term) => content.includes(term));
    const keywordScore = matchedTerms.length / queryTerms.length;
    const hybridScore = 0.7 * result.similarity + 0.3 * keywordScore;

    return { ...result, similarity: hybridScore };
  });

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .map((r, index) => ({ ...r, rank: index + 1 }));
}

/**
 * Contextual compression: trim chunks to only the most relevant sentences.
 */
export function compressContext(
  content: string,
  query: string,
  maxSentences: number = 5,
): string {
  const sentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length <= maxSentences) return content;

  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const score = queryTerms.filter((term) => lower.includes(term)).length;
    return { sentence, score };
  });

  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map((s) => s.sentence);

  return topSentences.join(". ") + ".";
}
