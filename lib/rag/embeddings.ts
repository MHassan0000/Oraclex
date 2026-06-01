import "server-only";

import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Embedding service using OpenRouter-compatible embeddings.
 * Falls back to text-embedding-3-small via OpenRouter.
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100;

function getEmbeddingsClient(): OpenAIEmbeddings {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  return new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    modelName: EMBEDDING_MODEL,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
    dimensions: EMBEDDING_DIMENSIONS,
  });
}

/**
 * Generate an embedding for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getEmbeddingsClient();
  const result = await client.embedQuery(text);
  return result;
}

/**
 * Generate embeddings for multiple texts in batches.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
): Promise<number[][]> {
  const client = getEmbeddingsClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await client.embedDocuments(batch);
    results.push(...embeddings);
  }

  return results;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
