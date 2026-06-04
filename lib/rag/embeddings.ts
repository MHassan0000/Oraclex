import "server-only";

import { serverEnv } from "@/lib/env/server";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_PROVIDER = "openrouter";
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_CONTEXT_WINDOW = 8192;
const BATCH_SIZE = 64;
const EMBEDDING_TIMEOUT_MS = 45_000;

type OpenRouterEmbedding = {
  embedding: number[];
  index?: number;
};

type OpenRouterEmbeddingResponse = {
  data?: OpenRouterEmbedding[];
  model?: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    code?: number | string;
  };
};

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${serverEnv.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Oraclex RAG Platform",
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `OpenRouter embeddings timed out after ${Math.round(EMBEDDING_TIMEOUT_MS / 1000)}s`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validateEmbedding(embedding: number[], index: number): number[] {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding ${index} returned ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}`,
    );
  }

  if (!embedding.every((value) => Number.isFinite(value))) {
    throw new Error(`Embedding ${index} contains non-finite values`);
  }

  return embedding;
}

async function createOpenRouterEmbeddings(input: string[]): Promise<number[][]> {
  const normalizedInput = input.map((value) => value.trim()).filter(Boolean);
  if (normalizedInput.length === 0) return [];

  const response = await fetchWithTimeout(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: normalizedInput,
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenRouterEmbeddingResponse | null;
  if (!response.ok) {
    throw new Error(
      `OpenRouter embeddings error (${response.status}): ${payload?.error?.message ?? "Unknown error"}`,
    );
  }

  const embeddings = payload?.data ?? [];
  if (embeddings.length !== normalizedInput.length) {
    throw new Error(
      `OpenRouter returned ${embeddings.length} embeddings for ${normalizedInput.length} inputs`,
    );
  }

  return embeddings
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((item, index) => validateEmbedding(item.embedding, index));
}

export function formatEmbeddingForPgVector(embedding: number[]): string {
  validateEmbedding(embedding, 0);
  return `[${embedding.join(",")}]`;
}

/**
 * Generate a query embedding for pgvector retrieval.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await createOpenRouterEmbeddings([text]);
  if (!embedding) throw new Error("OpenRouter returned no query embedding");
  return embedding;
}

/**
 * Generate document chunk embeddings through OpenRouter in stable batches.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await createOpenRouterEmbeddings(batch);
    results.push(...embeddings);
  }

  return results;
}

export { EMBEDDING_MODEL, EMBEDDING_PROVIDER, EMBEDDING_DIMENSIONS, EMBEDDING_CONTEXT_WINDOW };
