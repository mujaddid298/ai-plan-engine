import { NextResponse } from "next/server";
import { z } from "zod";
import { testModel, UpstreamError } from "@/lib/ai/models";
import { getProviderConfig } from "@/lib/db/provider";

const BodySchema = z.object({
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1, "Model ID wajib diisi untuk tes koneksi."),
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

    const result = await testModel(baseUrl, apiKey, input.model);
    return NextResponse.json({
      ok: true,
      ...result,
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

    console.error("Error in /api/models/test:", e);
    return NextResponse.json(
      { ok: false, code: "UPSTREAM", message: e.message || "Gagal tes koneksi model." },
      { status: 500 }
    );
  }
}
