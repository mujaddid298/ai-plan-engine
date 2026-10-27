import { NextRequest } from "next/server";
import { handleChatStream } from "@/services/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, model } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ error: "Pesan tidak boleh kosong" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { conversationId: activeConvId, model: activeModel, chunkStream, onFinish } = await handleChatStream({
      channel: "web",
      conversationId: conversationId || undefined,
      content: content.trim(),
      model: model ? String(model).trim() : undefined,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chunkStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          await onFinish();
          controller.close();
        } catch (err: any) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Conversation-Id": activeConvId,
        "X-Model-Used": encodeURIComponent(activeModel || ""),
      },
    });
  } catch (error: any) {
    console.error("API /api/chat error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Gagal memproses pesan chat",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
