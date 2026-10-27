import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Percakapan tidak ditemukan" },
        { status: 404 }
      );
    }

    const convMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: asc(messages.createdAt),
    });

    return NextResponse.json({
      conversation: conv,
      messages: convMessages,
    });
  } catch (error: any) {
    console.error("GET /api/conversations/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await db.delete(conversations).where(eq(conversations.id, id));

    return NextResponse.json({ success: true, message: "Percakapan berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE /api/conversations/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    if (body.model !== undefined) {
      await db
        .update(conversations)
        .set({
          model: body.model ? String(body.model).trim() : null,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, id));
    }

    return NextResponse.json({ success: true, updatedId: id });
  } catch (error: any) {
    console.error("PATCH /api/conversations/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

