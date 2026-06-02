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
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const agentRunId = await createAgentRun(conversationId, userId, model);

  try {
    // ── Phase 1: Input processing ──
    state = await inputProcessingNode(state);
    if (state.status === "error") {
      await finishAgentRun(agentRunId, "failed", state.error ?? "Input processing failed", state);
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
      userMessageId: state.userMessageId ?? undefined,
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
        await finishAgentRun(agentRunId, "succeeded", null, state, metadata);
      },
    });

    return sseResponse(sseStream);
  } catch (error) {
    console.error("Workflow execution failed:", error);
    const message = error instanceof Error ? error.message : "Workflow execution failed";
    await finishAgentRun(agentRunId, "failed", message, state);

    // Retry once on transient failures
    if (state.retryCount < MAX_WORKFLOW_RETRIES) {
      state.retryCount++;
      console.warn(`Retrying workflow (attempt ${state.retryCount})...`);
      return executeWorkflow(conversationId, userId, userMessage, model);
    }

    return buildFallbackResponse(state);
  }
}

async function createAgentRun(
  conversationId: string,
  userId: string,
  model: string,
): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        status: "running",
        started_at: new Date().toISOString(),
        metadata: { model },
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Failed to create agent run:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn("Failed to create agent run:", error);
    return null;
  }
}

async function finishAgentRun(
  id: string | null,
  status: "succeeded" | "failed",
  error: string | null,
  state: WorkflowState,
  metadata?: StreamMetadata,
) {
  if (!id) return;

  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("agent_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        error,
        metadata: {
          model: state.model,
          currentNode: state.currentNode,
          nodeHistory: state.nodeHistory,
          citationsCount: state.citations.length,
          retrievedChunks: state.retrievedChunks.length,
          latencyMs: metadata?.latencyMs ?? state.latencyMs,
        },
      })
      .eq("id", id)
      .eq("user_id", state.userId);
  } catch (updateError) {
    console.warn("Failed to update agent run:", updateError);
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
