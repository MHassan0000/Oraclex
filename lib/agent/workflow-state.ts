import "server-only";

import type { ChatCompletionMessage } from "@/lib/ai/openrouter";
import type { Citation } from "@/lib/streaming/types";
import type { MemoryContext } from "@/lib/ai/memory";

/**
 * LangGraph-style workflow state that flows through every node.
 */
export type WorkflowState = {
  // ── Input ──
  conversationId: string;
  userId: string;
  userMessage: string;
  model: string;

  // ── Memory ──
  memory: MemoryContext | null;
  conversationHistory: ChatCompletionMessage[];

  // ── Retrieval ──
  rewrittenQueries: string[];
  retrievedChunks: RetrievedChunk[];
  rerankedChunks: RetrievedChunk[];

  // ── Context ──
  contextBlock: string;
  systemPrompt: string;

  // ── Response ──
  response: string;
  citations: Citation[];

  // ── Metadata ──
  userMessageId: string | null;
  assistantMessageId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;

  // ── Control ──
  status: WorkflowStatus;
  error: string | null;
  retryCount: number;
  currentNode: string;
  nodeHistory: string[];
};

export type WorkflowStatus =
  | "pending"
  | "processing"
  | "streaming"
  | "complete"
  | "error"
  | "fallback";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  documentTitle?: string;
  chunkIndex?: number;
};

/**
 * Create the initial workflow state from a user request.
 */
export function createWorkflowState(
  conversationId: string,
  userId: string,
  userMessage: string,
  model: string,
): WorkflowState {
  return {
    conversationId,
    userId,
    userMessage,
    model,
    memory: null,
    conversationHistory: [],
    rewrittenQueries: [],
    retrievedChunks: [],
    rerankedChunks: [],
    contextBlock: "",
    systemPrompt: "",
    response: "",
    citations: [],
    userMessageId: null,
    assistantMessageId: null,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    status: "pending",
    error: null,
    retryCount: 0,
    currentNode: "start",
    nodeHistory: [],
  };
}

/**
 * A workflow node is a function that transforms the state.
 */
export type WorkflowNode = (
  state: WorkflowState,
) => Promise<WorkflowState>;

/**
 * Advance the state to the next node.
 */
export function advanceNode(state: WorkflowState, nodeName: string): WorkflowState {
  return {
    ...state,
    currentNode: nodeName,
    nodeHistory: [...state.nodeHistory, nodeName],
    status: "processing",
  };
}

/**
 * Mark the state as errored.
 */
export function errorNode(state: WorkflowState, error: string): WorkflowState {
  return {
    ...state,
    status: "error",
    error,
  };
}
