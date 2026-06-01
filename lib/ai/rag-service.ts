import "server-only";

import {
  createCompletion,
  createStreamingCompletion,
  estimateTokens,
  calculateCost,
  type ChatCompletionMessage,
  type CompletionResult,
} from "@/lib/ai/openrouter";
import { DEFAULT_MODEL } from "@/lib/ai/models";

export type RAGContext = {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
};

export type RAGCompletionOptions = {
  query: string;
  contexts: RAGContext[];
  conversationHistory?: ChatCompletionMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const RAG_SYSTEM_PROMPT = `You are Oraclex, an advanced AI assistant powered by a Retrieval-Augmented Generation (RAG) system. Your responses are grounded in the user's knowledge base.

Guidelines:
- Base your answers primarily on the provided context from the user's documents
- When the context contains relevant information, cite it naturally in your response
- If the context doesn't contain enough information to answer fully, say so clearly
- Never fabricate information not present in the provided context
- Be concise, accurate, and helpful
- Use markdown formatting for readability (headers, lists, code blocks, bold)
- If asked about topics outside the provided context, acknowledge the limitation`;

function buildContextBlock(contexts: RAGContext[]): string {
  if (contexts.length === 0) return "";

  const contextEntries = contexts
    .map((ctx, i) => {
      const meta = ctx.metadata
        ? `\n  Source: ${JSON.stringify(ctx.metadata)}`
        : "";
      return `[Document ${i + 1}] (similarity: ${(ctx.similarity * 100).toFixed(1)}%)${meta}\n${ctx.content}`;
    })
    .join("\n\n---\n\n");

  return `\n\n<retrieved_context>\n${contextEntries}\n</retrieved_context>`;
}

/**
 * Generate a RAG-grounded completion (non-streaming).
 */
export async function generateRAGCompletion(
  options: RAGCompletionOptions,
): Promise<CompletionResult & { contexts: RAGContext[] }> {
  const systemPrompt = RAG_SYSTEM_PROMPT + buildContextBlock(options.contexts);

  const messages: ChatCompletionMessage[] = [];

  // Include conversation history
  if (options.conversationHistory?.length) {
    messages.push(...options.conversationHistory.slice(-10));
  }

  messages.push({ role: "user", content: options.query });

  const result = await createCompletion({
    model: options.model ?? DEFAULT_MODEL,
    messages,
    systemPrompt,
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens,
  });

  return {
    ...result,
    contexts: options.contexts,
  };
}

/**
 * Generate a RAG-grounded streaming completion.
 */
export async function generateRAGStream(
  options: RAGCompletionOptions,
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = RAG_SYSTEM_PROMPT + buildContextBlock(options.contexts);

  const messages: ChatCompletionMessage[] = [];

  if (options.conversationHistory?.length) {
    messages.push(...options.conversationHistory.slice(-10));
  }

  messages.push({ role: "user", content: options.query });

  return createStreamingCompletion({
    model: options.model ?? DEFAULT_MODEL,
    messages,
    systemPrompt,
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens,
    stream: true,
  });
}

/**
 * Rewrite a user query for better retrieval (query expansion).
 */
export async function rewriteQuery(query: string): Promise<string> {
  const result = await createCompletion({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: query }],
    systemPrompt:
      "You are a search query optimizer. Rewrite the following user query to be more effective for semantic search against a document knowledge base. Output ONLY the rewritten query, nothing else. Keep it concise.",
    temperature: 0.3,
    maxTokens: 200,
  });

  return result.content.trim() || query;
}

/**
 * Generate multiple search queries from a single user query (multi-query retrieval).
 */
export async function generateMultiQueries(query: string): Promise<string[]> {
  const result = await createCompletion({
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: query }],
    systemPrompt:
      "Generate 3 different search queries that would help find relevant information for the user's question. Each query should approach the topic from a different angle. Output one query per line, nothing else.",
    temperature: 0.5,
    maxTokens: 300,
  });

  const queries = result.content
    .split("\n")
    .map((q) => q.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((q) => q.length > 0);

  return queries.length > 0 ? queries : [query];
}

export { estimateTokens, calculateCost };
