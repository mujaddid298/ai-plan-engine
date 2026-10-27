import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchModels, UpstreamError } from "@/lib/ai/models";
import { getProviderConfig, saveModelCache, getModelCache } from "@/lib/db/provider";

const BodySchema = z.object({
  baseUrl: z.string().min(1).optional(),
  apiKey: z.string().optional(), // empty = use saved key
  forceRefresh: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const input = BodySchema.parse(rawBody);

    const saved = await getProviderConfig();
    const baseUrl = input.baseUrl ?? saved?.baseUrl;
    const apiKey = input.apiKey || saved?.apiKey;

    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, code: "NETWORK", message: "Base URL belum diisi." },
        { status: 400 }
      );
    }

    // Check cached models first if not forceRefresh
    if (!input.forceRefresh) {
      const cached = await getModelCache(baseUrl);
      if (cached && cached.models.length > 0) {
        return NextResponse.json({
          ok: true,
          count: cached.models.length,
          models: cached.models,
          fetchedAt: cached.fetchedAt.getTime(),
          fromCache: true,
        });
      }
    }

    const models = await fetchModels(baseUrl, apiKey);
    await saveModelCache(baseUrl, models);

    return NextResponse.json({
      ok: true,
      count: models.length,
      models,
      fetchedAt: Date.now(),
      fromCache: false,
    });
  } catch (e: any) {
    if (e instanceof UpstreamError) {
      return NextResponse.json({
        ok: false,
        code: e.code,
        message: e.message,
      });
    }

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION", message: e.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    console.error("Error in /api/models:", e);
    return NextResponse.json(
      { ok: false, code: "UPSTREAM", message: e.message || "Gagal memuat model." },
      { status: 500 }
    );
  }
}
