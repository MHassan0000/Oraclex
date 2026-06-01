import "server-only";

import type { Citation, StreamMetadata } from "@/lib/streaming/types";

/**
 * Creates an SSE-formatted ReadableStream that wraps an OpenRouter streaming response.
 * Handles parsing, citation injection, and metadata finalization.
 */
export function createSSEStream(options: {
  upstreamStream: ReadableStream<Uint8Array>;
  citations?: Citation[];
  messageId?: string;
  model?: string;
  onComplete?: (fullContent: string, metadata: StreamMetadata) => Promise<void>;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let fullContent = "";
  const startTime = Date.now();

  return new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ status: "streaming" })}\n\n`),
      );

      // Send citations upfront if available
      if (options.citations?.length) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ citations: options.citations })}\n\n`),
        );
      }

      const reader = options.upstreamStream.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? "";
              if (content) {
                fullContent += content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                );
              }
            } catch {
              // Skip malformed
            }
          }
        }

        // Build final metadata
        const metadata: StreamMetadata = {
          messageId: options.messageId,
          model: options.model,
          latencyMs: Date.now() - startTime,
        };

        // Callback for DB persistence
        if (options.onComplete) {
          try {
            await options.onComplete(fullContent, metadata);
          } catch (err) {
            console.error("Stream onComplete error:", err);
          }
        }

        // Final done event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              messageId: options.messageId,
              model: options.model,
              latencyMs: metadata.latencyMs,
              citations: options.citations?.map((c) => ({
                id: c.id,
                documentId: c.documentId,
                chunkId: c.chunkId,
                documentTitle: c.documentTitle,
                similarity: c.similarity,
                chunkIndex: c.chunkIndex,
                content: c.content,
              })),
            })}\n\n`,
          ),
        );

        controller.close();
      } catch (error) {
        // Send error event
        const msg = error instanceof Error ? error.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Creates a standard SSE Response from a ReadableStream.
 */
export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
