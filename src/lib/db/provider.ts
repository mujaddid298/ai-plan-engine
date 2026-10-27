import { db } from "@/lib/db";
import { providerConfigs, modelCache, favoriteModels, ModelCache, ProviderConfig } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptApiKey, encryptApiKey, maskApiKey } from "@/lib/crypto";
import { ModelInfo } from "@/lib/ai/models";

export interface SafeProviderConfig {
  preset: string;
  baseUrl: string;
  hasKey: boolean;
  maskedKey: string;
  model: string | null;
  updatedAt: Date;
}

/**
 * Get active provider configuration with decrypted key for internal server use
 */
export async function getProviderConfig(): Promise<{
  preset: string;
  baseUrl: string;
  apiKey: string;
  model: string;
} | null> {
  try {
    const config = await db.query.providerConfigs.findFirst({
      where: eq(providerConfigs.id, "default"),
    });

    if (config) {
      return {
        preset: config.preset,
        baseUrl: config.baseUrl,
        apiKey: decryptApiKey(config.apiKey),
        model: config.model || process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
      };
    }
  } catch (error) {
    console.warn("Error reading provider config from DB, falling back to env:", error);
  }

  // Fallback to environment variables
  return {
    preset: (process.env.AI_PROVIDER as any) || "9router",
    baseUrl: process.env.AI_BASE_URL || "https://api.9router.com/v1",
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
  };
}

/**
 * Get safe provider config for sending to browser (never includes raw apiKey)
 */
export async function getSafeProviderConfig(): Promise<SafeProviderConfig> {
  const config = await db.query.providerConfigs.findFirst({
    where: eq(providerConfigs.id, "default"),
  });

  if (config) {
    const rawKey = decryptApiKey(config.apiKey);
    return {
      preset: config.preset,
      baseUrl: config.baseUrl,
      hasKey: !!rawKey && rawKey.length > 0,
      maskedKey: maskApiKey(rawKey),
      model: config.model,
      updatedAt: config.updatedAt,
    };
  }

  const envKey = process.env.AI_API_KEY || "";
  return {
    preset: process.env.AI_PROVIDER || "9router",
    baseUrl: process.env.AI_BASE_URL || "https://api.9router.com/v1",
    hasKey: !!envKey && envKey.length > 0,
    maskedKey: maskApiKey(envKey),
    model: process.env.AI_MODEL || null,
    updatedAt: new Date(),
  };
}

/**
 * Save provider configuration, encrypting apiKey
 */
export async function saveProviderConfig(params: {
  preset: string;
  baseUrl: string;
  apiKey?: string; // If omitted or empty, retains existing key
  model?: string;
}): Promise<SafeProviderConfig> {
  const existing = await db.query.providerConfigs.findFirst({
    where: eq(providerConfigs.id, "default"),
  });

  let encryptedKey = existing?.apiKey || "";

  // If a new key is provided, encrypt it
  if (params.apiKey && params.apiKey.trim().length > 0) {
    encryptedKey = encryptApiKey(params.apiKey.trim());
  }

  if (existing) {
    await db
      .update(providerConfigs)
      .set({
        preset: params.preset,
        baseUrl: params.baseUrl,
        apiKey: encryptedKey,
        model: params.model ?? existing.model,
        updatedAt: new Date(),
      })
      .where(eq(providerConfigs.id, "default"));
  } else {
    await db.insert(providerConfigs).values({
      id: "default",
      preset: params.preset,
      baseUrl: params.baseUrl,
      apiKey: encryptedKey,
      model: params.model || null,
    });
  }

  return getSafeProviderConfig();
}

/**
 * Save fetched models in local database cache
 */
export async function saveModelCache(baseUrl: string, models: ModelInfo[]): Promise<void> {
  const modelsJson = JSON.stringify(models);
  const existing = await db.query.modelCache.findFirst({
    where: eq(modelCache.baseUrl, baseUrl),
  });

  if (existing) {
    await db
      .update(modelCache)
      .set({
        modelsJson,
        fetchedAt: new Date(),
      })
      .where(eq(modelCache.baseUrl, baseUrl));
  } else {
    await db.insert(modelCache).values({
      baseUrl,
      modelsJson,
    });
  }
}

/**
 * Get cached models for a gateway
 */
export async function getModelCache(baseUrl: string): Promise<{
  models: ModelInfo[];
  fetchedAt: Date;
} | null> {
  const cached = await db.query.modelCache.findFirst({
    where: eq(modelCache.baseUrl, baseUrl),
  });

  if (!cached) return null;

  try {
    const models: ModelInfo[] = JSON.parse(cached.modelsJson);
    return {
      models,
      fetchedAt: cached.fetchedAt,
    };
  } catch {
    return null;
  }
}
