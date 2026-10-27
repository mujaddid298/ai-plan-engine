import { NextResponse } from "next/server";
import { db, dailyUsage } from "@/lib/db";
import { desc } from "drizzle-orm";
import { checkDailyBudget } from "@/lib/budget";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(dailyUsage)
      .orderBy(desc(dailyUsage.date))
      .limit(30);

    const budgetStatus = await checkDailyBudget();

    const formatted = list.map((item) => {
      const totalTokens = item.inputTokens + item.outputTokens;
      const costUsd = (totalTokens / 1_000_000) * 3.0; // ~$3/M tokens
      return {
        ...item,
        totalTokens,
        costUsd,
      };
    });

    return NextResponse.json({
      history: formatted,
      today: budgetStatus,
    });
  } catch (error: any) {
    console.error("GET /api/usage error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
