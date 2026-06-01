/**
 * Streaming state management for SSE-based AI chat.
 * Provides types and utilities for managing streaming lifecycle.
 */

export type StreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completing"
  | "complete"
  | "cancelled"
  | "error";

export type StreamEvent = {
  type: "content" | "citation" | "status" | "error" | "done" | "metadata";
  content?: string;
  citations?: Citation[];
  status?: StreamStatus;
  error?: string;
  metadata?: StreamMetadata;
};

export type Citation = {
  id: string;
  documentId: string;
  chunkId: string;
  content: string;
  similarity: number;
  documentTitle?: string;
  pageNumber?: number;
  chunkIndex?: number;
};

export type StreamMetadata = {
  messageId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  citationCount?: number;
};

export type StreamingState = {
  status: StreamStatus;
  content: string;
  citations: Citation[];
  metadata: StreamMetadata | null;
  error: string | null;
  abortController: AbortController | null;
};

export function createInitialStreamState(): StreamingState {
  return {
    status: "idle",
    content: "",
    citations: [],
    metadata: null,
    error: null,
    abortController: null,
  };
}

/**
 * Parse a single SSE line into a StreamEvent.
 */
export function parseSSEEvent(line: string): StreamEvent | null {
  if (!line.startsWith("data: ")) return null;

  const data = line.slice(6).trim();
  if (data === "[DONE]") return { type: "done" };

  try {
    const parsed = JSON.parse(data);

    if (parsed.done) {
      return {
        type: "done",
        metadata: {
          messageId: parsed.messageId,
          model: parsed.model,
          inputTokens: parsed.inputTokens,
          outputTokens: parsed.outputTokens,
          latencyMs: parsed.latencyMs,
        },
        citations: parsed.citations,
      };
    }

    if (parsed.error) {
      return { type: "error", error: parsed.error };
    }

    if (parsed.citations) {
      return { type: "citation", citations: parsed.citations };
    }

    if (parsed.content) {
      return { type: "content", content: parsed.content };
    }

    if (parsed.status) {
      return { type: "status", status: parsed.status };
    }

    return null;
  } catch {
    return null;
  }
}
