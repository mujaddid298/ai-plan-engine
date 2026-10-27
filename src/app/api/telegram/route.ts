import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram/bot";
import { db, processedUpdates } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Secret Token
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");

    if (expectedSecret && receivedSecret !== expectedSecret) {
      console.warn("Invalid Telegram webhook secret token attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse Telegram Update
    const update = await req.json();

    if (!update || typeof update.update_id !== "number") {
      return new Response("Bad Request", { status: 400 });
    }

    // 3. Deduplication Check (cegah proses berulang saat Telegram retry)
    const existing = await db.query.processedUpdates.findFirst({
      where: eq(processedUpdates.updateId, update.update_id),
    });

    if (existing) {
      // Already processed, acknowledge immediately
      return new Response("Already Processed", { status: 200 });
    }

    // Record this update ID
    await db.insert(processedUpdates).values({
      updateId: update.update_id,
    });

    // 4. Handle Telegram update via grammY
    await bot.handleUpdate(update);

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    // Return 200 so Telegram doesn't retry infinitely on internal error
    return new Response("OK", { status: 200 });
  }
}
