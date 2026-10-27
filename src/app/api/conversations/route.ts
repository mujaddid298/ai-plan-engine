import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages } from "@/lib/db";
import { desc, eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        channel: conversations.channel,
        isActive: conversations.isActive,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({ conversations: list });
  } catch (error: any) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || "Percakapan Baru";

    const [newConv] = await db
      .insert(conversations)
      .values({
        channel: "web",
        title,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ conversation: newConv }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
