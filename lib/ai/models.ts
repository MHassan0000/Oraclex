/**
 * OpenRouter model configuration.
 * Each entry defines a model available through the OpenRouter API.
 */

export type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "meta" | "free";

export type ModelConfig = {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  supportsStreaming: boolean;
  isFree?: boolean;
};

export const MODELS: Record<string, ModelConfig> = {
  // OpenAI
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128_000,
    maxOutput: 16_384,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    supportsStreaming: true,
  },
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128_000,
    maxOutput: 16_384,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    supportsStreaming: true,
  },
  // Anthropic
  "anthropic/claude-sonnet-4": {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutput: 8_192,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    supportsStreaming: true,
  },
  "anthropic/claude-3.5-haiku": {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutput: 8_192,
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.004,
    supportsStreaming: true,
  },
  // Google
  "google/gemini-2.5-flash": {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    supportsStreaming: true,
  },
  // DeepSeek
  "deepseek/deepseek-chat-v3": {
    id: "deepseek/deepseek-chat-v3",
    name: "DeepSeek V3",
    provider: "deepseek",
    contextWindow: 128_000,
    maxOutput: 8_192,
    inputCostPer1k: 0.00014,
    outputCostPer1k: 0.00028,
    supportsStreaming: true,
  },
  // Free (for testing)
  "meta-llama/llama-3.1-8b-instruct:free": {
    id: "meta-llama/llama-3.1-8b-instruct:free",
    name: "Llama 3.1 8B (Free)",
    provider: "free",
    contextWindow: 131_072,
    maxOutput: 4_096,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "qwen/qwen-2.5-7b-instruct:free": {
    id: "qwen/qwen-2.5-7b-instruct:free",
    name: "Qwen 2.5 7B (Free)",
    provider: "free",
    contextWindow: 32_768,
    maxOutput: 4_096,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
} as const;

export const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";
export const FALLBACK_MODEL = "qwen/qwen-2.5-7b-instruct:free";

export const MODEL_LIST = Object.values(MODELS);
export const MODEL_IDS = Object.keys(MODELS);

export function getModelConfig(modelId: string): ModelConfig {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}

export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return MODEL_LIST.filter((m) => m.provider === provider);
}
