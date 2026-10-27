import { NextRequest, NextResponse } from "next/server";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getProviderConfig, getSafeProviderConfig, saveProviderConfig } from "@/lib/db/provider";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await db.query.settings.findMany();
    const safeProvider = await getSafeProviderConfig();

    const config: Record<string, any> = {
      model: safeProvider.model || process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
      maxTokens: "4096",
      systemPrompt: "You are a helpful, expert AI programming assistant.",
      dailyBudgetUsd: process.env.DAILY_BUDGET_USD || "5.0",
      provider: safeProvider.preset,
      baseUrl: safeProvider.baseUrl,
      hasKey: safeProvider.hasKey,
      maskedKey: safeProvider.maskedKey,
    };

    all.forEach((item) => {
      if (item.key === "apiKey") {
        // Do NOT expose raw key!
        const decrypted = decryptApiKey(item.value);
        config.hasKey = !!decrypted && decrypted.length > 0;
        config.maskedKey = maskApiKey(decrypted);
      } else {
        config[item.key] = item.value;
      }
    });

    return NextResponse.json({ settings: config, ...config });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Save provider config with encryption (preserving existing settings for partial updates)
    const existingProvider = await getProviderConfig();
    await saveProviderConfig({
      preset: body.provider || existingProvider?.preset || "9router",
      baseUrl: body.baseUrl || existingProvider?.baseUrl || "https://api.9router.com/v1",
      apiKey: body.apiKey, // If empty/omitted, saveProviderConfig keeps existing key
      model: body.model !== undefined ? body.model : existingProvider?.model,
    });

    // 2. Also keep settings table in sync for backward compatibility
    const allowedKeys = [
      "model",
      "maxTokens",
      "systemPrompt",
      "dailyBudgetUsd",
      "baseUrl",
      "provider",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const valStr = String(body[key]);
        const existing = await db.query.settings.findFirst({
          where: eq(settings.key, key),
        });

        if (existing) {
          await db.update(settings).set({ value: valStr }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ key, value: valStr });
        }
      }
    }

    // Encrypt apiKey if provided
    if (body.apiKey && String(body.apiKey).trim().length > 0) {
      const encryptedKey = encryptApiKey(String(body.apiKey).trim());
      const existing = await db.query.settings.findFirst({
        where: eq(settings.key, "apiKey"),
      });

      if (existing) {
        await db.update(settings).set({ value: encryptedKey }).where(eq(settings.key, "apiKey"));
      } else {
        await db.insert(settings).values({ key: "apiKey", value: encryptedKey });
      }
    }

    return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan" });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
