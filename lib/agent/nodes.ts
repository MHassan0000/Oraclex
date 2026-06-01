import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildMemoryContext, formatMemoryForPrompt, maybeUpdateSummary } from "@/lib/ai/memory";
import { generateMultiQueries } from "@/lib/ai/rag-service";
import {
  multiQueryRetrieve,
  rerankResults,
  compressContext,
} from "@/lib/rag/retrieve";
import { createStreamingCompletion, calculateCost, type ChatCompletionMessage } from "@/lib/ai/openrouter";
import {
  type WorkflowState,
  type WorkflowNode,
  type RetrievedChunk,
  advanceNode,
  errorNode,
} from "@/lib/agent/workflow-state";
import type { Citation } from "@/lib/streaming/types";



// ──────────────────────────────────────────
// Node 1: Input Processing
// ──────────────────────────────────────────

export const inputProcessingNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "input_processing");

  const supabase = await createServerSupabaseClient();

  // Save user message to DB
  const { data: userMsg, error } = await supabase
    .from("messages")
    .insert({
      user_id: next.userId,
      conversation_id: next.conversationId,
      role: "user",
      content: next.userMessage,
      status: "complete",
    })
    .select("id")
    .single();

  if (error) return errorNode(next, `Failed to save message: ${error.message}`);

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", next.conversationId);

  return {
    ...next,
    userMessageId: userMsg.id,
  };
};

// ──────────────────────────────────────────
// Node 2: Memory Retrieval
// ──────────────────────────────────────────

export const memoryRetrievalNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "memory_retrieval");

  try {
    const memory = await buildMemoryContext(next.conversationId);
    return {
      ...next,
      memory,
      conversationHistory: memory.shortTermMessages,
    };
  } catch (err) {
    // Memory retrieval is non-critical — continue without it
    console.warn("Memory retrieval failed:", err);
    return next;
  }
};

// ──────────────────────────────────────────
// Node 3: Query Rewriting & Multi-Query
// ──────────────────────────────────────────

export const queryRewriteNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "query_rewrite");

  try {
    const queries = await generateMultiQueries(next.userMessage);
    return { ...next, rewrittenQueries: queries };
  } catch {
    // Fallback to original query
    return { ...next, rewrittenQueries: [next.userMessage] };
  }
};

// ──────────────────────────────────────────
// Node 4: Document Retrieval
// ──────────────────────────────────────────

export const retrieverNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "retriever");

  try {
    const queries = next.rewrittenQueries.length > 0
      ? next.rewrittenQueries
      : [next.userMessage];

    const results = await multiQueryRetrieve(queries, { matchCount: 8 });

    const chunks: RetrievedChunk[] = results.map((r) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata ?? {},
      chunkIndex: (r.metadata as Record<string, unknown>)?.chunkIndex as number | undefined,
    }));

    return { ...next, retrievedChunks: chunks };
  } catch (err) {
    // Retrieval failure is non-fatal — we can still respond without context
    console.warn("Retrieval failed:", err);
    return { ...next, retrievedChunks: [] };
  }
};

// ──────────────────────────────────────────
// Node 5: Reranking
// ──────────────────────────────────────────

export const rerankerNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "reranker");

  if (next.retrievedChunks.length === 0) {
    return { ...next, rerankedChunks: [] };
  }

  // Convert to retrieval result format for reranking
  const asRetrievalResults = next.retrievedChunks.map((c, i) => ({
    chunk_id: c.chunkId,
    document_id: c.documentId,
    content: c.content,
    similarity: c.similarity,
    metadata: c.metadata,
    rank: i + 1,
  }));

  const reranked = rerankResults(asRetrievalResults, next.userMessage);

  const rerankedChunks: RetrievedChunk[] = reranked.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: compressContext(r.content, next.userMessage, 8),
    similarity: r.similarity,
    metadata: r.metadata,
    chunkIndex: (r.metadata as Record<string, unknown>)?.chunkIndex as number | undefined,
  }));

  return { ...next, rerankedChunks };
};

// ──────────────────────────────────────────
// Node 6: Context Builder
// ──────────────────────────────────────────

