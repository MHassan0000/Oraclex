import "server-only";

import { DEFAULT_MODEL, getModelConfig, getModelFallbacks } from "@/lib/ai/models";
import { serverEnv } from "@/lib/env/server";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamChunk = {
  content: string;
  done: boolean;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type CompletionOptions = {
  model?: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
};

export type CompletionResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

function getApiKey(): string {
  return serverEnv.OPENROUTER_API_KEY;
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Oraclex RAG Platform",
  };
}

/**
 * Non-streaming completion. Returns the full response at once.
 */
export async function createCompletion(
  options: CompletionOptions,
): Promise<CompletionResult> {
  const modelId = options.model ?? DEFAULT_MODEL;
  const startTime = Date.now();

  const messages: ChatCompletionMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push(...options.messages);

  async function attempt(model: string): Promise<CompletionResult> {
    const config = getModelConfig(model);
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? config.maxOutput,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No completion returned from OpenRouter");

    return {
      content: choice.message?.content ?? "",
      model: data.model ?? model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - startTime,
    };
  }

  let lastError: unknown;
  for (const model of getModelFallbacks(modelId)) {
    try {
      return await attempt(model);
    } catch (error) {
      lastError = error;
      console.warn(`OpenRouter model ${model} failed; trying next fallback.`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter completion failed for all configured models");
}

/**
 * Streaming completion. Returns a ReadableStream of SSE chunks.
 */
export async function createStreamingCompletion(
  options: CompletionOptions,
): Promise<ReadableStream<Uint8Array>> {
  const modelId = options.model ?? DEFAULT_MODEL;

  const messages: ChatCompletionMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push(...options.messages);

  let response: Response | null = null;
  let activeModel = modelId;
  let lastError: Error | null = null;

  for (const model of getModelFallbacks(modelId)) {
    const config = getModelConfig(model);
    const attempt = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? config.maxOutput,
        stream: true,
      }),
    });

    if (attempt.ok) {
      response = attempt;
      activeModel = model;
      break;
    }

    const errorBody = await attempt.text();
    lastError = new Error(`OpenRouter API error (${attempt.status}) for ${model}: ${errorBody}`);
    console.warn(`OpenRouter model ${model} failed; trying next fallback.`, lastError);
  }

  if (!response) {
    throw lastError ?? new Error("OpenRouter streaming failed for all configured models");
  }

  if (!response.body) {
    throw new Error("No response body for streaming completion");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
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
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`));
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content ?? "";
              if (content) {
                const chunk: StreamChunk = {
                  content,
                  done: false,
                  model: parsed.model ?? activeModel,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost in USD for a completion.
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const config = getModelConfig(modelId);
  return (
    (inputTokens / 1000) * config.inputCostPer1k +
    (outputTokens / 1000) * config.outputCostPer1k
  );
}
