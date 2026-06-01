"use client";

import { useCallback, useRef, useState } from "react";
import {
  type StreamingState,
  type StreamEvent,
  type Citation,
  type StreamMetadata,
  createInitialStreamState,
  parseSSEEvent,
} from "@/lib/streaming/types";

type UseStreamChatOptions = {
  onContent?: (content: string, fullContent: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onComplete?: (fullContent: string, metadata: StreamMetadata) => void;
  onError?: (error: string) => void;
};

export function useStreamChat(options: UseStreamChatOptions = {}) {
  const [state, setState] = useState<StreamingState>(createInitialStreamState());
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  /**
   * Start a streaming chat request.
   */
  const startStream = useCallback(
    async (
      conversationId: string,
      message: string,
      model?: string,
    ) => {
      // Cancel any existing stream
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        status: "connecting",
        content: "",
        citations: [],
        metadata: null,
        error: null,
        abortController: controller,
      });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message,
            model,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        if (!response.body) throw new Error("No response body");

        setState((prev) => ({ ...prev, status: "streaming" }));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let allCitations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const event = parseSSEEvent(line);
            if (!event) continue;

            switch (event.type) {
              case "content":
                fullContent += event.content ?? "";
                setState((prev) => ({
                  ...prev,
                  content: fullContent,
                  status: "streaming",
                }));
                options.onContent?.(event.content ?? "", fullContent);
                break;

              case "citation":
                if (event.citations) {
                  allCitations = [...allCitations, ...event.citations];
                  setState((prev) => ({
                    ...prev,
                    citations: allCitations,
                  }));
                  options.onCitations?.(allCitations);
                }
                break;

              case "error":
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: event.error ?? "Unknown error",
                }));
                options.onError?.(event.error ?? "Unknown error");
                return;

              case "done":
                const metadata: StreamMetadata = event.metadata ?? {};
                // Merge final citations from done event
                if (event.citations?.length) {
                  allCitations = event.citations;
                }
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  content: fullContent,
                  citations: allCitations,
                  metadata,
                }));
                options.onComplete?.(fullContent, metadata);
                retryCountRef.current = 0;
                return;

              case "status":
                setState((prev) => ({
                  ...prev,
                  status: event.status ?? prev.status,
                }));
                break;
            }
          }
        }

        // Stream ended without done event
        setState((prev) => ({
          ...prev,
          status: "complete",
          content: fullContent,
          citations: allCitations,
        }));
        options.onComplete?.(fullContent, {});
        retryCountRef.current = 0;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setState((prev) => ({
            ...prev,
            status: "cancelled",
          }));
          return;
        }

        const msg = error instanceof Error ? error.message : "Stream failed";

        // Auto-retry on transient errors
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.warn(`Stream failed, retrying (${retryCountRef.current}/${MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, 1000 * retryCountRef.current));
          return startStream(conversationId, message, model);
        }

        setState((prev) => ({
          ...prev,
          status: "error",
          error: msg,
        }));
        options.onError?.(msg);
        retryCountRef.current = 0;
      }
    },
    [options],
  );

  /**
   * Cancel the current stream.
   */
  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((prev) => ({
      ...prev,
      status: "cancelled",
      abortController: null,
    }));
  }, []);

  /**
   * Reset to idle state.
   */
  const resetStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(createInitialStreamState());
    retryCountRef.current = 0;
  }, []);

  return {
    ...state,
    isStreaming: state.status === "streaming" || state.status === "connecting",
    isComplete: state.status === "complete",
    isCancelled: state.status === "cancelled",
    hasError: state.status === "error",
    startStream,
    cancelStream,
    resetStream,
  };
}
