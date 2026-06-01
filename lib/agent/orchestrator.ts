import "server-only";

import { createWorkflowState, type WorkflowState } from "@/lib/agent/workflow-state";
import {
  inputProcessingNode,
  memoryRetrievalNode,
  queryRewriteNode,
  retrieverNode,
  rerankerNode,
  contextBuilderNode,
  citationGeneratorNode,
  responseGenerationNode,
  fallbackNode,
  persistCompletion,
} from "@/lib/agent/nodes";
import { createSSEStream, sseResponse } from "@/lib/streaming/sse-stream";
import type { StreamMetadata } from "@/lib/streaming/types";
import { DEFAULT_MODEL } from "@/lib/ai/models";

const MAX_WORKFLOW_RETRIES = 1;

/**
 * Execute the full RAG agent workflow and return an SSE Response.
 *
 * Pipeline:
 *   inputProcessing → memoryRetrieval → queryRewrite → retriever
 *   → reranker → contextBuilder → citationGenerator → responseGeneration
 *
 * Each node transforms the shared WorkflowState. If any critical node
 * fails, the pipeline falls through to the fallback node.
 */
export async function executeWorkflow(
  conversationId: string,
  userId: string,
  userMessage: string,
  model: string = DEFAULT_MODEL,
): Promise<Response> {
  let state = createWorkflowState(conversationId, userId, userMessage, model);

  try {
    // ── Phase 1: Input processing ──
    state = await inputProcessingNode(state);
    if (state.status === "error") {
      return buildFallbackResponse(state);
    }

    // ── Phase 2: Memory retrieval (non-critical) ──
    state = await memoryRetrievalNode(state);

    // ── Phase 3: Query rewriting (non-critical) ──
    state = await queryRewriteNode(state);

    // ── Phase 4: Document retrieval (non-critical) ──
    state = await retrieverNode(state);

    // ── Phase 5: Reranking ──
    state = await rerankerNode(state);

    // ── Phase 6: Context building ──
    state = await contextBuilderNode(state);

    // ── Phase 7: Citation generation ──
    state = await citationGeneratorNode(state);

    // ── Phase 8: Response generation (produces the stream) ──
    const { state: streamState, stream: upstreamStream } =
      await responseGenerationNode(state);
    state = streamState;

    // ── Wrap in SSE stream with citation injection ──
    const sseStream = createSSEStream({
      upstreamStream,
      citations: state.citations,
      messageId: state.assistantMessageId ?? undefined,
      model: state.model,
      onComplete: async (fullContent, metadata) => {
        await persistCompletion(
          {
            ...state,
            inputTokens: metadata.inputTokens ?? 0,
            outputTokens: metadata.outputTokens ?? 0,
            latencyMs: metadata.latencyMs ?? 0,
          },
          fullContent,
        );
      },
    });

    return sseResponse(sseStream);
  } catch (error) {
    console.error("Workflow execution failed:", error);

    // Retry once on transient failures
    if (state.retryCount < MAX_WORKFLOW_RETRIES) {
      state.retryCount++;
      console.warn(`Retrying workflow (attempt ${state.retryCount})...`);
      return executeWorkflow(conversationId, userId, userMessage, model);
    }

    return buildFallbackResponse(state);
  }
}

/**
 * Build a fallback SSE response when the workflow fails.
 */
async function buildFallbackResponse(state: WorkflowState): Promise<Response> {
  const fallbackState = await fallbackNode(state);
  const encoder = new TextEncoder();

  const fallbackStream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ status: "streaming" })}\n\n`),
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content: fallbackState.response })}\n\n`),
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
      );
      controller.close();
    },
  });

  return sseResponse(fallbackStream);
}
