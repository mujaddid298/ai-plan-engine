import OpenAI from "openai";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getProviderConfig } from "@/lib/db/provider";
import { decryptApiKey } from "@/lib/crypto";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

// Get dynamic settings from database or fallback to environment variables
export async function getModelConfig(): Promise<{
  provider: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  baseUrl?: string;
  apiKey?: string;
}> {
  let model = process.env.AI_MODEL || "anthropic/claude-3.5-sonnet";
  let maxTokens = 4096;
  let systemPrompt = "You are a helpful, expert AI programming assistant.";
  let baseUrl = process.env.AI_BASE_URL || "https://api.9router.com/v1";
  let apiKey = process.env.AI_API_KEY || "";
  let provider = process.env.AI_PROVIDER || "9router";

  try {
    // 1. Try reading from new provider_configs table
    const providerConfig = await getProviderConfig();
    if (providerConfig) {
      provider = providerConfig.preset;
      baseUrl = providerConfig.baseUrl;
      apiKey = providerConfig.apiKey;
      if (providerConfig.model) model = providerConfig.model;
    }

    // 2. Read other settings (systemPrompt, maxTokens) from settings table
    const allSettings = await db.query.settings.findMany();
    for (const s of allSettings) {
      if (s.key === "model" && s.value) model = s.value;
      if (s.key === "maxTokens" && s.value) maxTokens = parseInt(s.value, 10) || 4096;
      if (s.key === "systemPrompt" && s.value) systemPrompt = s.value;
      if (s.key === "baseUrl" && s.value) baseUrl = s.value;
      if (s.key === "apiKey" && s.value) apiKey = decryptApiKey(s.value);
      if (s.key === "provider" && s.value) provider = s.value;
    }
  } catch (error) {
    console.warn("Could not load dynamic settings, using defaults/env:", error);
  }

  return { provider, model, maxTokens, systemPrompt, baseUrl, apiKey };
}

export function getOpenAIClient(config?: { apiKey?: string; baseUrl?: string; provider?: string }): OpenAI {
  const apiKey = config?.apiKey || process.env.AI_API_KEY || "dummy-key-for-init";
  let baseURL = config?.baseUrl || process.env.AI_BASE_URL;

  if (!baseURL) {
    if (config?.provider === "openrouter") {
      baseURL = "https://openrouter.ai/api/v1";
    }
  }

  return new OpenAI({
    apiKey,
    baseURL: baseURL && baseURL.trim() ? baseURL.trim() : undefined,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Personal AI Assistant",
    },
  });
}

/**
 * Generate a complete reply for Telegram or non-streaming callers.
 */
export async function generateReply(
  messages: ChatMessage[],
  options?: ModelOptions
): Promise<ModelResult> {
  const config = await getModelConfig();
  const client = getOpenAIClient(config);

  const chosenModel = options?.model || config.model;
  const maxTokens = options?.maxTokens || config.maxTokens;
  const temperature = options?.temperature ?? 0.7;

  let response: any;
  try {
    response = await client.chat.completions.create({
      model: chosenModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    const msg = String(err?.message || "").toLowerCase();
    if (
      status === 404 ||
      msg.includes("model_not_found") ||
      msg.includes("does not exist") ||
      msg.includes("invalid model") ||
      msg.includes("model tidak ditemukan") ||
      (status === 400 && msg.includes("model"))
    ) {
      throw new Error(`MODEL_INVALID: Model '${chosenModel}' tidak tersedia di gateway.`);
    }
    throw err;
  }

  const choice = response.choices[0];
  const content = choice?.message?.content || "";
  const inputTokens =
    response.usage?.prompt_tokens ||
    Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  const outputTokens =
    response.usage?.completion_tokens || Math.ceil(content.length / 4);

  return {
    content,
    inputTokens,
    outputTokens,
    model: chosenModel,
  };
}

/**
 * Stream reply for Web client.
 */
export async function streamReply(
  messages: ChatMessage[],
  options?: ModelOptions
): Promise<{
  chunkStream: AsyncGenerator<string, void, unknown>;
  getResult: () => Promise<ModelResult>;
}> {
  const config = await getModelConfig();
  const client = getOpenAIClient(config);

  const chosenModel = options?.model || config.model;
  const maxTokens = options?.maxTokens || config.maxTokens;
  const temperature = options?.temperature ?? 0.7;

  let stream: any;
  try {
    stream = await client.chat.completions.create({
      model: chosenModel,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      stream_options: { include_usage: true },
    });
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    const msg = String(err?.message || "").toLowerCase();
    if (
      status === 404 ||
      msg.includes("model_not_found") ||
      msg.includes("does not exist") ||
      msg.includes("invalid model") ||
      msg.includes("model tidak ditemukan") ||
      (status === 400 && msg.includes("model"))
    ) {
      throw new Error(`MODEL_INVALID: Model '${chosenModel}' tidak tersedia di gateway.`);
    }
    throw err;
  }

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let resolveResult: (value: ModelResult) => void;
  const resultPromise = new Promise<ModelResult>((resolve) => {
    resolveResult = resolve;
  });

  const generator = async function* (): AsyncGenerator<string, void, unknown> {
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullContent += delta;
          yield delta;
        }

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }
    } finally {
      if (!inputTokens) {
        inputTokens = Math.ceil(
          messages.reduce((acc, m) => acc + m.content.length, 0) / 4
        );
      }
      if (!outputTokens) {
        outputTokens = Math.ceil(fullContent.length / 4);
      }

      resolveResult({
        content: fullContent,
        inputTokens,
        outputTokens,
        model: chosenModel,
      });
    }
  };

  return {
    chunkStream: generator(),
    getResult: () => resultPromise,
  };
}
