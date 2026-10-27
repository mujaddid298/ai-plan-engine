import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, baseUrl, apiKey, provider } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key tidak boleh kosong untuk pengujian." },
        { status: 400 }
      );
    }

    const client = getOpenAIClient({
      apiKey,
      baseUrl: baseUrl || undefined,
      provider: provider || "custom",
    });

    const response = await client.chat.completions.create({
      model: model || "anthropic/claude-3.5-sonnet",
      messages: [{ role: "user", content: "Ping! Jawab 'OK'." }],
      max_tokens: 10,
    });

    const reply = response.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: `Terhubung dengan sukses! Model membalas: "${reply.trim()}"`,
    });
  } catch (error: any) {
    console.error("Test API Connection error:", error);
    return NextResponse.json(
      {
        error: error.message || "Gagal menghubungi endpoint API.",
      },
      { status: 500 }
    );
  }
}
