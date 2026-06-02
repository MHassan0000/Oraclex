/**
 * OpenRouter model configuration.
 * Each entry defines a model available through the OpenRouter API.
 */

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "meta"
  | "mistral"
  | "qwen"
  | "z-ai"
  | "moonshot"
  | "openrouter"
  | "nvidia"
  | "liquid"
  | "poolside"
  | "free";

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
  // Free OpenRouter models. The API route also loads the live catalog at runtime.
  "openai/gpt-oss-20b:free": {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B (Free)",
    provider: "openai",
    contextWindow: 131_072,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "moonshotai/kimi-k2.6:free": {
    id: "moonshotai/kimi-k2.6:free",
    name: "Kimi K2.6 (Free)",
    provider: "moonshot",
    contextWindow: 262_144,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "google/gemma-4-26b-a4b-it:free": {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B A4B IT (Free)",
    provider: "google",
    contextWindow: 262_144,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct (Free)",
    provider: "meta",
    contextWindow: 131_072,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B A3B (Free)",
    provider: "nvidia",
    contextWindow: 256_000,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "qwen/qwen3-coder:free": {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder (Free)",
    provider: "qwen",
    contextWindow: 262_144,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
  "z-ai/glm-4.5-air:free": {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air (Free)",
    provider: "z-ai",
    contextWindow: 131_072,
    maxOutput: 8_192,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    supportsStreaming: true,
    isFree: true,
  },
} as const;

export const DEFAULT_MODEL = "openai/gpt-oss-20b:free";
export const FALLBACK_MODEL = "z-ai/glm-4.5-air:free";

export const MODEL_LIST = Object.values(MODELS);
export const MODEL_IDS = Object.keys(MODELS);

export function getModelConfig(modelId: string): ModelConfig {
  return MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
}

export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return MODEL_LIST.filter((m) => m.provider === provider);
}

export function getFreeModelIds(): string[] {
  return MODEL_LIST.filter((model) => model.isFree).map((model) => model.id);
}

const FREE_OPENROUTER_MODEL_ID_PATTERN =
  /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*:free$/i;

export function isAllowedModelId(modelId: string): boolean {
  return MODEL_IDS.includes(modelId) || FREE_OPENROUTER_MODEL_ID_PATTERN.test(modelId);
}

export function getModelFallbacks(modelId?: string): string[] {
  const ordered = [modelId ?? DEFAULT_MODEL, DEFAULT_MODEL, FALLBACK_MODEL, ...getFreeModelIds()];
  return [...new Set(ordered.filter(Boolean))];
}