export const contextBuilderNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "context_builder");

  const chunks = next.rerankedChunks.length > 0
    ? next.rerankedChunks
    : next.retrievedChunks;

  // Build context block from chunks
  let contextBlock = "";
  if (chunks.length > 0) {
    const entries = chunks
      .slice(0, 6) // Top 6 chunks
      .map(
        (c, i) =>
          `[Source ${i + 1}] (relevance: ${(c.similarity * 100).toFixed(1)}%, chunk: ${c.chunkIndex ?? "?"})\n${c.content}`,
      )
      .join("\n\n---\n\n");
    contextBlock = `<retrieved_context>\n${entries}\n</retrieved_context>`;
  }

  // Build memory context
  const memoryBlock = next.memory
    ? formatMemoryForPrompt(next.memory)
    : "";

  // System prompt
  const systemPrompt = `You are Oraclex, an advanced AI assistant powered by a Retrieval-Augmented Generation (RAG) system. Your responses are grounded in the user's knowledge base.

Guidelines:
- Base answers primarily on the provided context from the user's documents
- Cite sources naturally using [Source N] notation when referencing specific information
- If the context doesn't contain enough information, say so clearly
- Never fabricate information not present in the provided context
- Be concise, accurate, and helpful
- Use markdown formatting for readability
- If asked about topics outside the provided context, acknowledge the limitation
- When citing, reference the source number that matches the retrieved context${memoryBlock}

${contextBlock}`;

  return {
    ...next,
    contextBlock,
    systemPrompt,
  };
};

// ──────────────────────────────────────────
// Node 7: Citation Generation
// ──────────────────────────────────────────

export const citationGeneratorNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "citation_generator");

  const chunks = next.rerankedChunks.length > 0
    ? next.rerankedChunks
    : next.retrievedChunks;

  // Fetch document titles
  const supabase = await createServerSupabaseClient();
  const docIds = [...new Set(chunks.map((c) => c.documentId))];

  let docTitleMap: Record<string, string> = {};
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", docIds);

    docTitleMap = Object.fromEntries(
      (docs ?? []).map((d: { id: string; title: string }) => [d.id, d.title]),
    );
  }

  const citations: Citation[] = chunks.slice(0, 6).map((chunk, index) => ({
    id: `cite-${index + 1}`,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    content: chunk.content.slice(0, 200),
    similarity: chunk.similarity,
    documentTitle: docTitleMap[chunk.documentId] ?? "Unknown Document",
    chunkIndex: chunk.chunkIndex,
  }));

  return { ...next, citations };
};

// ──────────────────────────────────────────
// Node 8: Response Generation (creates the stream)
// ──────────────────────────────────────────

export const responseGenerationNode = async (
  state: WorkflowState,
): Promise<{ state: WorkflowState; stream: ReadableStream<Uint8Array> }> => {
  const next = advanceNode(state, "response_generation");

  const supabase = await createServerSupabaseClient();

  // Create placeholder assistant message
  const { data: assistantMsg } = await supabase
    .from("messages")
    .insert({
      user_id: next.userId,
      conversation_id: next.conversationId,
      role: "assistant",
      content: "",
      status: "streaming",
      model: next.model,
    })
    .select("id")
    .single();

  const assistantMessageId = assistantMsg?.id ?? null;

  // Build messages array
  const messages: ChatCompletionMessage[] = [
    ...next.conversationHistory,
    { role: "user", content: next.userMessage },
  ];

  const upstreamStream = await createStreamingCompletion({
    model: next.model,
    messages,
    systemPrompt: next.systemPrompt,
    temperature: 0.4,
    stream: true,
  });

  return {
    state: {
      ...next,
      assistantMessageId,
      status: "streaming",
    },
    stream: upstreamStream,
  };
};

// ──────────────────────────────────────────
// Node 9: Fallback Handler
// ──────────────────────────────────────────

export const fallbackNode: WorkflowNode = async (state) => {
  const next = advanceNode(state, "fallback");

  return {
    ...next,
    status: "fallback",
    response:
      "I apologize, but I'm unable to process your request right now. This could be due to a temporary service issue. Please try again in a moment.",
    citations: [],
  };
};

// ──────────────────────────────────────────
// Node 10: Post-completion persistence
// ──────────────────────────────────────────

export async function persistCompletion(
  state: WorkflowState,
  fullContent: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Update assistant message
  if (state.assistantMessageId) {
    await supabase
      .from("messages")
      .update({
        content: fullContent,
        status: "complete",
        metadata: {
          citations: state.citations.map((c) => ({
            id: c.id,
            documentId: c.documentId,
            documentTitle: c.documentTitle,
            similarity: c.similarity,
          })),
        },
      })
      .eq("id", state.assistantMessageId);
  }

  // Log usage
  const cost = calculateCost(state.model, state.inputTokens, state.outputTokens);
  await supabase.from("usage_logs").insert({
    user_id: state.userId,
    conversation_id: state.conversationId,
    message_id: state.assistantMessageId,
    event_type: "chat_completion",
    tokens: (state.inputTokens || 0) + (state.outputTokens || 0),
    cost_usd: cost,
    metadata: {
      model: state.model,
      latency_ms: state.latencyMs,
      citations_count: state.citations.length,
      chunks_retrieved: state.retrievedChunks.length,
    },
  });

  // Trigger async summary update
  maybeUpdateSummary(state.conversationId).catch(console.error);
}
