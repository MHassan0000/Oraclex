import "server-only";

import {
  DEFAULT_MODEL,
  MODEL_LIST,
  type ModelConfig,
  type ModelProvider,
  getModelConfig,
  getModelFallbacks,
} from "@/lib/ai/models";
import { serverEnv } from "@/lib/env/server";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_LIVE_FREE_MODELS = 30;

type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};

let modelCache: { expiresAt: number; models: ModelConfig[] } | null = null;

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

function parsePricePer1k(value?: string): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed * 1000 : 0;
}

function inferProvider(modelId: string): ModelProvider {
  const provider = modelId.split("/")[0] as ModelProvider | undefined;
  switch (provider) {
    case "openai":
    case "anthropic":
    case "google":
    case "deepseek":
    case "meta":
    case "mistral":
    case "qwen":
    case "z-ai":
    case "moonshot":
    case "openrouter":
    case "nvidia":
    case "liquid":
    case "poolside":
      return provider;
    default:
      return "free";
  }
}

function normalizeModelName(model: OpenRouterModel): string {
  const name = model.name?.replace(/\s*\(free\)\s*$/i, "").trim();
  if (name) return `${name} (Free)`;
  return `${model.id.replace(":free", "")} (Free)`;
}

function toModelConfig(model: OpenRouterModel): ModelConfig {
  const isFree = model.id.endsWith(":free");
  return {
    id: model.id,
    name: isFree ? normalizeModelName(model) : model.name ?? model.id,
    provider: inferProvider(model.id),
    contextWindow: model.context_length ?? 128_000,
    maxOutput: 8_192,
    inputCostPer1k: isFree ? 0 : parsePricePer1k(model.pricing?.prompt),
    outputCostPer1k: isFree ? 0 : parsePricePer1k(model.pricing?.completion),
    supportsStreaming: true,
    isFree,
  };
}

function mergeModels(primary: ModelConfig[], secondary: ModelConfig[]): ModelConfig[] {
  const seen = new Set<string>();
  const merged: ModelConfig[] = [];

  for (const model of [...primary, ...secondary]) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    merged.push(model);
  }

  return merged;
}

async function readOpenRouterError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string;
        code?: number | string;
        metadata?: { retry_after_seconds?: number };
      };
    };
    const retryAfter = parsed.error?.metadata?.retry_after_seconds;
    return [
      parsed.error?.message ?? body,
      parsed.error?.code ? `code=${parsed.error.code}` : null,
      retryAfter ? `retry_after_seconds=${retryAfter}` : null,
    ]
      .filter(Boolean)
      .join("; ");
  } catch {
    return body;
  }
}

export async function getAvailableOpenRouterModels(): Promise<ModelConfig[]> {
  if (modelCache && modelCache.expiresAt > Date.now()) {
    return modelCache.models;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter models error (${response.status}): ${await readOpenRouterError(response)}`,
    );
  }

  const payload = (await response.json()) as { data?: OpenRouterModel[] };
  const liveFreeModels = (payload.data ?? [])
    .filter((model) => model.id.endsWith(":free"))
    .slice(0, MAX_LIVE_FREE_MODELS)
    .map(toModelConfig);

  const staticPaidModels = MODEL_LIST.filter((model) => !model.isFree);
  const models = mergeModels(staticPaidModels, liveFreeModels.length ? liveFreeModels : MODEL_LIST);

  modelCache = {
    expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
    models,
  };

  return models;
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
      throw new Error(
        `OpenRouter API error (${response.status}): ${await readOpenRouterError(response)}`,
      );
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
    try {
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

      lastError = new Error(
        `OpenRouter API error (${attempt.status}) for ${model}: ${await readOpenRouterError(attempt)}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "", done: true, model: activeModel })}\n\n`));
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
